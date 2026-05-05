/**
 * Web: localStorage-backed store. Never imports expo-sqlite (avoids WASM bundling).
 * Row shapes match SQLite column names (snake_case) for API parity with native.
 */

const STORAGE_KEY = 'smart_inventory_web_v1';

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
};

function emptyStore(): WebStore {
  return { products: [], inventory: [], alerts: [] };
}

function canUseStorage(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof (globalThis as unknown as { localStorage?: Storage }).localStorage !==
      'undefined'
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

  addProduct: async (id: string, name: string, barcode?: string): Promise<void> => {
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
      console.error('addProduct (web) failed', error);
    }
  },

  addBatch: async (
    id: string,
    productId: string,
    qty: number,
    cost: number,
    sell: number
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
      console.error('addBatch (web) failed', error);
    }
  },

  getAlerts: async (): Promise<AlertRow[]> => {
    try {
      const { alerts } = readStore();
      return alerts.filter((a) => a.status === 'PENDING');
    } catch {
      return [];
    }
  },
};
