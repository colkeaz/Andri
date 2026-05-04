# Smart Inventory System (Sari-Sari Smart) 🏪

An AI-powered, elder-friendly mobile application designed specifically for small business owners (like sari-sari stores or local shops) to manage their inventory, track sales, and protect their profit margins against inflation.

## 🌟 Overview & Purpose

The **Smart Inventory System** is built to solve hidden friction points in running a small retail shop:
*   **The "Sari-Sari Trap"**: Manual shrinkage and tied-up cash due to poor inventory tracking.
*   **Price-Chasing**: Difficulty maintaining profit margins when supplier prices change rapidly.
*   **Dead Stock**: Cash tied up in items that aren't selling.
*   **Technological Barrier**: Complex point-of-sale systems are often too difficult for elderly shop owners to use.

This app features a "Touch-First," high-contrast UI designed for extreme legibility and ease of use. It minimizes manual typing by prioritizing camera-based intake and large, clear actions.

## ✨ Core Features

1.  **Elder-Friendly UI**: Massive buttons, high-contrast text, and a simplified navigation structure.
2.  **"Profit Guard" System**: Automatically detects when a new batch of stock has a higher supplier price and suggests a new selling price to maintain your target profit margin (e.g., 15%).
3.  **Dead-Stock Warnings**: Visual alerts for items that haven't moved in 30 days, suggesting a "Flash Sale" price to liquidate stock.
4.  **Quick-Scan POS**: Turn your phone's camera into a rapid barcode scanner for fast checkouts, with a "Quick Tap" grid for non-barcoded items (like loose eggs or bread).
5.  **Visual Intake (Camera OCR)**: Snap a photo of your receipt or shelf to quickly add new stock (ready for integration with custom AI models).
6.  **Offline-First**: Uses a local SQLite database to ensure the app works flawlessly even without an internet connection.

## 🛠️ Technology Stack

*   **Framework**: React Native with Expo Router (Cross-platform iOS/Android)
*   **Database**: `expo-sqlite` for local persistence
*   **Camera & Scanning**: `expo-camera` for barcode scanning and visual intake
*   **Styling**: Custom theme tokens with `lucide-react-native` icons
*   **AI Readiness**: Architecture prepared for local TensorFlow Lite (`.tflite`) model integration.

## 🚀 Setup & Installation

### Prerequisites
*   [Node.js](https://nodejs.org/) installed on your computer.
*   The **Expo Go** app installed on your physical smartphone (available on iOS App Store and Google Play Store).

### Running the App
1.  **Open your terminal** and navigate to the project directory:
    ```bash
    cd my-app
    ```
2.  **Install dependencies** (if you haven't already):
    ```bash
    npm install
    ```
3.  **Start the development server**:
    ```bash
    npx expo start
    ```
4.  **Scan the QR Code**:
    *   Open the **Expo Go** app on your phone.
    *   Scan the QR code displayed in your terminal.
    *   The app will bundle and load on your device!

## 🧠 AI Training (Optional Advanced Setup)

To enable the camera to automatically recognize specific local products (instead of just barcodes or manual entry), you can train a custom AI model.

1.  A training script (`train_model.py`) is included in the project root.
2.  Please refer to the `AI_TRAINING_GUIDE.md` (located in your AI assistant's artifacts or project notes) for details on downloading the **Sari Sandbox** dataset and generating an `inventory_model.tflite` file.
3.  Once generated, place the `.tflite` model in the app's assets and uncomment the integration logic in `src/services/aiService.ts`.

## 📱 Project Structure

```text
my-app/
├── app/                  # Expo Router navigation (Tabs, Layouts)
│   ├── (tabs)/           # Main app screens (Home, Stock, Add, Sell)
│   └── _layout.tsx       # Root layout and database initialization
├── src/
│   ├── components/       # Reusable UI (BigButton, AlertCard)
│   ├── database/         # SQLite schema and operations (db.ts)
│   ├── logic/            # Business logic (Profit Guard calculations)
│   ├── screens/          # Core views (Dashboard, POS, Inventory, VisualIntake)
│   ├── services/         # Integrations (AI Vision, QR Generation)
│   └── theme/            # Colors, Spacing, and Typography tokens
├── train_model.py        # Python script for generating the AI model
└── package.json          # Dependencies and scripts
```
