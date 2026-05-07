import TextRecognition from "@react-native-ml-kit/text-recognition";

/**
 * NATIVE ENGINE (Android/iOS)
 * Uses high-performance Google ML Kit.
 */
export async function recognizeTextNative(imageUri: string) {
  try {
    const result = await TextRecognition.recognize(imageUri);
    return {
      text: result?.text ?? "",
      blocks: result?.blocks ?? []
    };
  } catch (error) {
    console.error("Native OCR Error:", error);
    throw error;
  }
}
