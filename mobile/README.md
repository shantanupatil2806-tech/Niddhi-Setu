# Niddhi Setu — Institute Mobile Companion App

React Native / Expo companion application for technical education institutions (e.g. IIT Delhi, NIT Trichy, BITS Pilani), synchronized in real-time with the **Niddhi Setu AICTE Regulatory Portal**.

> **Institution-facing only.** AICTE officers and administrators use the web portal.

---

## Features

1. **Regulatory Alerts & Notifications**
   - Live alerts synced from the AICTE regulatory desk
   - Maturity reminders (30-day and 60-day advance notice)
   - Instant notifications when an officer requests clarifications or approves a release

2. **Camera & File Upload (Deposit Intake)**
   - Scan physical FDR certificates directly with your phone camera
   - Upload bank-stamped PDF receipts or image files
   - Form fields: Reference Number, Scheduled Bank, Branch, Principal Amount, Issue Date, Maturity Date
   - Submissions instantly appear on the AICTE web portal and enter the verification queue

3. **Live Dashboard**
   - Total deposit value held in regulatory custody
   - Active & verified deposit counts, items under review, and upcoming expiries

4. **Pocket FDR Register**
   - Search and filter all institutional FDR guarantees
   - View full dossier: bank details, maturity countdown, document reference

5. **Release & Encashment Clearance**
   - Apply for lien discharge and NOC directly from your phone at end of course tenure
   - Track status of pending release applications

---

## Prerequisites

- **Expo Go** app installed on your Android or iOS phone — **must be SDK 58**
- Phone and PC on the same Wi-Fi network
- Backend running on your PC (see below)

---

## Setup

### 1. Set your Wi-Fi IP address

Open [`src/api/client.ts`](./src/api/client.ts) and update `BASE_URL` to your PC's local IP address:

```ts
const BASE_URL = 'http://192.168.1.XX:5000/api'; // replace XX with your IP
```

To find your PC's IP: run `ipconfig` (Windows) and look for the **IPv4 Address** under your Wi-Fi adapter.

### 2. Start the backend

From `backend/`:
```bash
npm run dev
```

The backend listens on `0.0.0.0:5000`, making it reachable from your phone on the same network.

### 3. Start the mobile app

From `mobile/`:
```bash
npm start
```

- **Physical phone (recommended):** Scan the QR code with the Expo Go app
- **Android emulator:** Press `a` in the terminal
- **iOS simulator:** Press `i` in the terminal
- **Web browser:** Press `w` or run `npm run web`

---

## Screens

| Screen | Tab | Description |
|--------|-----|-------------|
| Login | — | Quick-login presets for demo institutions |
| Home | Home | Dashboard with KPI cards and recent FDR summary |
| FDR Register | FDRs | Searchable list, dossier modal, release application |
| Upload | Upload | Camera scanner + PDF picker + submission form |
| Alerts | Alerts | Live regulatory notifications |
| Profile | Profile | Account info and sign out |

---

## Demo Logins (Quick Tap)

| Institution | Email | Password |
|-------------|-------|----------|
| IIT Delhi | `registrar@iitd.ac.in` | `Inst@123` |
| NIT Trichy | `registrar@nitt.edu` | `Inst@123` |
| BITS Pilani | `finance@bits-pilani.ac.in` | `Inst@123` |

---

## Technical Notes

- **Expo SDK:** 58 (must match Expo Go version on your phone)
- **React Native:** Managed workflow via Expo
- **`.npmrc`:** `legacy-peer-deps=true` — required due to React 19 peer dependency conflicts in SDK 58
- **Auth:** JWT tokens stored in `AsyncStorage`, passed as `Bearer` in all API calls
- **Navigation:** React Navigation v7 — bottom tab + stack navigators
