// Database Schema and Types for Smart Inventory System
// Using SQLite (expo-sqlite)

export interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category: string;
  minStockLevel: number;
}

export interface InventoryBatch {
  id: string;
  productId: string;
  quantity: number;
  costPrice: number; // Price from supplier
  sellingPrice: number; // Current store price
  supplierName: string;
  dateAdded: string;
}

export interface Sale {
  id: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  timestamp: string;
}

export interface SmartAlert {
  id: string;
  type: 'PRICE_HIKE' | 'DEAD_STOCK' | 'LOW_STOCK';
  title: string;
  message: string;
  productId: string;
  metadata?: {
    suggestedPrice?: number;
    percentChange?: number;
    daysSinceLastSale?: number;
  };
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
}

export const SQL_INIT = `
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT,
    category TEXT,
    min_stock_level INTEGER DEFAULT 5
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    quantity INTEGER,
    cost_price REAL,
    selling_price REAL,
    supplier_name TEXT,
    date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    product_id TEXT,
    quantity INTEGER,
    total_price REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    type TEXT,
    title TEXT,
    message TEXT,
    product_id TEXT,
    metadata TEXT, -- JSON string
    status TEXT DEFAULT 'PENDING'
  );
`;
