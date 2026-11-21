# TECH_STACK — Teacher–Student Attendance Management App

> Last verified: **21 Nov 2026** against official release pages (Expo changelog, nodejs.org, expressjs.com, Mongoose changelog, TypeScript blog).
> Rule for agents: **never invent a version.** Where an exact patch is not listed below, resolve it with `npm view <pkg> version` (or `npx expo install`) at install time, then let `package-lock.json` pin it.

---

## 1. Version Requirements

| Tool | Version to use | Verified source / note |
|---|---|---|
| **Node.js** | **26.x LTS ("Lithium")** — latest seen 26.13.1 (security release, Nov 2026). Fallback: 24.x LTS | Node 26 entered LTS on 28 Oct 2026, supported to Apr 2029. Node 22 is Maintenance only. |
| **npm** | The version bundled with Node (check `npm -v`) | Do not pin separately. |
| **Expo SDK** | **SDK 58** (stable) | Ships React Native **0.88**. SDK 57 (RN 0.86.x, use `expo@57.0.17` or later) is the fallback. |
| **React Native** | Whatever SDK 58 pins (**0.88**) | Install only via `npx expo install`, never by hand. |
| **React** | Whatever SDK 58 pins (SDK 56/57 used 19.2) | Install via `npx expo install react react-native`. |
| **TypeScript (mobile)** | The version pinned by `create-expo-app` / `npx expo install typescript` | Expo controls this. |
| **TypeScript (backend)** | **6.x** (conservative, widest tooling support) | TS 6.0 shipped Mar 2026; TS 7.0 (native Go port) shipped Jul 2026. Adopt 7.x later after confirming `tsx`, Vitest, ESLint compatibility. |
| **Express** | **5.x** (`express@5`) | Default `latest` on npm since 5.1.0. Async errors auto-forwarded. |
| **Mongoose** | **9.x** (9.9.x seen Aug 2026) | Bundles MongoDB Node driver 7.x. No callback-style hooks. |
| **MongoDB** | Atlas (free M0 for dev) | Allow-list your IP in Atlas Network Access. |

### Expo Go caution (read before Phase 0)
The App Store / Play Store build of **Expo Go updates to a new SDK only shortly after its stable release**. Before scaffolding, open Expo Go on your phone and confirm it supports SDK 58. If it only supports SDK 57, scaffold with SDK 57 (`npx create-expo-app@latest` then `npx expo install expo@^57`) or use a development build. Run `npx expo-doctor@latest` after scaffolding; if it reports a Node incompatibility, switch to Node 24 LTS.

### Express 5 gotchas (agents must follow)
- Route wildcards must be named (`/files/*splat`), optional params use `{/:id}`.
- `req.query` is a read-only getter: **do not reassign it** in validation middleware; store parsed data on `res.locals.validated` (or `req.validated`).
- Async handlers may `throw`; the error reaches the central error middleware automatically.
- Invalid HTTP status codes throw.

### Mongoose 9 gotchas
- Hooks use async functions/promises only (no `next` callbacks, no `promiseOrCallback`).
- Use the `Types.ObjectId` helpers and `HydratedDocument` typings; define interfaces separately from schemas.

---

## 2. Stack Overview

### Mobile (`/mobile`)
Expo SDK 58 · React Native · TypeScript (strict) · Expo Router (file-based) · Expo SecureStore · Axios · Zustand · React Hook Form + Zod.

### Backend (`/backend`)
Node.js 26 LTS · Express 5 · TypeScript · Mongoose 9 · JWT (`jsonwebtoken`) · `bcryptjs` · Zod · Helmet · CORS · `express-rate-limit` · dotenv.

### Database
MongoDB Atlas · Mongoose schemas · explicit indexes (see DATABASE.md).

### Communication
**REST over HTTP only.** Mobile → Axios → Express → Mongoose → Atlas. No WebSockets, Socket.IO, SSE, or Firebase Realtime.

---

## 3. Package Evaluation

### 3.1 Mobile

| Package | Needed? | Why / Where |
|---|---|---|
| `expo`, `react`, `react-native` | **Required** | Core. Install only via template / `npx expo install`. |
| `expo-router` | **Required** | File-based navigation; `(auth)`, `(teacher)`, `(student)` route groups; role-based redirects in root `_layout.tsx`. |
| `typescript`, `@types/react` | **Required (dev)** | Strict typing. |
| `expo-secure-store` | **Required** | Stores the JWT (`services/tokenStorage.ts`). Never AsyncStorage. |
| `axios` | **Required** | Single configured instance (`services/api.ts`), request interceptor adds `Authorization`, response interceptor handles `401` (clear token → login). |
| `zustand` | **Required** | Small auth store (`user`, `token`, `status`) and nothing else global. Server data is fetched per screen. |
| `react-hook-form` | **Required** | Forms: register, login, create/edit class, join class, start session. |
| `zod` + `@hookform/resolvers` | **Required** | Client-side validation mirroring backend rules. |
| `@expo/vector-icons` | **Required** (usually in template) | Icons (Ionicons). Install with `npx expo install @expo/vector-icons` if missing. |
| `expo-camera` | **Optional (last MVP item)** | Scan the teacher's static QR on the Mark Attendance screen. Manual code entry is the baseline and must work without it. Use `CameraView` API, not the removed legacy `Camera` component. |
| `react-native-qrcode-svg` + `react-native-svg` | **Optional (last MVP item)** | Render the session QR on the teacher's session screen. Install `react-native-svg` via `npx expo install`. |
| `expo-location` | **Not used in MVP** | Reserved for future geofence. Do not install. |
| `expo-image-picker` | **Not used in MVP** | No image upload. Do not install. |
| `expo-notifications` | **Not used in MVP** | Real-time/push notifications are out of scope. Do not install. |
| `@react-native-async-storage/async-storage` | **Forbidden for tokens** | Do not install unless a future non-sensitive need appears. |

### 3.2 Backend

| Package | Needed? | Why / Where |
|---|---|---|
| `express` (v5) | **Required** | HTTP server and routing. |
| `mongoose` (v9) | **Required** | ODM, schemas, indexes. |
| `jsonwebtoken` | **Required** | Sign/verify JWT in `utils/jwt.ts` and `middleware/auth.ts`. |
| `bcryptjs` | **Required** | Password hashing (pure JS, no native build issues on any OS). Cost 10–12 via `BCRYPT_ROUNDS`. Note: bcrypt truncates input at 72 bytes, so password max length is 72. |
| `zod` | **Required** | Request validation schemas in `validators/`. Also used for env validation in `config/env.ts`. |
| `helmet` | **Required** | Security headers. |
| `cors` | **Required** | Allow-list from `CORS_ORIGINS`. Native mobile requests are not subject to browser CORS, but keep it for any web tooling. |
| `express-rate-limit` | **Required** | Global limiter + stricter limiters for auth and mark-attendance. |
| `dotenv` | **Required (dev convenience)** | Loads `.env` locally. (Node also supports `--env-file`; we use dotenv for simplicity and tooling compatibility.) |
| `morgan` | Optional | Request logging in development only. |
| `tsx` | **Required (dev)** | Run TypeScript in development with watch (`tsx watch src/server.ts`). |
| `typescript` (6.x), `@types/node`, `@types/express`, `@types/cors`, `@types/jsonwebtoken`, `@types/bcryptjs`* | **Required (dev)** | Types. *`bcryptjs` may ship its own types in recent versions; install `@types/*` only if `tsc` complains. |
| `vitest`, `supertest`, `@types/supertest`, `mongodb-memory-server` | **Required (dev) from Phase 8** | Unit + API tests against an in-memory MongoDB. |
| `eslint`, `prettier` | Optional | Style. Add only if the team wants enforcement. |
| `socket.io`, `ws`, any SSE lib, `firebase` | **Forbidden** | REST-only rule. |
| `express-validator`, `joi`, `yup` | **Avoid** | Zod is the single validation library. |
| `body-parser` | **Avoid** | Express 5 has `express.json()` built in. |
| `nodemon`, `ts-node` | **Avoid** | Replaced by `tsx`. |

---

## 4. Installation Commands (reference; run during Phase 0 and later)

### Mobile
```bash
# From repo root
npx create-expo-app@latest mobile        # default template includes Expo Router + TypeScript
cd mobile

# Core runtime deps (use expo install so versions match the SDK)
npx expo install expo-secure-store @expo/vector-icons

# JS libraries (not SDK-pinned)
npm install axios zustand react-hook-form zod @hookform/resolvers

# Optional, last MVP item
npx expo install expo-camera react-native-svg
npm install react-native-qrcode-svg

npx expo-doctor@latest                   # must pass before moving on
```

### Backend
```bash
mkdir backend && cd backend
npm init -y
npm install express@5 mongoose jsonwebtoken bcryptjs zod helmet cors express-rate-limit dotenv
npm install -D typescript@6 tsx @types/node @types/express @types/cors @types/jsonwebtoken
# Add from Phase 8:
npm install -D vitest supertest @types/supertest mongodb-memory-server
```

> After installing, record the resolved versions in a short "Resolved versions" table at the bottom of this file (agents update it; it replaces guessing).

### Dependency Categories
- **Production (backend):** express, mongoose, jsonwebtoken, bcryptjs, zod, helmet, cors, express-rate-limit, dotenv.
- **Development (backend):** typescript, tsx, @types/*, vitest, supertest, mongodb-memory-server.
- **Production (mobile):** expo, react, react-native, expo-router, expo-secure-store, axios, zustand, react-hook-form, zod, @hookform/resolvers, @expo/vector-icons (+ optional camera/QR packages).
- **Development (mobile):** typescript, @types/react.

---

## 5. Environment & Configuration

### Backend `.env.example`
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>?retryWrites=true&w=majority
JWT_SECRET=replace-with-at-least-32-random-characters
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CORS_ORIGINS=http://localhost:8081
```

### Mobile `.env.example`
```
# EXPO_PUBLIC_* values are bundled into the app and are PUBLIC. Never put secrets here.
EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
```

- A phone cannot reach `localhost`; use the laptop's LAN IP and keep both on the same Wi-Fi.
- Separate dev/production configs: `.env` (local, git-ignored), `.env.production` values set in the hosting dashboard / EAS secrets. Production API must be **HTTPS**.
- `config/env.ts` (backend) validates env with Zod at startup and exits on failure.

---

## 6. Security Restrictions (hard rules)

1. Never store auth tokens in AsyncStorage. Use Expo SecureStore.
2. Never expose backend secrets in the mobile app; no secret may use the `EXPO_PUBLIC_` prefix.
3. Never hardcode API URLs or secrets; read from env (mobile: one `constants/config.ts` reading `process.env.EXPO_PUBLIC_API_URL`).
4. Never commit `.env` files; commit only `.env.example`.
5. Never log passwords, tokens, or full request bodies for auth routes.
6. Pin nothing "by hand" that Expo manages; use `npx expo install`.

## 7. Deprecated / Avoid List

- Legacy `Camera` component of `expo-camera` → use `CameraView`.
- `ts-node`, `nodemon`, `body-parser`, Express 4 patterns (`/*` wildcards, `:id?`).
- Mongoose callback hooks / callbacks in queries.
- `bcrypt` native module (use `bcryptjs`).
- Unpinned `latest` in `package.json` for Expo-managed packages.

---

## 8. Resolved versions (agents fill in after Phase 0)

| Package | Resolved version |
|---|---|
| node | 26.10.0 |
| expo | 58.0.26 |
| react-native | 0.88.1 |
| express | 5.3.0 |
| mongoose | 9.12.3 |
| typescript (backend) | 6.0.3 |
| typescript (mobile) | 6.0.3 |
