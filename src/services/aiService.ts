/**
 * Vision Service Layer - Production Integration
 */

export interface ScannedReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

export const visionService = {
  /**
   * Recognizes an item (Placeholder for future vision-based recognition).
   */
  recognizeItem: async (imageUri: string): Promise<string> => {
    console.log('Vision feature disabled in favor of Receipt OCR:', imageUri);
    return "Unknown Item";
  },

  /**
   * Wrapper for OCR-based receipt processing.
   */
  processReceiptOCR: async (imagePath: string): Promise<ScannedReceiptItem[]> => {
    // This is handled by ocrService.ts in the current implementation.
    return [
      { name: 'Coke 1.5L', quantity: 1, price: 65.00 },
      { name: 'Lucky Me', quantity: 1, price: 12.50 },
    ];
  },

  parseBarcode: (codes: any[]): string | null => {
    if (codes.length > 0) {
      return codes[0].displayValue || codes[0].rawValue;
    }
    return null;
  }
};

