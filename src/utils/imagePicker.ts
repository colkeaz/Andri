/**
 * NATIVE IMAGE PICKER
 * Returning null/noop to avoid crashing dev builds that haven't been rebuilt.
 */
export async function pickImageAsync() {
  console.warn("Image picker not available in this native build. Use the camera instead.");
  return null;
}
