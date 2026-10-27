# Niddhi Setu — AICTE Security Deposit & FDR Regulatory Platform

> **SIH Prototype** for AICTE Security Deposit/FDR Management (AICTE Problem Statement)

A centralized platform for managing institution-wise Fixed Deposit Receipts (FDRs) maintained as security deposits with AICTE. Covers the complete FDR lifecycle — from initial submission and verification, through active regulatory custody, to release and encashment clearance at course completion. Available as a **web portal** (for AICTE officers and administrators) and a **mobile companion app** (for technical institutions).

---

## Architecture

```
fdr-sentinel/
├── backend/          # Express.js REST API (port 5000)
├── frontend/         # React + Vite web portal (port 5173)
├── mobile/           # React Native / Expo mobile app (institution-facing)
└── README.md
```

**Who uses what:**

| Platform | Users |
|----------|-------|
| Web Portal | AICTE Officers, Administrators |
| Web Portal | Institutions (limited — submit FDRs, view status) |
| Mobile App | Institutions only |

---

## FDR Lifecycle

```
Institution submits FDR
        ↓
Verification Queue (Officer reviews new FDRs)
        ↓
Active (FDR in regulatory custody)
        ↓
Institution applies for Release (end of course tenure)
        ↓
FDR Release & Encashment Clearance (Officer approves / rejects)
        ↓
Released (lien discharged, NOC issued)
```

> **Note:** The Verification Queue handles *new* FDRs entering custody.  
> The Release & Encashment section handles *existing* FDRs at end of tenure — these are two distinct workflows.

---

## Prerequisites

- Node.js v18+ and npm
- MongoDB (local instance at `mongodb://localhost:27017` or Atlas URI)
- Git
- For mobile: **Expo Go** app installed on your Android/iOS phone (Expo SDK 58)

---

## Quick Start

### 1. Clone and install

```bash
# Backend
cd fdr-sentinel/backend
npm install

# Frontend
cd ../frontend
npm install

# Mobile app
cd ../mobile
npm install
```

### 2. Configure environment

```bash
# Backend — copy example and edit if needed
cp .env.example .env
```

The default `.env` works with a local MongoDB instance on port 27017.

### 3. Seed demo data

```bash
cd fdr-sentinel/backend
npm run seed
```

This creates:
- 3 institutions (IIT Delhi, NIT Trichy, BITS Pilani)
- 6 users across all roles
- 15 FDR instruments with varied statuses and multi-level lineages
- Verification cases, findings, passports, and chained audit events

### 4. Start the web platform

```bash
# Terminal 1 — Backend API (port 5000)
cd fdr-sentinel/backend
npm run dev

# Terminal 2 — Frontend web portal (port 5173)
cd fdr-sentinel/frontend
npm run dev
```

Open: **http://localhost:5173**

### 5. Start the mobile app

> **Requirement:** Expo Go (SDK 58) installed on your phone. Phone and PC must be on the same Wi-Fi network.

```bash
cd fdr-sentinel/mobile
npm start
```

- Scan the QR code in the terminal using the **Expo Go** app on your phone.
- Before starting, open `mobile/src/api/client.ts` and set `BASE_URL` to your PC's local Wi-Fi IP address (e.g., `http://192.168.1.35:5000/api`).

The backend must be started with network binding (`0.0.0.0`) — this is already configured in `backend/server.js`.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | `admin@fdrsentinel.gov.in` | `Admin@123` |
| Regulation Officer 1 | `officer.sharma@fdrsentinel.gov.in` | `Officer@123` |
| Regulation Officer 2 | `officer.verma@fdrsentinel.gov.in` | `Officer@123` |
| IIT Delhi (Institution) | `registrar@iitd.ac.in` | `Inst@123` |
| NIT Trichy (Institution) | `registrar@nitt.edu` | `Inst@123` |
| BITS Pilani (Institution) | `finance@bits-pilani.ac.in` | `Inst@123` |

---

## Application Pages

| # | Page | Route | Access |
|---|------|--------|--------|
| 1 | Login | `/login` | Public |
| 2 | Overview Dashboard | `/dashboard` | All |
| 3 | Institution Registry | `/institutions` | Officer, Admin |
| 4 | Institution Details | `/institutions/:id` | Officer, Admin |
| 5 | FDR Register | `/fdrs` | All |
| 6 | FDR Details | `/fdrs/:id` | All (own inst.) |
| 7 | New FDR Submission | `/fdrs/new` | Institution |
| 8 | Verification Queue | `/verification` | Officer, Admin |
| 9 | Verification Case | `/verification/:caseId` | Officer, Admin |
| 10 | Instrument Relationship Graph | `/graph` | All |
| 11 | Temporal Lineage Explorer | `/lineage` | All |
| 12 | Verification Passport | `/passport/:caseId` | Officer, Admin |
| 13 | Compliance Overview | `/compliance` | All |
| 14 | Renewal & Maturity Calendar | `/calendar` | All |
| 15 | Release & Encashment Clearance | `/release` | All |
| 16 | Reports | `/reports` | Officer, Admin |
| 17 | Administration | `/admin` | Admin |

---

## Key Features

### A. Instrument Relationship Graph (`/graph`)
- Visual canvas showing the relationships between institutions, FDRs, renewals, verification cases, and release applications
- Node types: institution (purple), fdr (blue), renewal (teal), case (amber), release (green)
- Click any node to drill into details
- Flags suspicious patterns: duplicate references, broken lineages, circular links

### B. Temporal Lineage Verification (`/lineage`)
- Timeline of the complete predecessor → successor chain for any FDR
- Automated checks: invalid date sequences, amount regression, coverage gaps, bank migrations
- Each check produces a finding with: rule ID, severity, evidence field, suggested action
- Separate columns for verified facts vs flagged patterns

### C. Verification Passport (`/passport/:caseId`)
- Sealed evidence record per verification case
- Sections: submitted metadata, extracted fields, all compliance rule results, officer decisions, and a linked audit chain
- Corrections recorded as new events, not overwrites — full history preserved

### D. Compliance Overview (`/compliance`)
- Rules-based compliance engine (RULE_001 to RULE_009)
- Radar chart with 6 axes: Date Validity, Document Integrity, Lineage Completeness, Reference Uniqueness, Amount Consistency, Maturity Status
- Every finding shows: rule ID, category, exact evidence field, severity, suggested action, whether officer review is required
- Compliance score: starts at 100, deducts 30/15/10/5 per critical/high/medium/low finding

---

## API Overview

```
POST   /api/auth/login
GET    /api/auth/me

GET    /api/dashboard/summary
GET    /api/dashboard/maturity-trend
GET    /api/dashboard/recent-activity
GET    /api/dashboard/compliance-distribution

GET    /api/institutions
POST   /api/institutions
GET    /api/institutions/:id
PATCH  /api/institutions/:id
GET    /api/institutions/:id/fdrs

GET    /api/fdrs                    # paginated, filterable
POST   /api/fdrs                    # multipart/form-data
GET    /api/fdrs/:id
PATCH  /api/fdrs/:id/status
GET    /api/fdrs/:id/lineage
GET    /api/fdrs/:id/findings

GET    /api/verification/queue
GET    /api/verification/cases/:id
PATCH  /api/verification/cases/:id/decision
POST   /api/verification/cases/:id/findings

GET    /api/passport/:caseId
GET    /api/passport/:caseId/integrity

GET    /api/graph/institution/:id
GET    /api/graph/fdr/:id

GET    /api/renewals
POST   /api/renewals
GET    /api/renewals/:id
PATCH  /api/renewals/:id/status

GET    /api/releases
POST   /api/releases
GET    /api/releases/:id
PATCH  /api/releases/:id/decision

GET    /api/notifications             # institution alerts (mobile app)

GET    /api/reports/export
GET    /api/reports/admin/users
POST   /api/reports/admin/users
PATCH  /api/reports/admin/users/:id
GET    /api/reports/admin/audit-log
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Express server port |
| `MONGODB_URI` | `mongodb://localhost:27017/fdr-sentinel` | MongoDB connection string |
| `JWT_SECRET` | *(change in production)* | JWT signing secret |
| `JWT_EXPIRES_IN` | `7d` | JWT expiration |
| `UPLOAD_DIR` | `./uploads` | Document storage directory |
| `MAX_FILE_SIZE_MB` | `10` | Max upload file size |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:5000/api` | Backend API base URL |

---

## Project Structure

```
fdr-sentinel/
├── backend/
│   ├── server.js               # Express entry point (listens on 0.0.0.0 for mobile connectivity)
│   └── src/
│       ├── config/             # DB, constants
│       ├── middleware/         # auth, rbac, upload, errorHandler
│       ├── models/             # 9 Mongoose schemas
│       ├── routes/             # 11 Express routers (incl. notifications)
│       ├── services/           # complianceEngine, lineageService, graphService, passportService
│       ├── tests/              # Jest unit tests
│       └── utils/              # hash, audit, seed
├── frontend/
│   └── src/
│       ├── api/                # Typed Axios API clients
│       ├── components/         # Layout + reusable UI components
│       ├── pages/              # 17 page components
│       ├── store/              # Zustand auth store
│       ├── types/              # TypeScript interfaces
│       └── utils/              # Formatters, constants
├── mobile/
│   ├── App.tsx                 # Root — bottom tab navigator (Home, FDRs, Upload, Alerts, Profile)
│   ├── app.json                # Expo config (SDK 58)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .npmrc                  # legacy-peer-deps=true (required for SDK 58 + React 19)
│   └── src/
│       ├── api/client.ts       # Axios client — set BASE_URL to your PC's local IP
│       ├── context/            # AuthContext (JWT auth, quick login presets)
│       ├── screens/            # LoginScreen, HomeScreen, FDRListScreen, UploadScreen,
│       │                       # NotificationsScreen, ProfileScreen
│       └── types/              # TypeScript interfaces
└── README.md
```

---

## Security Notes

- Passwords hashed with **bcryptjs** (salt rounds = 12)
- JWT tokens expire in 7 days
- All API routes require authentication
- Institution users are **server-side scoped** to their own institution's data
- File uploads: PDF, JPG, PNG only; max 10MB; stored with UUID filenames
- Rate limiting: 1000 requests / 15 minutes per IP
- Helmet security headers enabled
- Document fingerprints (SHA-256) computed on every uploaded file
- Audit events are **append-only** — no delete route exposed

---

## Disclaimers

- This is a **research prototype** for SIH demonstration purposes
- Document verification is **system-generated** — not independent bank confirmation
- Compliance findings represent rule-based checks, not validated AI predictions
- No real financial accounts or live bank APIs are connected

---

## Running Tests

```bash
cd fdr-sentinel/backend
npm test
```

Tests cover: hash utilities, compliance engine rules, authorization middleware.

---

## Production Build

```bash
# Frontend production build
cd fdr-sentinel/frontend
npm run build
# Output: frontend/dist/

# Backend with PM2
npm install -g pm2
cd fdr-sentinel/backend
pm2 start server.js --name fdr-sentinel-api
```
