Here is a concise codebase summary based on the repo.

---

## What it is

**Smart Inventory System (“Sari-Sari Smart”)** is a **React Native (Expo) mobile app** aimed at **small retail shops** (e.g. sari-sari stores): large-touch UI, local-first data, and flows for **stock in**, **stock list**, and **quick selling**. The README positions it around **margin protection**, **dead stock**, and **low tech friction** for older shopkeepers.

---

## Tech stack

| Area | Choice |
|------|--------|
| **Framework** | Expo SDK ~54, **Expo Router** (file-based tabs + stack) |
| **UI** | React Native, custom **theme tokens** (`src/theme/tokens.ts`), **Lucide** icons, **`react-native-svg`** |
| **Local DB** | **`expo-sqlite`** — `smart_inventory.db`, initialized on app start in `app/_layout.tsx` |
| **Camera / scan** | **`expo-camera`** (`CameraView`, barcode settings, permissions) |
| **Tooling** | TypeScript, ESLint (`expo lint`), **New Architecture** and **React Compiler** experiments in `app.json` |

---

## App structure & navigation

- **Root** (`app/_layout.tsx`): `Stack` + **`initDatabase()`** on mount.
- **Tabs** (`app/(tabs)/_layout.tsx`): four tabs — **My Shop** (`index`), **Stock** (`inventory`), **Add** (`intake`), **Sell** (`pos`).
- Tab routes are thin wrappers that render screens under `src/screens/`.

---

## Data model (SQLite)

Defined in `src/database/schema.ts` and created in `SQL_INIT`:

- **`products`** — id, name, barcode, category, `min_stock_level`
- **`inventory`** — batches: quantity, cost/selling price, supplier, `date_added`
- **`sales`** — line-item style sales records
- **`alerts`** — smart alerts (type, message, JSON `metadata`, status)

`src/database/db.ts` exposes **`getDB`**, **`initDatabase`**, and **`dbService`** (`getProducts`, `addProduct`, `addBatch`, `getAlerts`). **Manual add** uses this path; other screens often still use **mock data** or **stubs** (see below).

---

## Features by screen (what users see)

1. **Dashboard (`src/screens/Dashboard.tsx`)**  
   Greeting, **large action buttons** (incoming stock, sell, manual add — many actions are still `console.log`), **mock “Smart Suggestions”** (`AlertCard` for price hike / dead stock), and a **mock “Store Health”** summary (inventory value, low stock count).

2. **Add (`app/(tabs)/intake.tsx`)**  
   Toggles **camera intake** vs **manual form**.  
   - **Visual intake** (`VisualIntake.tsx`): live camera preview, **“Snap photo”** simulates OCR via **`visionService.processReceiptOCR`** (hard-coded demo lines, not real OCR).  
   - **Manual add** (`ManualAdd.tsx`): form → **`dbService.addProduct`** + **`dbService.addBatch`**.

3. **Stock (`Inventory.tsx`)**  
   List with **low-stock badges**; currently loads **`mockInventory`** only (DB fetch is commented out).

4. **Sell / POS (`POS.tsx`)**  
   **Barcode/QR scanner** (EAN/UPC/QR), vibration on scan, **placeholder lookup** (adds a fake priced item from barcode suffix). **Quick-tap grid** (Bread, Egg, Soda, Water) for non-barcoded items. Cart total in PHP (₱). **Complete sale** is present in the UI; persistence to `sales` is not shown in the excerpted flow.

---

## Business logic & services

- **`src/logic/profitGuard.ts`** — **Profit Guard**: given old/new cost, selling price, and target margin (default 15%), computes **suggested selling price** and **margin impact**; **`suggestLiquidationPrice`** for long-inactive stock (e.g. ~30+ days → small markup over cost). Ready to wire to real inventory/alerts.
- **`src/services/aiService.ts`** — **Vision / OCR façade**: comments describe future **TFLite** integration; **`recognizeItem`** and **`processReceiptOCR`** are **stubs** (fixed demo return). **`parseBarcode`** helper for scan payloads.
- **`src/services/qrService.ts`** — **Synthetic product IDs** (`SS-CAT-XXXX`) and a **placeholder “print labels”** HTML stub (black box instead of a real QR image).

---

## UX / design direction

- **Elder-friendly**: navy/gold palette, large type (`tokens.ts`), **`BigButton`** (~90px height, vibration on press).
- **`AlertCard`** for actionable price / dead-stock style messages.

---

## Implementation maturity (honest picture)

- **Wired:** DB bootstrap, schema, manual stock entry into SQLite, POS camera + barcode events, theme and navigation shell.  
- **Mostly demo / TODO:** dashboard alerts and health stats, inventory list data, AI vision/OCR, barcode→DB product resolution, QR label generation, and several dashboard navigation handlers.  
- **`train_model.py`** (root): TensorFlow/Keras **MobileNetV2** sketch + TFLite export — **optional**, separate Python environment; not required to run the app.

---

In one line: **it is an Expo Router inventory/POS prototype for small shops**, with **real SQLite plumbing for manual adds**, **camera-based POS and intake UI**, and **documented hooks for Profit Guard + on-device AI**, while much of the “smart” and listing behavior is still **mocked or stubbed** for demos.