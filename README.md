# Andri 🏪

**Andri** is an intelligent, offline-first mobile application designed to empower small business owners with professional-grade inventory management and POS tools. Designed with a "Touch-First" and elder-friendly philosophy, it helps local shops protect their profit margins and eliminate manual tracking friction.

---

## 🌟 What is it?

The app is a complete digital companion for sari-sari stores and small retail shops. It solves the most common pain points for small owners:
- **Inflation Protection**: Automatically tracks supplier price changes and suggests new retail prices.
- **Complexity Barrier**: Replaces complicated POS systems with a high-contrast, big-button interface.
- **Manual Data Entry**: Uses AI Vision (OCR) to scan wholesaler receipts and product labels instantly.
- **Offline Reliability**: Works 100% offline using a local SQLite database, perfect for areas with spotty internet.

## 🚀 How It Works

### 1. Smart Intake (AI Vision)
Instead of typing every item, use your camera to:
- **Scan Receipts**: Snap a photo of a wholesaler receipt. The app parses the names, quantities, and costs automatically.
- **Scan Labels**: Point at a product label to instantly extract the name and price using OCR.

### 2. Profit Guard™
When you add new stock, the app compares the new cost with your previous purchase. If the price went up, **Profit Guard** calculates the exact selling price needed to maintain your target margin, ensuring you never sell at a loss due to inflation.

### 3. POS & Inventory
- **Mobile POS**: Rapid barcode scanning for checkout.
- **Quick-Add Grid**: A simplified grid for non-barcoded items like bread or loose goods.
- **Dead-Stock Alerts**: Automatically flags items that haven't sold in 30 days and suggests liquidation prices.

---

## 🛠️ Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (20 LTS or newer)
- [EAS CLI](https://docs.expo.dev/build/setup/) (for building APKs)
- **Expo Go** app on your phone (for basic testing)

### 1) Clone and Install
```bash
git clone <your-repo-url>
cd my-app
npm install
```

### 2) Run for Development
```bash
# Start the dev server
npx expo start
```
*Note: Because this app uses native modules for OCR and SQLite, some features require a **Development Build** rather than the standard Expo Go app.*

### 3) Generate an APK (Android)
To install the app directly on your phone as a standalone app:
1. Install EAS: `npm install -g eas-cli`
2. Log in: `eas login`
3. Build the APK:
```bash
npx eas build -p android --profile preview
```
Once finished, you'll receive a link/QR code to download and install your APK.

---

## 📱 Project Structure

- `app/`: Navigation and screen routing (Expo Router).
- `src/screens/`: Main views including POS, Visual Intake, and Dashboard.
- `src/database/`: SQLite schema and data persistence layer.
- `src/logic/`: Core algorithms for Profit Guard and inventory aggregation.
- `src/services/`: AI Vision and OCR integration services.
- `src/theme/`: Navy & Gold "Premium-Contrast" design system.

---

## 🧠 OCR & Native Modules
This app uses **Google ML Kit** for on-device text recognition. This ensures that your scanning works even without an internet connection. To modify the native configuration, refer to `app.json` and the `src/services/ocrService.ts` file.
