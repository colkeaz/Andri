/**
 * Web: localStorage-backed store. Never imports expo-sqlite (avoids WASM bundling).
 * Row shapes match SQLite column names (snake_case) for API parity with native.
 */

const STORAGE_KEY = "smart_inventory_web_v1";

type ProductRow = {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  min_stock_level: number;
};

type InventoryRow = {
  id: string;
  product_id: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  supplier_name: string | null;
  date_added: string;
};

type SaleRow = {
  id: string;
  product_id: string;
  quantity: number;
  total_price: number;
  timestamp: string;
};

type AlertRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  product_id: string;
  metadata: string | null;
  status: string;
};

type WebStore = {
  products: ProductRow[];
  inventory: InventoryRow[];
  alerts: AlertRow[];
  sales: SaleRow[];
};

function emptyStore(): WebStore {
  return { products: [], inventory: [], alerts: [], sales: [] };
}

function canUseStorage(): boolean {
  return (
    typeof globalThis !== "undefined" &&
    typeof (globalThis as unknown as { localStorage?: Storage })
      .localStorage !== "undefined"
  );
}

function readStore(): WebStore {
  if (!canUseStorage()) {
    return emptyStore();
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyStore();
    }
    const parsed = JSON.parse(raw) as Partial<WebStore>;
    return {
      products: Array.isArray(parsed.products) ? parsed.products : [],
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      alerts: Array.isArray(parsed.alerts) ? parsed.alerts : [],
      sales: Array.isArray(parsed.sales) ? parsed.sales : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: WebStore): void {
  if (!canUseStorage()) {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode, quota, etc.
  }
}

/** Web has no SQLite handle; callers should use dbService only. */
export const getDB = async (): Promise<null> => {
  return null;
};

export const initDatabase = async (): Promise<void> => {
  try {
    readStore();
  } catch {
    // Safe no-op
  }
};

export const dbService = {
  getProducts: async (): Promise<ProductRow[]> => {
    try {
      const { products } = readStore();
      return [...products];
    } catch {
      return [];
    }
  },

  addProduct: async (
    id: string,
    name: string,
    barcode?: string,
  ): Promise<void> => {
    try {
      const store = readStore();
      const row: ProductRow = {
        id,
        name,
        barcode: barcode ?? null,
        category: null,
        min_stock_level: 5,
      };
      store.products = store.products.filter((p) => p.id !== id);
      store.products.push(row);
      writeStore(store);
    } catch (error) {
      console.error("addProduct (web) failed", error);
    }
  },

  addBatch: async (
    id: string,
    productId: string,
    qty: number,
    cost: number,
    sell: number,
  ): Promise<void> => {
    try {
      const store = readStore();
      const row: InventoryRow = {
        id,
        product_id: productId,
        quantity: qty,
        cost_price: cost,
        selling_price: sell,
        supplier_name: null,
        date_added: new Date().toISOString(),
      };
      store.inventory.push(row);
      writeStore(store);
    } catch (error) {
      console.error("addBatch (web) failed", error);
    }
  },

  getAlerts: async (): Promise<AlertRow[]> => {
    try {
      const { alerts } = readStore();
      return alerts.filter((a) => a.status === "PENDING");
    } catch {
      return [];
    }
  },

  getDeadStock: async (): Promise<{ id: string, name: string, total_qty: number, price: number, last_sale: string | null }[]> => {
    try {
      const { products, inventory, sales } = readStore();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deadStock = products.map(p => {
        const productInventory = inventory.filter(i => i.product_id === p.id);
        const totalQty = productInventory.reduce((sum, i) => sum + i.quantity, 0);
        if (totalQty <= 0) return null;

        const productSales = sales.filter(s => s.product_id === p.id);
        const lastSale = productSales.length > 0 
          ? productSales.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp 
          : null;

        const earliestAdded = productInventory.length > 0
          ? productInventory.sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime())[0].date_added
          : null;

        const price = productInventory.length > 0 ? productInventory[productInventory.length - 1].selling_price : 0;

        if (lastSale) {
          if (new Date(lastSale) < thirtyDaysAgo) return { id: p.id, name: p.name, total_qty: totalQty, price, last_sale: lastSale };
        } else if (earliestAdded && new Date(earliestAdded) < thirtyDaysAgo) {
          return { id: p.id, name: p.name, total_qty: totalQty, price, last_sale: null };
        }
        return null;
      }).filter((item): item is { id: string, name: string, total_qty: number, price: number, last_sale: string | null } => item !== null);

      return deadStock;
    } catch {
      return [];
    }
  },

  getInventorySummary: async (): Promise<
    {
      id: string;
      name: string;
      barcode: string | null;
      min_stock_level: number;
      total_stock: number;
      selling_price: number;
      cost_price: number;
    }[]
  > => {
    try {
      const { products, inventory } = readStore();
      return products.map((product) => {
        const batches = inventory.filter(
          (row) => row.product_id === product.id,
        );
        const totalStock = batches.reduce(
          (sum, row) => sum + Number(row.quantity || 0),
          0,
        );
        const lastBatch   = batches[batches.length - 1];
        const sellingPrice = lastBatch ? Number(lastBatch.selling_price || 0) : 0;
        const costPrice    = lastBatch ? Number(lastBatch.cost_price    || 0) : 0;

        return {
          id:              product.id,
          name:            product.name,
          barcode:         product.barcode,
          min_stock_level: product.min_stock_level,
          total_stock:     totalStock,
          selling_price:   sellingPrice,
          cost_price:      costPrice,
        };
      });
    } catch {
      return [];
    }
  },

  executeSaleTransaction: async (
    cartItems: { productId: string; quantity: number; unitPrice: number }[],
  ): Promise<void> => {
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      throw new Error("Cart is empty.");
    }

    const store = readStore();
    const nextStore: WebStore = {
      products: [...store.products],
      inventory: store.inventory.map((row) => ({ ...row })),
      alerts: [...store.alerts],
      sales: [...store.sales],
    };

    for (const item of cartItems) {
      const requiredQty = Math.max(0, Math.floor(item.quantity));
      if (!item.productId || requiredQty <= 0) {
        throw new Error("Invalid cart item.");
      }

      const productRows = nextStore.inventory
        .filter((row) => row.product_id === item.productId && row.quantity > 0)
        .sort(
          (a, b) =>
            new Date(a.date_added).getTime() - new Date(b.date_added).getTime(),
        );

      const available = productRows.reduce((sum, row) => sum + row.quantity, 0);
      if (available < requiredQty) {
        throw new Error(`Insufficient stock for product ${item.productId}.`);
      }

      let remaining = requiredQty;
      for (const row of productRows) {
        if (remaining <= 0) break;
        const deduct = Math.min(row.quantity, remaining);
        row.quantity -= deduct;
        remaining -= deduct;
      }

      nextStore.sales.push({
        id: `S-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        product_id: item.productId,
        quantity: requiredQty,
        total_price: requiredQty * Number(item.unitPrice),
        timestamp: new Date().toISOString(),
      });
    }

    writeStore(nextStore);
  },

  /** Update product name, barcode, and min stock level */
  updateProduct: async (
    productId: string,
    fields: { name?: string; barcode?: string | null; minStockLevel?: number },
  ): Promise<void> => {
    try {
      const store = readStore();
      store.products = store.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              name:            fields.name            ?? p.name,
              barcode:         fields.barcode         !== undefined ? fields.barcode : p.barcode,
              min_stock_level: fields.minStockLevel   ?? p.min_stock_level,
            }
          : p,
      );
      writeStore(store);
    } catch (error) {
      console.error("updateProduct (web) failed", error);
    }
  },

  /** Update selling price and cost price across ALL batches for a product */
  updateInventoryPrices: async (
    productId: string,
    fields: { sellingPrice?: number; costPrice?: number; quantity?: number },
  ): Promise<void> => {
    try {
      const store = readStore();
      const batches = store.inventory.filter((row) => row.product_id === productId);
      if (batches.length === 0) return;

      // Set quantity by adjusting the newest batch; distribute if needed
      if (fields.quantity !== undefined) {
        const target = Math.max(0, Math.floor(fields.quantity));
        // Collapse all batches into one canonical batch for simplicity
        const canonical = batches[batches.length - 1];
        // Zero out all old batches
        store.inventory = store.inventory.map((row) =>
          row.product_id === productId ? { ...row, quantity: 0 } : row,
        );
        // Set target on the last batch
        store.inventory = store.inventory.map((row) =>
          row.id === canonical.id ? { ...row, quantity: target } : row,
        );
      }

      if (fields.sellingPrice !== undefined || fields.costPrice !== undefined) {
        store.inventory = store.inventory.map((row) =>
          row.product_id === productId
            ? {
                ...row,
                selling_price: fields.sellingPrice ?? row.selling_price,
                cost_price:    fields.costPrice    ?? row.cost_price,
              }
            : row,
        );
      }

      writeStore(store);
    } catch (error) {
      console.error("updateInventoryPrices (web) failed", error);
    }
  },

  /** Delete a product and all its inventory batches and sales */
  deleteProduct: async (productId: string): Promise<void> => {
    try {
      const store = readStore();
      store.products  = store.products.filter((p)   => p.id !== productId);
      store.inventory = store.inventory.filter((row) => row.product_id !== productId);
      store.sales     = store.sales.filter((s) => s.product_id !== productId);
      writeStore(store);
    } catch (error) {
      console.error("deleteProduct (web) failed", error);
    }
  },

  /** Returns the last N sales with product name resolved, newest first */
  getSalesHistory: async (limit = 50): Promise<
    { id: string; productName: string; quantity: number; totalPrice: number; timestamp: string }[]
  > => {
    try {
      const { products, sales } = readStore();
      return [...sales]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)
        .map((s) => ({
          id:          s.id,
          productName: products.find((p) => p.id === s.product_id)?.name ?? "Unknown",
          quantity:    s.quantity,
          totalPrice:  s.total_price,
          timestamp:   s.timestamp,
        }));
    } catch {
      return [];
    }
  },

  /** Process receipt items — matches native db parity */
  processReceiptTransaction: async (
    items: { name: string; quantity: number; price: number }[],
    type: "PURCHASE" | "SALE",
  ): Promise<void> => {
    const store = readStore();

    for (const item of items) {
      let product = store.products.find(
        (p) => p.name.toUpperCase() === item.name.toUpperCase(),
      );

      let productId = product?.id;
      if (!productId) {
        productId = `P-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        store.products.push({
          id: productId,
          name: item.name,
          barcode: null,
          category: null,
          min_stock_level: 5,
        });
      }

      if (type === "PURCHASE") {
        const batchId = `B-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const sellingPrice = Number((item.price * 1.15).toFixed(2));
        store.inventory.push({
          id: batchId,
          product_id: productId,
          quantity: item.quantity,
          cost_price: item.price,
          selling_price: sellingPrice,
          supplier_name: null,
          date_added: new Date().toISOString(),
        });
      } else {
        // SALE — FIFO deduction
        const batches = store.inventory
          .filter((row) => row.product_id === productId && row.quantity > 0)
          .sort(
            (a, b) =>
              new Date(a.date_added).getTime() - new Date(b.date_added).getTime(),
          );

        let remaining = item.quantity;
        for (const batch of batches) {
          if (remaining <= 0) break;
          const deduct = Math.min(batch.quantity, remaining);
          batch.quantity -= deduct;
          remaining -= deduct;
        }

        store.sales.push({
          id: `S-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          product_id: productId,
          quantity: item.quantity,
          total_price: item.quantity * item.price,
          timestamp: new Date().toISOString(),
        });
      }
    }

    writeStore(store);
  },

  resetDemoData: async (): Promise<void> => {
    const demoProducts: ProductRow[] = [
      {
        id: "P-DEMO-1",
        name: "Coke 1.5L",
        barcode: "4800016642158",
        category: "Demo",
        min_stock_level: 5,
      },
      {
        id: "P-DEMO-2",
        name: "Lucky Me Beef",
        barcode: "4807770270001",
        category: "Demo",
        min_stock_level: 5,
      },
      {
        id: "P-DEMO-3",
        name: "Bear Brand 320g",
        barcode: "4800361361131",
        category: "Demo",
        min_stock_level: 5,
      },
      {
        id: "P-DEMO-4",
        name: "Bottled Water 500ml",
        barcode: "4800014321116",
        category: "Demo",
        min_stock_level: 5,
      },
    ];

    const demoInventory: InventoryRow[] = [
      {
        id: "B-P-DEMO-1",
        product_id: "P-DEMO-1",
        quantity: 16,
        cost_price: 54,
        selling_price: 65,
        supplier_name: "Demo Supplier",
        date_added: new Date().toISOString(),
      },
      {
        id: "B-P-DEMO-2",
        product_id: "P-DEMO-2",
        quantity: 42,
        cost_price: 14,
        selling_price: 18.5,
        supplier_name: "Demo Supplier",
        date_added: new Date().toISOString(),
      },
      {
        id: "B-P-DEMO-3",
        product_id: "P-DEMO-3",
        quantity: 8,
        cost_price: 88,
        selling_price: 102,
        supplier_name: "Demo Supplier",
        date_added: new Date().toISOString(),
      },
      {
        id: "B-P-DEMO-4",
        product_id: "P-DEMO-4",
        quantity: 60,
        cost_price: 17,
        selling_price: 25,
        supplier_name: "Demo Supplier",
        date_added: new Date().toISOString(),
      },
    ];

    writeStore({
      products: demoProducts,
      inventory: demoInventory,
      alerts: [],
      sales: [],
    });
  },
};
