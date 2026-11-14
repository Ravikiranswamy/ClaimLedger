# ClaimLedger — Chrome Extension (Manifest V3)

> **Enterprise AI Pre-Flight Brand Governance in Your Browser**  
> Verifies marketing claims, pricing assertions, and campaign compliance against authoritative knowledge records in real time.

---

## 🚀 How to Install in Chrome / Edge / Brave

1. Open your browser and navigate to:
   - **Chrome**: `chrome://extensions`
   - **Edge**: `edge://extensions`
   - **Brave**: `brave://extensions`
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **"Load unpacked"** (top-left).
4. Select the directory:
   ```
   c:\Users\Ravikiran Swamy\Downloads\Documents\Projects\ClaimLedger\extension
   ```
5. The extension **"ClaimLedger — Pre-Flight Brand Governance"** will appear in your browser toolbar!
6. Click the Extensions puzzle icon in Chrome and **pin** ClaimLedger to your toolbar.

---

## ⚡ Features

### 1. In-Browser Text Verification
- Click the ClaimLedger icon in your toolbar to open the Pre-Flight popup.
- Paste any marketing copy, ad text, or sales proposal.
- Hit **Verify Content** (or press `Ctrl+Enter` / `Cmd+Enter`).

### 2. Live Webpage Selection Capture
- Highlight text on **any webpage** (e.g. Google Docs, Notion, CMS, Twitter/X, LinkedIn).
- Click **"✂️ Capture Selection"** in the popup to pull the highlighted copy directly into ClaimLedger.
- Alternatively, right-click the selected text and choose **"Verify with ClaimLedger"** from the context menu!

### 3. One-Click Demo Accounts
- **👤 Demo Creator** (`creator@nexora.com`)
- **🛡️ Demo Admin** (`admin@nexora.com`)
- Or enter custom credentials and API endpoints.

### 4. Built-in Test Scenarios
- **🚨 ₹799 (Wrong)**: Demonstrates detection of outdated ₹799 price against authoritative ₹999 master record.
- **✅ ₹999 (Master)**: Proves instant compliance verification of correct enterprise pricing.
- **🎉 Diwali ₹799**: Demonstrates scoped authority resolution with active `DIWALI_SPECIAL` campaign exception.
- **🚫 Expired Deal**: Shows rejection of expired campaign codes (`SUMMER_FLASH_2025`).

### 5. Dual Engine Modes
- **⚡ Lightweight (Sub-Second)**: Uses high-speed heuristic claim extraction and localized RAG index for instant feedback.
- **🔍 Full Pipeline (Deep RAG)**: Employs full Gemini LLM extraction and multi-document authority tier arbitration.

---

## 🛠️ Requirements
- Backend running on `http://localhost:8080` (Spring Boot).
- Frontend running on `http://localhost:5173` (optional, for web UI exploration).

