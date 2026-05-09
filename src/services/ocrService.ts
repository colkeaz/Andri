import { Platform } from "react-native";

// This will automatically resolve to ocrEngine.web.ts on Web 
// and ocrEngine.ts on Android/iOS thanks to Metro/Webpack extensions.
import * as Engine from "./ocrEngine";

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
  priceString?: string; // Raw string to preserve decimals while typing
  existingId?: string;
  suggestedPrice?: number;
};

export type OCRResult = {
  fullText: string;
  chips: OCRChip[];
  items?: ReceiptLineItem[];
};

const PRICE_PATTERN = /(?:₱|PHP|P)?\s*(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/i;
const QTY_PATTERN = /(?:^|\s|x|qty|@)\s*(\d{1,3})\s*(?:pcs|units|x|qty|@)?(?:\s|$)/i;

function normalizePrice(raw: string): number | null {
  if (!raw) return null;
  // Remove all letters, currency symbols, and spaces. Keep digits, dots, commas.
  let cleaned = raw.replace(/[^\d.,]/g, "");
  
  if (!cleaned) return null;

  // Handle European format 1.200,50 -> 1200.50 and US format 1,200.50 -> 1200.50
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    if (cleaned.length - lastComma === 3) {
      cleaned = cleaned.replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }
  const num = parseFloat(cleaned);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

function parseLine(line: string): ReceiptLineItem | null {
  const text = line.trim();
  if (text.length < 5) return null;

  const words = text.split(/\s+/);
  if (words.length < 2) return null;

  let name = "";
  let unitPrice = 0;
  let quantity = 1;

  let pricesFound: number[] = [];
  words.forEach(w => {
    const p = normalizePrice(w);
    if (p !== null) pricesFound.push(p);
  });

  if (pricesFound.length === 0) return null;

  if (pricesFound.length >= 2) {
    unitPrice = Math.min(pricesFound[0], pricesFound[1]);
    const totalPrice = Math.max(pricesFound[0], pricesFound[1]);
    if (unitPrice > 0) {
      quantity = Math.round(totalPrice / unitPrice);
    }
  } else {
    unitPrice = pricesFound[0];
  }

  const qtyMatch = text.match(QTY_PATTERN);
  if (qtyMatch) {
    quantity = parseInt(qtyMatch[1], 10);
  }

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
 * SHARED LOGIC LAYER
 * Processes an image using the platform-specific engine.
 */
export async function processImageForText(
  imageUri: string,
  imageSize?: { width: number; height: number },
): Promise<OCRResult> {
  let fullText = "";
  let items: ReceiptLineItem[] = [];
  let chips: OCRChip[] = [];

  try {
    // Platform-Specific Engine Call
    let engineResult;
    if (Platform.OS === 'web') {
      // @ts-ignore - Dynamically picking the web function
      engineResult = await Engine.recognizeTextWeb(imageUri);
    } else {
      // @ts-ignore - Dynamically picking the native function
      engineResult = await Engine.recognizeTextNative(imageUri);
    }

    fullText = engineResult.text;
    
    const lines = fullText.split("\n");
    lines.forEach(line => {
      const parsed = parseLine(line);
      if (parsed) items.push(parsed);
    });

    // Handle chips (only for native ML Kit blocks for now to avoid web complexity)
    if (Platform.OS !== 'web' && engineResult.blocks && imageSize) {
      let chipIndex = 0;
      for (const block of engineResult.blocks) {
        for (const line of block.lines ?? []) {
          const text = (line.text ?? "").trim();
          if (!text || text.length < 2) continue;

          const frame = line.frame || (line as any).boundingBox;
          if (frame) {
            const x = frame.left ?? frame.x ?? 0;
            const y = frame.top ?? frame.y ?? 0;
            const w = frame.width ?? 100;
            const h = frame.height ?? 30;

            const priceMatch = text.match(/(?:₱|PHP|P)?\s*\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})/i);
            const chipType: OCRFieldType = priceMatch ? "price" : "name";

            chips.push({
              id: `chip-${chipIndex++}`,
              text: priceMatch ? (normalizePrice(priceMatch[0])?.toFixed(2) ?? text) : text,
              type: chipType,
              x, y, width: w, height: h,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("OCR Service Error:", error);
    throw new Error("Text recognition failed. Please try again or enter items manually.");
  }

  // Shared Deduplication Logic
  const uniqueItems: ReceiptLineItem[] = [];
  const seenNames = new Set<string>();
  items.forEach(item => {
    if (!seenNames.has(item.name)) {
      seenNames.add(item.name);
      uniqueItems.push(item);
    }
  });

  return { fullText, chips, items: uniqueItems };
}
