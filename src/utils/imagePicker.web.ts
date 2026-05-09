import * as ImagePicker from "expo-image-picker";

/**
 * WEB IMAGE PICKER
 * Uses expo-image-picker for the Vercel demo.
 */
export async function pickImageAsync() {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0].uri) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error("Web Image Picker Error:", error);
    return null;
  }
}
