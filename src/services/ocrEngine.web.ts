import Tesseract from "tesseract.js";

/**
 * WEB ENGINE (Vercel/Browser)
 * Uses Tesseract.js for demo-safe OCR without native dependencies.
 */
export async function recognizeTextWeb(imageUri: string) {
  try {
    const worker = await Tesseract.createWorker("eng");
    const { data: { text } } = await worker.recognize(imageUri);
    await worker.terminate();
    
    return {
      text: text || "",
      blocks: [] // Tesseract blocks structure differs, we'll rely on text parsing for web demo
    };
  } catch (error) {
    console.error("Web OCR Error:", error);
    throw error;
  }
}
