<div align="center">

# 📱 Niddhi Setu Mobile Companion
### Institutional Pocket Portal for AICTE Security Deposits & FDR Guarantees

[![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_58-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactnative.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev/)
[![AICTE](https://img.shields.io/badge/AICTE-Synchronized-0d9488?style=for-the-badge&logo=shield&logoColor=white)](https://aicte-india.org/)

<p align="center">
  <b>Purpose-built mobile application for Technical Institute Registrars and Finance Officers to scan, submit, track, and release institutional Fixed Deposit Receipts (FDRs) in real time.</b>
</p>

> [!NOTE]
> **Audience**: This mobile companion is strictly institution-facing. AICTE regulatory officers and administrators use the comprehensive web portal for national scrutiny and audit controls.

</div>

---

## 🚀 Mobile Capabilities

### 1. 📷 Deposit Camera Scanner & Digital Intake
- Scan physical paper certificates directly using your phone's camera.
- Upload digitally signed bank receipts or PDF FDR certificates.
- Automated validation checks for principal amounts, maturity tenure, and joint AICTE liens.
- Submissions immediately synchronize with the AICTE Web Scrutiny Desk and Verification Queue.

### 2. 🔔 Regulatory Scrutiny & Maturity Alerts
- Real-time notification feed directly from AICTE approval officers.
- 30-day and 60-day advance alerts before FDR maturity to prevent deposit lapsing.
- Immediate alerts when an officer approves, requests clarification, or sanctions deposit encashment.

### 3. 📊 Pocket Institutional Dashboard
- Real-time aggregate count and value of deposits under AICTE custody.
- Breakdown of verified instruments, deposits in scrutiny, and overdue rollovers.

### 4. 🗂️ Live Deposit Register & Dossier
- Search and filter institutional FDRs by bank, reference token, or status.
- View detailed deposit dossiers: joint ownership terms, branch codes, issue dates, and document checksums.

### 5. 📝 Mobile Lien Release Application
- Submit lien discharge and encashment applications on completion of approved course tenures directly from mobile.
- Track real-time progress through the regulatory clearance desk.

---

## 📱 Navigation Structure

<div align="center">

| Tab Icon | Tab Name | Screen Destination | Key Operations |
| :---: | :--- | :--- | :--- |
| 🏠 | **Home** | Dashboard | Institutional summary metrics, live deposit value, quick actions |
| 📁 | **FDRs** | Deposit Register | Searchable catalog, full deposit dossiers, apply for release |
| 📷 | **Upload** | Intake Scanner | Camera scanner, PDF selector, and submission form |
| 🔔 | **Alerts** | Regulatory Feed | Push notifications, officer clarification requests, maturity warnings |
| 👤 | **Profile** | Institute Profile | Institute trust info, nodal officer contact, secure logout |

</div>

---

## 🛠️ Quick Setup & Device Execution

### Prerequisites
- **Expo Go App** (SDK 58) installed on your iOS or Android device.
- Smartphone and computer connected to the **same Wi-Fi network**.

---

### 1. Configure Backend Host
Open [`src/api/client.ts`](./src/api/client.ts) and set `BASE_URL` to your computer's local Wi-Fi IP address:

```typescript
// Replace with your development machine's local IPv4
const BASE_URL = 'http://192.168.1.35:5000/api';
```
*(Find your IP by running `ipconfig` on Windows or `ifconfig` on Linux/macOS).*

### 2. Launch Development Bundler
```bash
# From mobile/ directory
npm install
npm start
```

### 3. Open on Phone
- Open **Expo Go** on your physical Android device and scan the displayed terminal QR code.
- On iOS, open the **Camera** app to scan the QR code and launch in Expo Go.

---

## 🔑 One-Tap Staging Credentials

The login screen provides 1-tap quick login buttons for instant demo access:

| Institution | Registered Nodal Email | Password |
| :--- | :--- | :--- |
| **IIT Delhi** | `registrar@iitd.ac.in` | `Inst@123` |
| **NIT Trichy** | `registrar@nitt.edu` | `Inst@123` |
| **BITS Pilani** | `finance@bits-pilani.ac.in` | `Inst@123` |

---

<div align="center">
  <sub>Part of the <b>Niddhi Setu</b> Platform • Ministry of Education & AICTE</sub>
</div>
