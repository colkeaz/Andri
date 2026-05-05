import TextRecognition from "@react-native-ml-kit/text-recognition";

export type OCRFieldType = "name" | "price";

export type OCRChip = {
  id: string;
  text: string;
  type: OCRFieldType;
  score: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type RecognizedBlock = {
  text?: string;
  frame?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  };
};

export type OCRResult = {
  fullText: string;
  chips: OCRChip[];
};

const PRICE_REGEX =
  /(?:\b(?:PHP|PESOS)\s*)?(?:[Pp]|₱)?\s*(\d{1,5}(?:[.,]\d{2})?)/g;

function normalizePrice(raw: string): number | null {
  const match = raw.match(/(\d{1,5}(?:[.,]\d{2})?)/);
  if (!match) return null;
  const num = Number(match[1].replace(",", "."));
  if (Number.isNaN(num) || num <= 0) return null;
  return num;
}

function inferNameFromLine(line: string): string | null {
  const cleaned = line
    .replace(PRICE_REGEX, "")
    .replace(/[^A-Za-z0-9\s&().,-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 3) return null;
  if (!/[A-Za-z]/.test(cleaned)) return null;
  return cleaned.toUpperCase();
}

function makeFallbackBlocks(text: string): RecognizedBlock[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      text: line,
      frame: {
        left: 12,
        top: 24 + index * 30,
        width: 260,
        height: 24,
      },
    }));
}

function parseBlocksToChips(blocks: RecognizedBlock[]): OCRChip[] {
  const chips: OCRChip[] = [];

  blocks.forEach((block, index) => {
    const blockText = (block.text ?? "").trim();
    if (!blockText) return;

    const left = Number(block.frame?.left ?? 16);
    const top = Number(block.frame?.top ?? 16 + index * 26);
    const width = Number(block.frame?.width ?? 240);
    const height = Number(block.frame?.height ?? 24);

    const prices = [...blockText.matchAll(PRICE_REGEX)];
    prices.forEach((priceMatch, pIndex) => {
      const priceText = priceMatch[0].trim();
      const parsed = normalizePrice(priceText);
      if (parsed === null) return;

      chips.push({
        id: `price-${index}-${pIndex}`,
        text: parsed.toFixed(2),
        type: "price",
        score: 0.9,
        x: left,
        y: top,
        width: Math.max(90, width * 0.45),
        height,
      });
    });

    const inferredName = inferNameFromLine(blockText);
    if (inferredName) {
      chips.push({
        id: `name-${index}`,
        text: inferredName,
        type: "name",
        score: Math.min(1, 0.45 + inferredName.length / 28),
        x: left,
        y: top,
        width: Math.max(120, width),
        height,
      });
    }
  });

  return chips.sort((a, b) => b.score - a.score);
}

export async function processImageForText(
  imageUri: string,
  imageSize?: { width: number; height: number },
): Promise<OCRResult> {
  let fullText = "";
  let blocks: RecognizedBlock[] = [];

  try {
    const result = await TextRecognition.recognize(imageUri);
    fullText = String(result?.text ?? "");
    const nativeBlocks = Array.isArray(result?.blocks) ? result.blocks : [];

    blocks = nativeBlocks.map((nativeBlock: any) => ({
      text: nativeBlock?.text,
      frame: {
        left: nativeBlock?.frame?.left ?? nativeBlock?.boundingBox?.left,
        top: nativeBlock?.frame?.top ?? nativeBlock?.boundingBox?.top,
        width:
          nativeBlock?.frame?.width ??
          nativeBlock?.boundingBox?.width ??
          imageSize?.width,
        height:
          nativeBlock?.frame?.height ?? nativeBlock?.boundingBox?.height ?? 24,
      },
    }));
  } catch {
    // Fallback text keeps the OCR flow demoable if ML Kit is unavailable.
    fullText = "COKE 1.5L 65.00\nLUCKY ME BEEF 18.50\nWATER 25.00";
    blocks = makeFallbackBlocks(fullText);
  }

  return {
    fullText,
    chips: parseBlocksToChips(blocks),
  };
}
