import assert from "node:assert/strict";
import test from "node:test";

function aggregateInventory(products, batches) {
  return products.map((product) => {
    const productBatches = batches.filter((batch) => batch.product_id === product.id);
    const latestBatch = productBatches.at(-1);

    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode ?? null,
      minStockLevel: product.min_stock_level ?? 5,
      totalStock: productBatches.reduce((sum, batch) => sum + Number(batch.quantity || 0), 0),
      sellingPrice: Number(latestBatch?.selling_price ?? 0),
      costPrice: Number(latestBatch?.cost_price ?? 0),
    };
  });
}

function executeSale(store, cartItems) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error("Cart is empty.");
  }

  const nextStore = {
    products: [...store.products],
    inventory: store.inventory.map((row) => ({ ...row })),
    sales: [...store.sales],
  };

  for (const item of cartItems) {
    const requiredQty = Math.max(0, Math.floor(item.quantity));
    if (!item.productId || requiredQty <= 0) {
      throw new Error("Invalid cart item.");
    }

    const batches = nextStore.inventory
      .filter((row) => row.product_id === item.productId && row.quantity > 0)
      .sort((a, b) => new Date(a.date_added).getTime() - new Date(b.date_added).getTime());
    const available = batches.reduce((sum, batch) => sum + batch.quantity, 0);

    if (available < requiredQty) {
      throw new Error(`Insufficient stock for product ${item.productId}.`);
    }

    let remaining = requiredQty;
    for (const batch of batches) {
      if (remaining <= 0) break;
      const deduct = Math.min(batch.quantity, remaining);
      batch.quantity -= deduct;
      remaining -= deduct;
    }

    nextStore.sales.push({
      product_id: item.productId,
      quantity: requiredQty,
      total_price: requiredQty * Number(item.unitPrice),
    });
  }

  return nextStore;
}

function calculateProfitGuard(currentCost, newCost, currentSellingPrice, targetMargin = 0.15) {
  const suggestedSellingPrice = Math.ceil(newCost / (1 - targetMargin));
  const potentialMargin = (currentSellingPrice - newCost) / currentSellingPrice;
  const marginImpact = (targetMargin - potentialMargin) * 100;

  return {
    shouldUpdate: newCost > currentCost,
    oldCost: currentCost,
    newCost,
    currentSellingPrice,
    suggestedSellingPrice,
    marginImpact,
  };
}

function parseReceiptLine(line) {
  const text = line.trim();
  if (text.length < 5) return null;

  const pricePattern = /(?:₱|PHP|P)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i;
  const qtyPattern = /(?:^|\s|x|qty|@)\s*(\d{1,3})\s*(?:pcs|units|x|qty|@)?(?:\s|$)/i;
  const normalizePrice = (raw) => {
    const cleaned = raw.replace(/[₱PH\s,]/gi, "").replace(",", ".");
    if (!/^\d+(?:\.\d{2})$/.test(cleaned)) return null;
    const num = Number.parseFloat(cleaned);
    return Number.isNaN(num) || num <= 0 ? null : num;
  };

  const words = text.split(/\s+/);
  const pricesFound = words.map(normalizePrice).filter((price) => price !== null);
  if (pricesFound.length === 0) return null;

  let unitPrice = pricesFound[0];
  let quantity = 1;
  if (pricesFound.length >= 2) {
    unitPrice = Math.min(pricesFound[0], pricesFound[1]);
    quantity = Math.round(Math.max(pricesFound[0], pricesFound[1]) / unitPrice);
  }

  const qtyMatch = text.match(qtyPattern);
  if (qtyMatch) quantity = Number.parseInt(qtyMatch[1], 10);

  const name = text
    .replace(pricePattern, "")
    .replace(qtyPattern, "")
    .replace(/[^A-Za-z0-9\s&().,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (name.length < 3 || !/[A-Z]/.test(name)) return null;
  return { name, quantity, price: unitPrice };
}

test("aggregates batches into one inventory summary", () => {
  const rows = aggregateInventory(
    [{ id: "p1", name: "Coke", barcode: "123", min_stock_level: 5 }],
    [
      { product_id: "p1", quantity: 2, cost_price: 10, selling_price: 12, date_added: "2026-01-01" },
      { product_id: "p1", quantity: 3, cost_price: 11, selling_price: 14, date_added: "2026-01-02" },
    ],
  );

  assert.equal(rows[0].totalStock, 5);
  assert.equal(rows[0].costPrice, 11);
  assert.equal(rows[0].sellingPrice, 14);
});

test("sale transaction deducts FIFO stock and records sale", () => {
  const result = executeSale(
    {
      products: [{ id: "p1" }],
      inventory: [
        { id: "b1", product_id: "p1", quantity: 2, date_added: "2026-01-01" },
        { id: "b2", product_id: "p1", quantity: 5, date_added: "2026-01-02" },
      ],
      sales: [],
    },
    [{ productId: "p1", quantity: 4, unitPrice: 10 }],
  );

  assert.equal(result.inventory[0].quantity, 0);
  assert.equal(result.inventory[1].quantity, 3);
  assert.equal(result.sales[0].total_price, 40);
});

test("sale transaction rejects insufficient stock before mutation", () => {
  const store = {
    products: [{ id: "p1" }],
    inventory: [{ id: "b1", product_id: "p1", quantity: 1, date_added: "2026-01-01" }],
    sales: [],
  };

  assert.throws(() => executeSale(store, [{ productId: "p1", quantity: 2, unitPrice: 10 }]), /Insufficient stock/);
  assert.equal(store.inventory[0].quantity, 1);
  assert.equal(store.sales.length, 0);
});

test("profit guard suggests price for the target margin", () => {
  const result = calculateProfitGuard(10, 20, 22);
  assert.equal(result.shouldUpdate, true);
  assert.equal(result.suggestedSellingPrice, 24);
});

test("receipt parser extracts item, quantity, and price", () => {
  const item = parseReceiptLine("COKE 1.5L 12PCS 55.00");
  assert.equal(item.name, "COKE 1.5L");
  assert.equal(item.quantity, 12);
  assert.equal(item.price, 55);
});
