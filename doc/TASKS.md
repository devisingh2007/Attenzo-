# TASKS — Development Roadmap

> Rule: tick a box **only** after the task is implemented **and verified**. One phase at a time; get owner approval before starting the next.
> Related: [PRD](PRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DATABASE](DATABASE.md) · [API](API.md) · [DESIGN](DESIGN.md) · [AGENTS](AGENTS.md)

**Order of work:** Setup → Backend foundation → Database → Auth → Classes → Attendance (all backend, tested with Postman/Thunder Client) → Mobile UI → API integration → Testing → Final MVP.

**Change log (agents append here when a contract changes):**
_No changes yet._

---

## Phase 0: Project Setup
**Objective:** Working skeleton for backend and mobile, tooling verified.
**Dependencies:** None.

- [ ] Documentation review (owner + agent read all 8 files; open questions resolved)
- [ ] Verify Expo Go on the phone supports the chosen Expo SDK (see TECH_STACK "Expo Go caution")
- [ ] Initialize backend (`package.json`, `tsconfig.json` strict, folder structure per ARCHITECTURE §13)
- [ ] Initialize Expo mobile app (`create-expo-app`, Expo Router, TypeScript)
- [ ] Configure TypeScript (strict) in both projects
- [ ] Configure environment variables (`.env.example` in both; Zod-validated `config/env.ts` in backend)
- [ ] Configure Git (`.gitignore` covers `.env`, `node_modules`, `dist`, `.expo`)
- [ ] MongoDB Atlas cluster created, IP allow-listed, `MONGODB_URI` in local `.env`
- [ ] Add npm scripts and update AGENTS.md §7 table to match
- [ ] Record resolved versions in TECH_STACK §8

**Acceptance criteria:** `npm run dev` starts backend; `GET /health` returns `{status:"ok"}`; `npx expo start` opens the app on a real phone via Expo Go; `npx expo-doctor` passes; no secrets in Git.
**Testing:** run both; call `/health` from the phone's browser using the laptop LAN IP.

---

## Phase 1: Backend Foundation
**Objective:** Production-style Express 5 app shell.
**Dependencies:** Phase 0.

- [ ] Express server (`app.ts` + `server.ts` split)
- [ ] MongoDB connection (`config/db.ts`, fail-fast on error)
- [ ] Error handling (`ApiError`, `errorHandler`, `notFound`, duplicate-key mapping, response helpers)
- [ ] Validation middleware (`validate` using Zod; does not reassign `req.query`)
- [ ] Security middleware (Helmet, CORS allow-list, `express.json({limit:'10kb'})`, global rate limiter)
- [ ] Route index mounted at `/api`; `/health` outside `/api`

**Acceptance criteria:** unknown route → standard `404` JSON; invalid body → `400 VALIDATION_ERROR` with `details`; thrown error → `500` with no stack in production; rate limit returns `429`.
**Testing:** manual requests; temporary test route removed afterwards.

---

## Phase 2: Database
**Objective:** All models and indexes per DATABASE.md.
**Dependencies:** Phase 1.

- [ ] User model (role-conditional `rollNumber`, `select:false` hash, `toJSON` cleanup)
- [ ] Class model
- [ ] ClassMembership model
- [ ] AttendanceSession model (incl. partial unique active-session index)
- [ ] Attendance model
- [ ] Database indexes (verify with `getIndexes()` against DATABASE §11)
- [ ] Utilities: `joinCode`, `sessionCode` (crypto-based), `percentage`

**Acceptance criteria:** duplicate (session, student) insert fails with `11000`; duplicate (class, student) membership fails; second active session for a class fails; indexes match the documented list.
**Testing:** small script/test inserting valid and invalid documents.

---

## Phase 3: Authentication
**Objective:** Register, login, JWT, RBAC.
**Dependencies:** Phase 2.

- [ ] Registration (`POST /auth/register`)
- [ ] Login (`POST /auth/login`, identical error for bad email/password)
- [ ] Password hashing (bcryptjs, cost from env, 72-char max)
- [ ] JWT authentication (`authenticate` middleware, user re-checked each request)
- [ ] Role-based authorization (`authorize`)
- [ ] Current user API (`GET /auth/me`)
- [ ] Logout endpoint (`POST /auth/logout`, stateless)
- [ ] Auth rate limiter (10 / 15 min / IP)

**Acceptance criteria:** all AC-AUTH items in PRD pass; `passwordHash` never appears in any response; expired/invalid token → `401 UNAUTHORIZED`; student calling a teacher route → `403 FORBIDDEN`.
**Testing:** Postman collection for happy path + each error; verify hash stored in DB is not the raw password.

---

## Phase 4: Class Management
**Objective:** Full class lifecycle.
**Dependencies:** Phase 3.

- [ ] Create class (`POST /classes`)
- [ ] List classes (`GET /classes`, role-specific, paginated)
- [ ] View class details (`GET /classes/:id`, role-specific payload, `activeSession` w/o code for students)
- [ ] Update class (`PUT /classes/:id`)
- [ ] Delete class (soft, `DELETE /classes/:id`)
- [ ] Join class (`POST /classes/join`)
- [ ] Student management: list students (`GET /classes/:id/students`) and remove student (`DELETE /classes/:id/students/:studentId`)

**Acceptance criteria:** all AC-CLASS items pass; teacher B cannot see/modify teacher A's class; `joinCode` never returned to students; soft-deleted class absent from lists but rows remain.
**Testing:** two teachers + two students scenario in Postman; race test: join twice in parallel → one `201`, one `409`.

---

## Phase 5: Attendance
**Objective:** Sessions, marking, manual corrections, views, percentages.
**Dependencies:** Phase 4.

- [ ] Start attendance session (`POST /sessions/start`, lazy-closes expired session, `serverTime`, `qrPayload`)
- [ ] List/view sessions (`GET /sessions`, `GET /sessions/:id`, role-specific, lazy expiry)
- [ ] Mark attendance (`POST /attendance/mark`, ordered checks, per-user rate limiter)
- [ ] Prevent duplicate attendance (unique index + `409 ALREADY_MARKED` mapping)
- [ ] End attendance session (`POST /sessions/:id/end`)
- [ ] Manual marking (`POST /attendance/manual`, upsert, active members only)
- [ ] View attendance records (`GET /attendance/session/:id`, `/attendance/class/:id/summary`, `/attendance/student/:id?classId=`)
- [ ] Student views (`GET /attendance/my`, with and without `classId`)
- [ ] Calculate attendance percentage (completed sessions since `joinedAt`; teacher and student results identical)

**Acceptance criteria:** all AC-SESSION, AC-MARK, AC-PERCENT items pass; `sessionCode` never reaches a student; marking after `expiresAt` → `410` even if no one ended the session; a student who joined after a session does not get it counted against them.
**Testing:** scripted scenario (3 sessions, 4 students, one late joiner, one removed student, one manual correction) with expected percentages written down beforehand; parallel double-mark test.

---

## Phase 6: Mobile UI (static / mocked data)
**Objective:** All screens from DESIGN.md with correct states, before wiring the API.
**Dependencies:** Phase 0 (can start after Phase 3 if the owner prefers).

- [ ] Theme tokens (`constants/theme.ts`) and shared components (PrimaryButton, SecondaryButton, InputField, AppHeader, ClassCard, StudentCard, AttendanceCard, StatusBadge, LoadingIndicator, EmptyState, ErrorState, ConfirmationModal)
- [ ] Authentication screens (Login, Register with role-conditional fields)
- [ ] Teacher dashboard
- [ ] Student dashboard
- [ ] Class screens (Create Class, Class Details, Student List, Join Class, My Classes)
- [ ] Attendance screens (Start Attendance, Attendance Session, Attendance History, Mark Attendance, Attendance Percentage)
- [ ] Profile and Settings screens (both roles)
- [ ] Loading, empty, error, disabled states on every screen

**Acceptance criteria:** every screen in DESIGN §4–5 exists and matches tokens; navigation matches the Mermaid flow; works on a small Android phone and an iPhone-size screen.
**Testing:** visual walkthrough on a real phone via Expo Go; TypeScript clean.

---

## Phase 7: REST API Integration
**Objective:** Replace mocks with real calls; secure token handling.
**Dependencies:** Phases 5 and 6.

- [ ] Axios configuration (`services/api.ts`, base URL from `EXPO_PUBLIC_API_URL`, timeout, interceptors)
- [ ] API service layer (`authService`, `classService`, `sessionService`, `attendanceService`)
- [ ] Authentication integration (register, login, bootstrap via `/auth/me`)
- [ ] Secure token management (SecureStore only; clear on `401`)
- [ ] Role-based navigation (root `_layout` redirects)
- [ ] Loading and error handling (normalized errors, field-level `details`, offline message)
- [ ] Fetch-on-focus and pull-to-refresh (no polling timers)
- [ ] Local countdown from `expiresAt` + `serverTime` offset
- [ ] **Last MVP item (optional):** session QR display (teacher) and QR scan (student, `CameraView`) — manual code entry remains the baseline

**Acceptance criteria:** full end-to-end flow on real phones: teacher registers → creates class → student joins → teacher starts session → student marks → teacher sees roster → both see matching percentages; app restart keeps the user logged in; logout clears the token.
**Testing:** two physical devices (or one device + emulator) on the same network; verify token is in SecureStore, not AsyncStorage (code search).

---

## Phase 8: Testing
**Objective:** Automated safety net and security review.
**Dependencies:** Phases 5 and 7.

- [ ] Backend tests (Vitest): services — percentage, expiry, ownership, code generation
- [ ] API tests (Supertest + mongodb-memory-server): every endpoint, every documented error code
- [ ] Database tests: unique/partial indexes, race conditions (parallel marks/joins/starts)
- [ ] Mobile tests: key units (validators, formatters, auth store); manual E2E checklist for screens
- [ ] Security testing: role bypass attempts, accessing other teachers'/students' data, token tampering/expiry, NoSQL injection payloads, rate-limit behavior, confirm no `sessionCode`/`passwordHash` leaks
- [ ] Edge cases: session expires mid-request, removed student marking, class deleted during session, student joins mid-semester, zero-session percentage (`null`), clock skew in countdown

**Acceptance criteria:** all tests pass; every error code in API §1.9 is exercised at least once; no high-severity findings open.
**Testing:** `npm test` (backend) and recorded manual checklist for mobile.

---

## Phase 9: Final MVP
**Objective:** Stable, documented, deployable MVP.
**Dependencies:** Phase 8.

- [ ] Bug fixing (from testing and a pilot dry run)
- [ ] Performance improvements (verify indexes used via `explain()`, response times at 200 students)
- [ ] Final documentation review (all 8 files consistent with the code; TECH_STACK §8 versions filled; Change log complete)
- [ ] Deployment preparation (production env vars, HTTPS API host, Atlas production network rules, `autoIndex` off + index script, EAS/Expo build plan)
- [ ] Pilot checklist: one real class (≥ 20 students) for 2 weeks; collect feedback against PRD §14 metrics

**Acceptance criteria:** PRD MVP features all work end-to-end; success metrics measurable; documentation matches reality; no open critical bugs.
**Testing:** full regression run + pilot dry run.

---

## Post-MVP backlog (NOT started without approval)
Rotating QR · geofence · device binding · CSV/PDF export · push notifications · disputes · late status · password reset/email verification · admin role · dark mode · bunk calculator.
