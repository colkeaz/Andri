import * as SQLite from 'expo-sqlite';
import { SQL_INIT } from './schema';

const DB_NAME = 'smart_inventory.db';

export const getDB = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  return db;
};

/**
 * Initialize the database with schema
 */
export const initDatabase = async () => {
  const db = await getDB();
  
  try {
    await db.execAsync(SQL_INIT);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed', error);
  }
};

/**
 * Common database operations
 */
export const dbService = {
  getProducts: async () => {
    const db = await getDB();
    return await db.getAllAsync('SELECT * FROM products');
  },

  addProduct: async (id: string, name: string, barcode?: string) => {
    const db = await getDB();
    await db.runAsync(
      'INSERT INTO products (id, name, barcode) VALUES (?, ?, ?)',
      [id, name, barcode || null]
    );
  },

  addBatch: async (
    id: string, 
    productId: string, 
    qty: number, 
    cost: number, 
    sell: number
  ) => {
    const db = await getDB();
    await db.runAsync(
      'INSERT INTO inventory (id, product_id, quantity, cost_price, selling_price) VALUES (?, ?, ?, ?, ?)',
      [id, productId, qty, cost, sell]
    );
  },

  getAlerts: async () => {
    const db = await getDB();
    return await db.getAllAsync("SELECT * FROM alerts WHERE status = 'PENDING'");
  }
};
