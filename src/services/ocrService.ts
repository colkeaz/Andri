import TextRecognition from "@react-native-ml-kit/text-recognition";

export type OCRFieldType = "name" | "price" | "quantity";

export type OCRChip = {
  id: string;
  text: string;
  type: OCRFieldType;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ReceiptLineItem = {
  id: string;
  name: string;
  quantity: number;
  price: number; // Unit price
  existingId?: string;
  suggestedPrice?: number;
};

export type OCRResult = {
  fullText: string;
  chips: OCRChip[];
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
  if (!/^\d+(?:\.\d{2})$/.test(cleaned)) return null;
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

/**
 * Processes an image for text using ML Kit Text Recognition.
 * Returns full text, parsed receipt items, and positioned chips for overlay.
 */
export async function processImageForText(
  imageUri: string,
  imageSize?: { width: number; height: number },
): Promise<OCRResult> {
  let fullText = "";
  let items: ReceiptLineItem[] = [];
  let chips: OCRChip[] = [];

  try {
    const result = await TextRecognition.recognize(imageUri);
    fullText = result?.text ?? "";
    
    const lines = fullText.split("\n");
    lines.forEach(line => {
      const parsed = parseLine(line);
      if (parsed) items.push(parsed);
    });

    // Build positioned chips from ML Kit blocks for visual overlay
    if (result?.blocks && imageSize) {
      let chipIndex = 0;
      for (const block of result.blocks) {
        for (const line of block.lines ?? []) {
          const text = (line.text ?? "").trim();
          if (!text || text.length < 2) continue;

          const lineWithFrame = line as typeof line & {
            boundingBox?: { left?: number; top?: number; x?: number; y?: number; width?: number; height?: number };
          };
          const frame = (line.frame ?? lineWithFrame.boundingBox) as
            | { left?: number; top?: number; x?: number; y?: number; width?: number; height?: number }
            | undefined;
          const x = frame?.left ?? frame?.x ?? 0;
          const y = frame?.top ?? frame?.y ?? 0;
          const w = frame?.width ?? 100;
          const h = frame?.height ?? 30;

          // Determine chip type
          const priceMatch = text.match(/(?:₱|PHP|P)?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/i);
          const chipType: OCRFieldType = priceMatch ? "price" : "name";
          const chipText = priceMatch
            ? (normalizePrice(priceMatch[0])?.toFixed(2) ?? text)
            : text;

          chips.push({
            id: `chip-${chipIndex++}`,
            text: chipText,
            type: chipType,
            x,
            y,
            width: w,
            height: h,
          });
        }
      }
    }
  } catch (error) {
    console.error("OCR Error:", error);
    throw new Error("Text recognition failed. Try a clearer photo with better lighting.");
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
    chips,
    items: uniqueItems,
  };
}
