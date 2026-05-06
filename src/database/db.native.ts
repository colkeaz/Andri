/**
 * Native (iOS / Android): SQLite via expo-sqlite.
 * expo-sqlite is loaded only through dynamic import so this module is the only
 * place that references the package on native builds.
 */
import { SQL_INIT } from "./schema";

const DB_NAME = "smart_inventory.db";

type ExpoSQLite = typeof import("expo-sqlite");
let sqliteModule: ExpoSQLite | null = null;

async function loadSQLite(): Promise<ExpoSQLite> {
  if (!sqliteModule) {
    sqliteModule = await import("expo-sqlite");
  }
  return sqliteModule;
}

export const getDB = async () => {
  const SQLite = await loadSQLite();
  return SQLite.openDatabaseAsync(DB_NAME);
};

export const initDatabase = async () => {
  try {
    const db = await getDB();
    await db.execAsync(SQL_INIT);
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization failed", error);
  }
};

export const dbService = {
  getProducts: async () => {
    try {
      const db = await getDB();
      return await db.getAllAsync("SELECT * FROM products");
    } catch {
      return [];
    }
  },

  addProduct: async (id: string, name: string, barcode?: string) => {
    try {
      const db = await getDB();
      await db.runAsync(
        "INSERT INTO products (id, name, barcode) VALUES (?, ?, ?)",
        [id, name, barcode ?? null],
      );
    } catch (error) {
      console.error("addProduct failed", error);
    }
  },

  addBatch: async (
    id: string,
    productId: string,
    qty: number,
    cost: number,
    sell: number,
  ) => {
    try {
      const db = await getDB();
      await db.runAsync(
        "INSERT INTO inventory (id, product_id, quantity, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
        [id, productId, qty, cost, sell],
      );
    } catch (error) {
      console.error("addBatch failed", error);
    }
  },

  getAlerts: async () => {
    try {
      const db = await getDB();
      return await db.getAllAsync(
        "SELECT * FROM alerts WHERE status = 'PENDING'",
      );
    } catch {
      return [];
    }
  },

  getInventorySummary: async () => {
    try {
      const db = await getDB();
      return await db.getAllAsync(
        `SELECT 
          p.id,
          p.name,
          p.barcode,
          p.min_stock_level,
          COALESCE(SUM(i.quantity), 0) AS total_stock,
          COALESCE(MAX(i.selling_price), 0) AS selling_price
        FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        GROUP BY p.id`,
      );
    } catch {
      return [];
    }
  },

  executeSaleTransaction: async (
    cartItems: { productId: string; quantity: number; unitPrice: number }[],
  ) => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart is empty.");
    }

    const db = await getDB();
    await db.execAsync("BEGIN TRANSACTION");

    try {
      for (const item of cartItems) {
        const requiredQty = Math.max(0, Math.floor(item.quantity));
        if (!item.productId || requiredQty <= 0) {
          throw new Error("Invalid cart item.");
        }

        const stockRow = await db.getFirstAsync<{ total_stock: number }>(
          "SELECT COALESCE(SUM(quantity), 0) AS total_stock FROM inventory WHERE product_id = ?",
          [item.productId],
        );

        const availableQty = Number(stockRow?.total_stock ?? 0);
        if (availableQty < requiredQty) {
          throw new Error(`Insufficient stock for product ${item.productId}.`);
        }

        const batches = await db.getAllAsync<{ id: string; quantity: number }>(
          `SELECT id, quantity FROM inventory 
           WHERE product_id = ? AND quantity > 0
           ORDER BY date_added ASC`,
          [item.productId],
        );

        let remaining = requiredQty;
        for (const batch of batches) {
          if (remaining <= 0) break;

          const batchQty = Number(batch.quantity ?? 0);
          const deduct = Math.min(batchQty, remaining);
          await db.runAsync(
            "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
            [deduct, batch.id],
          );
          remaining -= deduct;
        }

        if (remaining > 0) {
          throw new Error(
            `Failed to allocate stock for product ${item.productId}.`,
          );
        }

        await db.runAsync(
          "INSERT INTO sales (id, product_id, quantity, total_price, timestamp) VALUES (?, ?, ?, ?, ?)",
          [
            `S-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            item.productId,
            requiredQty,
            requiredQty * Number(item.unitPrice),
            new Date().toISOString(),
          ],
        );
      }

      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  },

  processReceiptTransaction: async (
    items: { name: string; quantity: number; price: number }[],
    type: "PURCHASE" | "SALE",
  ) => {
    const db = await getDB();
    await db.execAsync("BEGIN TRANSACTION");
    try {
      for (const item of items) {
        const product = await db.getFirstAsync<{ id: string }>(
          "SELECT id FROM products WHERE UPPER(name) = UPPER(?)",
          [item.name],
        );

        let productId = product?.id;
        if (!productId) {
          productId = `P-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          await db.runAsync(
            "INSERT INTO products (id, name, min_stock_level) VALUES (?, ?, ?)",
            [productId, item.name, 5],
          );
        }

        if (type === "PURCHASE") {
          const batchId = `B-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const sellingPrice = Number((item.price * 1.15).toFixed(2));
          await db.runAsync(
            "INSERT INTO inventory (id, product_id, quantity, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)",
            [batchId, productId, item.quantity, item.price, sellingPrice],
          );
        } else {
          const batches = await db.getAllAsync<{ id: string; quantity: number }>(
            "SELECT id, quantity FROM inventory WHERE product_id = ? AND quantity > 0 ORDER BY date_added ASC",
            [productId],
          );
          
          let remaining = item.quantity;
          for (const batch of batches) {
            if (remaining <= 0) break;
            const batchQty = Number(batch.quantity);
            const deduct = Math.min(batchQty, remaining);
            await db.runAsync(
              "UPDATE inventory SET quantity = quantity - ? WHERE id = ?",
              [deduct, batch.id],
            );
            remaining -= deduct;
          }

          await db.runAsync(
            "INSERT INTO sales (id, product_id, quantity, total_price, timestamp) VALUES (?, ?, ?, ?, ?)",
            [
              `S-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId,
              item.quantity,
              item.quantity * item.price,
              new Date().toISOString(),
            ],
          );
        }
      }
      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  },

  resetDemoData: async () => {
    const db = await getDB();
    await db.execAsync("BEGIN TRANSACTION");
    try {
      await db.execAsync(
        "DELETE FROM sales; DELETE FROM alerts; DELETE FROM inventory; DELETE FROM products;",
      );

      const demoProducts = [
        {
          id: "P-DEMO-1",
          name: "Coke 1.5L",
          barcode: "4800016642158",
          qty: 16,
          cost: 54,
          sell: 65,
        },
        {
          id: "P-DEMO-2",
          name: "Lucky Me Beef",
          barcode: "4807770270001",
          qty: 42,
          cost: 14,
          sell: 18.5,
        },
        {
          id: "P-DEMO-3",
          name: "Bear Brand 320g",
          barcode: "4800361361131",
          qty: 8,
          cost: 88,
          sell: 102,
        },
        {
          id: "P-DEMO-4",
          name: "Bottled Water 500ml",
          barcode: "4800014321116",
          qty: 60,
          cost: 17,
          sell: 25,
        },
      ];

      for (const product of demoProducts) {
        await db.runAsync(
          "INSERT INTO products (id, name, barcode, category, min_stock_level) VALUES (?, ?, ?, ?, ?)",
          [product.id, product.name, product.barcode, "Demo", 5],
        );
        await db.runAsync(
          "INSERT INTO inventory (id, product_id, quantity, cost_price, selling_price, supplier_name) VALUES (?, ?, ?, ?, ?, ?)",
          [
            `B-${product.id}`,
            product.id,
            product.qty,
            product.cost,
            product.sell,
            "Demo Supplier",
          ],
        );
      }

      await db.execAsync("COMMIT");
    } catch (error) {
      await db.execAsync("ROLLBACK");
      throw error;
    }
  },
};
