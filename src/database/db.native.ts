/**
 * Native (iOS / Android): SQLite via expo-sqlite.
 * expo-sqlite is loaded only through dynamic import so this module is the only
 * place that references the package on native builds.
 */
import { SQL_INIT } from './schema';

const DB_NAME = 'smart_inventory.db';

type ExpoSQLite = typeof import('expo-sqlite');
let sqliteModule: ExpoSQLite | null = null;

async function loadSQLite(): Promise<ExpoSQLite> {
  if (!sqliteModule) {
    sqliteModule = await import('expo-sqlite');
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
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed', error);
  }
};

export const dbService = {
  getProducts: async () => {
    try {
      const db = await getDB();
      return await db.getAllAsync('SELECT * FROM products');
    } catch {
      return [];
    }
  },

  addProduct: async (id: string, name: string, barcode?: string) => {
    try {
      const db = await getDB();
      await db.runAsync(
        'INSERT INTO products (id, name, barcode) VALUES (?, ?, ?)',
        [id, name, barcode ?? null]
      );
    } catch (error) {
      console.error('addProduct failed', error);
    }
  },

  addBatch: async (
    id: string,
    productId: string,
    qty: number,
    cost: number,
    sell: number
  ) => {
    try {
      const db = await getDB();
      await db.runAsync(
        'INSERT INTO inventory (id, product_id, quantity, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
        [id, productId, qty, cost, sell]
      );
    } catch (error) {
      console.error('addBatch failed', error);
    }
  },

  getAlerts: async () => {
    try {
      const db = await getDB();
      return await db.getAllAsync("SELECT * FROM alerts WHERE status = 'PENDING'");
    } catch {
      return [];
    }
  },
};
