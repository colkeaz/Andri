import { dbService } from "../database/db";

export type AggregatedInventoryItem = {
  id: string;
  name: string;
  barcode: string | null;
  totalStock: number;
  minStockLevel: number;
  sellingPrice: number;
  costPrice: number;
};

export async function getAggregatedInventory(): Promise<
  AggregatedInventoryItem[]
> {
  const rows = await dbService.getInventorySummary();
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row: any) => ({
    id:           String(row.id),
    name:         String(row.name ?? "Unnamed item"),
    barcode:      row.barcode ?? null,
    totalStock:   Number(row.total_stock ?? 0),
    minStockLevel: Number(row.min_stock_level ?? 5),
    sellingPrice: Number(row.selling_price ?? 0),
    costPrice:    Number(row.cost_price ?? 0),
  }));
}
