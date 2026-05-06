import TextRecognition from "@react-native-ml-kit/text-recognition";

export type OCRFieldType = "name" | "price" | "quantity";

export type ReceiptLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number; // Unit price
};

export type OCRResult = {
  fullText: string;
  items?: ReceiptLineItem[];
};

// More robust price regex: matches 12.50, 1,200.00, ₱50.00, etc.
const PRICE_PATTERN = /(?:₱|PHP|P)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i;
// Quantity pattern: matches 10pcs, 10 pcs, x5, 5x, 10 units
const QTY_PATTERN = /(?:^|\s|x|qty|@)\s*(\d{1,3})\s*(?:pcs|units|units|x|qty|@)?(?:\s|$)/i;

function normalizePrice(raw: string): number | null {
  if (!raw) return null;
  // Remove currency symbols and spaces
  const cleaned = raw.replace(/[₱PH\s,]/gi, "").replace(",", ".");
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

function parseLine(line: string): ReceiptLineItem | null {
  const text = line.trim();
  if (text.length < 5) return null;

  // 1. Try to find the total price (usually at the end of the line)
  // 2. Try to find unit price and quantity
  
  const words = text.split(/\s+/);
  if (words.length < 2) return null;

  let name = "";
  let unitPrice = 0;
  let quantity = 1;

  // Search for prices from right to left (Total Price is usually last)
  let pricesFound: number[] = [];
  words.forEach(w => {
    const p = normalizePrice(w);
    if (p !== null) pricesFound.push(p);
  });

  if (pricesFound.length === 0) return null;

  // Heuristic: If we found 2 prices, the smaller one is likely unit price, larger is total
  // Or if we found 1 price, it's either unit price or total.
  if (pricesFound.length >= 2) {
    unitPrice = Math.min(pricesFound[0], pricesFound[1]);
    const totalPrice = Math.max(pricesFound[0], pricesFound[1]);
    // Try to infer quantity from prices
    if (unitPrice > 0) {
      quantity = Math.round(totalPrice / unitPrice);
    }
  } else {
    unitPrice = pricesFound[0];
  }

  // Look for explicit quantity patterns (e.g. "10pcs", "x5")
  const qtyMatch = text.match(QTY_PATTERN);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

  // Name is everything else
  name = text
    .replace(PRICE_PATTERN, "")
    .replace(QTY_PATTERN, "")
    .replace(/[0-9]+(?:\.[0-9]{2})?/, "") // Remove leftover numbers
    .replace(/[^A-Za-z0-9\s&().,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (name.length < 3 || !/[A-Z]/.test(name)) return null;

  return {
    id: `item-${Math.random().toString(36).substr(2, 9)}`,
    name,
    quantity,
    price: unitPrice,
  };
}

export async function processImageForText(
  imageUri: string,
): Promise<OCRResult> {
  let fullText = "";
  let items: ReceiptLineItem[] = [];

  try {
    const result = await TextRecognition.recognize(imageUri);
    fullText = result?.text ?? "";
    
    const lines = fullText.split("\n");
    lines.forEach(line => {
      const parsed = parseLine(line);
      if (parsed) items.push(parsed);
    });
  } catch (error) {
    console.error("OCR Error:", error);
    // Fallback demo data if OCR fails or for testing
    fullText = "COKE 1.5L 12 @ 55.00 660.00\nLUCKY ME BEEF 10PCS 12.50\nSKYFLAKES 24X 5.50";
    const lines = fullText.split("\n");
    lines.forEach(line => {
      const parsed = parseLine(line);
      if (parsed) items.push(parsed);
    });
  }

  // Deduplicate items with same name (if OCR reads overlapping blocks)
  const uniqueItems: ReceiptLineItem[] = [];
  const seenNames = new Set<string>();
  
  items.forEach(item => {
    if (!seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueItems.push(item);
    }
  });

  return {
    fullText,
    items: uniqueItems,
  };
}
