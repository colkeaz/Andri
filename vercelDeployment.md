# Vercel Deployment Plan: Stocker (Andri) Web Mirror

This deployment provides a browser-accessible "Mirror" of the Stocker system for judge demonstrations. It prioritizes **stability** and **minimal risk** by using platform-specific adapters for hardware-dependent features.

## 1. Core Architecture: "Shared Brain, Local Hands"
*   **Shared Brain**: 100% of the Business Logic (Inventory computation, POS math, Transaction state) is shared.
*   **Local Hands**: Hardware interactions (OCR and Camera) use different engines per platform to ensure maximum stability.

## 2. Feature Parity Matrix

| Feature | Android (EAS Dev Build) | Web (Vercel Demo) | Logic Engine |
| :--- | :--- | :--- | :--- |
| **Inventory / POS** | Full | Full | Shared |
| **Data Persistence** | Native SQLite | Wasm SQLite (IndexedDB) | Shared |
| **Camera Access** | Live Camera (Native) | **File Upload UI** | Platform Adapter |
| **Receipt OCR** | ML Kit (Native) | **File-Based Tesseract** | Platform Adapter |

## 3. OCR & Camera Strategy (Demo-Safe)

### A. Web Strategy (Primary)
*   **Input**: Instead of a live camera stream (which can be clunky on laptops), the Web version will provide a **File Upload** button.
*   **Engine**: Processing will be done via `Tesseract.js` on the uploaded file.
*   **Benefit**: This eliminates camera permission bugs and "frozen" video streams during the judge demo.

### B. Android Strategy (Unchanged)
*   **Input**: Live Camera via `expo-camera`.
*   **Engine**: High-speed native **ML Kit**.
*   **Benefit**: Maintains the premium "Smart" feel of the native app.

## 4. Technical Implementation

### 1. The Adapter Layer (`ocrService.ts`)
We will refactor the service to branch based on `Platform.OS`:
```typescript
if (Platform.OS === 'web') {
  return processWithTesseract(imageUri);
} else {
  return processWithMLKit(imageUri);
}
```

### 2. SPA Routing Configuration (`vercel.json`)
Already implemented to prevent 404 errors on page refresh:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## 5. Deployment Workflow
1.  **Build**: `npx expo export -p web`
2.  **Upload**: Automatic GitHub -> Vercel integration.
3.  **Target**: Judges access via `andri-stocker.vercel.app`.

---
**Status**: 🟢 Plan finalized. Implementing OCR and UI platform adapters.