# API — REST Contract (v1)

> Base URL: `{EXPO_PUBLIC_API_URL}` = `https://<host>/api` (dev: `http://<LAN-IP>:5000/api`)
> Related: [PRD](PRD.md) · [DATABASE](DATABASE.md) · [ARCHITECTURE](ARCHITECTURE.md)
> Format: JSON · Timestamps: ISO 8601 UTC · IDs: 24-char ObjectId strings.

## Changes vs. the original endpoint list (intentional)

| Original | Change | Reason |
|---|---|---|
| `POST /classes/:id/join` | → **`POST /classes/join`** with `{ joinCode }` | A student only knows the code, not the class id. |
| — | **Added** `DELETE /classes/:id/students/:studentId` | Teacher must be able to remove a student (FR-06). |
| — | **Added** `POST /attendance/manual` | Teacher corrections (FR-12). |
| — | **Added** `GET /attendance/class/:classId/summary` | Per-student percentages for a class (FR-13). |
| `GET /attendance/student/:studentId` | Requires `?classId=` | Ownership check and a meaningful percentage are per class. |

---

## 1. Cross-Cutting Rules

### 1.1 Authentication (JWT)
- Header: `Authorization: Bearer <token>` on every endpoint except `register` and `login`.
- HS256, 7-day expiry, payload `{ sub: userId, role, iat, exp }`.
- On every request the server loads the user and rejects if missing/inactive.

### 1.2 Role-Based Access Control
`authorize('teacher')` / `authorize('student')` middleware. Roles per endpoint are listed below.

### 1.3 Ownership verification (in services)
- Teacher → resource's class must have `teacherId === me`.
- Student → must have an **active** membership in the class.
- Other users' resources return `404 NOT_FOUND` (don't reveal existence) or `403 FORBIDDEN` for wrong-role calls.

### 1.4 Input validation
Zod on body, params, query. Unknown body keys are rejected (`.strict()`). Failures → `400 VALIDATION_ERROR`.

### 1.5 Password hashing
bcryptjs, cost `BCRYPT_ROUNDS` (default 10). Password rules: 8–72 chars, ≥1 letter and ≥1 digit.

### 1.6 Rate limiting
| Scope | Limit |
|---|---|
| Global (per IP) | 100 requests / 15 min |
| `/auth/register`, `/auth/login` (per IP) | 10 / 15 min |
| `POST /attendance/mark` (per user) | 10 / min |
Exceeded → `429 RATE_LIMITED` with `Retry-After`.

### 1.7 Standard response format

Success:
```json
{ "success": true, "data": { }, "meta": { } }
```
`meta` only appears on paginated lists.

Error:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

### 1.8 Pagination
Query: `page` (default 1), `limit` (default 20, max 100). Response `meta`:
```json
{ "page": 1, "limit": 20, "total": 57, "totalPages": 3 }
```

### 1.9 Centralized error handling & codes

| HTTP | Code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body/params/query |
| 400 | `INVALID_SESSION_CODE` | No active session matches the code for that class |
| 401 | `UNAUTHORIZED` | Missing/invalid/expired token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password |
| 403 | `FORBIDDEN` | Wrong role for the endpoint |
| 403 | `NOT_ENROLLED` | Student not a member of the class |
| 403 | `REMOVED_FROM_CLASS` | Student was removed by teacher |
| 404 | `NOT_FOUND` | Resource missing or not visible to caller |
| 404 | `INVALID_JOIN_CODE` | Join code doesn't match an active class |
| 409 | `EMAIL_ALREADY_EXISTS` | Duplicate email |
| 409 | `ALREADY_ENROLLED` | Duplicate membership |
| 409 | `ALREADY_MARKED` | Duplicate attendance |
| 409 | `SESSION_ALREADY_ACTIVE` | Class already has an active session |
| 409 | `SESSION_NOT_ACTIVE` | Ending a session that is already ended |
| 410 | `SESSION_EXPIRED` | Marking after `expiresAt` |
| 429 | `RATE_LIMITED` | Rate limit hit |
| 500 | `INTERNAL_ERROR` | Unexpected error |

### 1.10 Shared DTO shapes

```ts
User      { id, name, email, role, rollNumber?, enrollmentNo?, createdAt }
Class     { id, name, subjectCode, description, joinCode?, teacher?: {id,name}, studentCount?, createdAt }
// joinCode is returned to the owning teacher only.
```

---

## 2. Authentication Module

### 2.1 `POST /api/auth/register`
- **Purpose:** Create an account. **Auth:** none. **Role:** public.
- **Body**
  ```json
  { "name": "Riya Patel", "email": "riya@example.com", "password": "Passw0rd123",
    "role": "student", "rollNumber": "21CE045", "enrollmentNo": "210010107045" }
  ```
- **Validation:** `name` 2–60; `email` valid, lowercased; `password` per 1.5; `role` ∈ {teacher, student}; `rollNumber` required if student (1–30); `enrollmentNo` optional; `rollNumber`/`enrollmentNo` rejected for teachers.
- **201**
  ```json
  { "success": true, "data": { "user": { "id": "665f…b001", "name": "Riya Patel", "email": "riya@example.com", "role": "student", "rollNumber": "21CE045", "enrollmentNo": "210010107045", "createdAt": "2026-11-21T09:00:00.000Z" }, "token": "<jwt>" } }
  ```
- **Errors:** 400 `VALIDATION_ERROR`, 409 `EMAIL_ALREADY_EXISTS`, 429.
- **Rules:** password hashed before save; token returned so the app can log in immediately.

### 2.2 `POST /api/auth/login`
- **Auth:** none. **Body:** `{ "email": "riya@example.com", "password": "Passw0rd123" }`
- **200:** same shape as register (`{ user, token }`).
- **Errors:** 400, 401 `INVALID_CREDENTIALS` (identical for unknown email and wrong password), 429.
- **Rules:** inactive users → `401 INVALID_CREDENTIALS`.

### 2.3 `POST /api/auth/logout`
- **Auth:** required. **Role:** any. **Body:** none.
- **200:** `{ "success": true, "data": { "message": "Logged out" } }`
- **Rules:** stateless; the client deletes the token from SecureStore. No server-side revocation (MVP).

### 2.4 `GET /api/auth/me`
- **Auth:** required. **Role:** any.
- **200:** `{ "success": true, "data": { "user": { …User } } }`
- **Errors:** 401.

---

## 3. Classes Module

### 3.1 `POST /api/classes`
- **Role:** teacher.
- **Body:** `{ "name": "Data Structures — Section A", "subjectCode": "CS301", "description": "Mon/Wed/Fri 10:00" }`
- **Validation:** `name` 2–80; `subjectCode` 2–20 `[A-Za-z0-9-]` (uppercased); `description` ≤ 500 optional.
- **201:** `{ "data": { "class": { "id": "…c001", "name": "…", "subjectCode": "CS301", "description": "…", "joinCode": "K7MX4P", "studentCount": 0, "createdAt": "…" } } }`
- **Errors:** 400, 401, 403.
- **Rules:** `teacherId = me`; unique `joinCode` generated server-side.

### 3.2 `GET /api/classes`
- **Role:** teacher **or** student (results differ by role).
- **Query:** `page`, `limit`.
- **Teacher:** own active classes (with `joinCode`, `studentCount`). **Student:** classes with an active membership (no `joinCode`; includes `teacher: {id, name}`).
- **200:** `{ "data": { "classes": [ … ] }, "meta": { "page":1, "limit":20, "total":3, "totalPages":1 } }`
- **Rules:** soft-deleted classes excluded; sorted by `createdAt` desc.

### 3.3 `GET /api/classes/:id`
- **Role:** teacher (owner) or student (active member).
- **200 (teacher):**
  ```json
  { "success": true, "data": { "class": { "id": "…c001", "name": "…", "subjectCode": "CS301", "description": "…", "joinCode": "K7MX4P", "studentCount": 42,
      "activeSession": { "id": "…e002", "startedAt": "…", "expiresAt": "…", "sessionCode": "482913" } } } }
  ```
- **200 (student):** same fields **without** `joinCode`, with `teacher`, and `activeSession: { id, startedAt, expiresAt }` (**never** `sessionCode`) or `null`.
- **Errors:** 401, 403 (`REMOVED_FROM_CLASS` for removed students), 404.
- **Rules:** performs lazy expiry — an active session past `expiresAt` is closed and reported as `null`.

### 3.4 `PUT /api/classes/:id`
- **Role:** teacher (owner). **Body:** any of `name`, `subjectCode`, `description` (at least one).
- **200:** `{ "data": { "class": { … } } }`. **Errors:** 400, 401, 403, 404.
- **Rules:** `joinCode` and `teacherId` cannot be changed.

### 3.5 `DELETE /api/classes/:id`
- **Role:** teacher (owner).
- **200:** `{ "data": { "message": "Class deleted" } }`. **Errors:** 401, 403, 404.
- **Rules:** soft delete (`isActive=false`, `deletedAt`); active session ended with `endReason='class_deleted'`; attendance retained.

### 3.6 `POST /api/classes/join`
- **Role:** student. **Body:** `{ "joinCode": "K7MX4P" }` (case-insensitive, 6 chars).
- **201:** `{ "data": { "class": { "id": "…", "name": "…", "subjectCode": "…", "teacher": { "id": "…", "name": "…" } }, "joinedAt": "…" } }`
- **Errors:** 400, 401, 403 (`REMOVED_FROM_CLASS`), 404 `INVALID_JOIN_CODE`, 409 `ALREADY_ENROLLED`.
- **Rules:** membership `active`, `joinedAt=now`.
- **Route order:** declare `/classes/join` before any `/:id` route.

### 3.7 `GET /api/classes/:id/students`
- **Role:** teacher (owner). **Query:** `page`, `limit`, `search` (name or roll number, optional).
- **200:**
  ```json
  { "success": true, "data": { "students": [ { "id": "…b001", "name": "Riya Patel", "email": "riya@example.com", "rollNumber": "21CE045", "enrollmentNo": "210010107045", "joinedAt": "…" } ] },
    "meta": { "page":1, "limit":20, "total":42, "totalPages":3 } }
  ```
- **Errors:** 401, 403, 404. **Rules:** active members only; sorted by `rollNumber`.

### 3.8 `DELETE /api/classes/:id/students/:studentId`
- **Role:** teacher (owner).
- **200:** `{ "data": { "message": "Student removed" } }`. **Errors:** 401, 403, 404 (no active membership).
- **Rules:** membership `status='removed'`, `removedAt`, `removedBy`. History kept. Student cannot rejoin.

---

## 4. Attendance Sessions Module

### 4.1 `POST /api/sessions/start`
- **Role:** teacher (owner of class).
- **Body:** `{ "classId": "…c001", "durationMinutes": 10, "title": "Lecture 14" }` (`durationMinutes` optional, int 1–60, default 10; `title` optional ≤ 80).
- **201**
  ```json
  { "success": true, "data": { "session": {
      "id": "…e002", "classId": "…c001", "title": "Lecture 14",
      "sessionCode": "482913", "status": "active",
      "startedAt": "2026-11-23T04:30:00.000Z", "expiresAt": "2026-11-23T04:40:00.000Z",
      "durationMinutes": 10, "qrPayload": "{\"v\":1,\"classId\":\"…c001\",\"code\":\"482913\"}",
      "serverTime": "2026-11-23T04:30:00.412Z" } } }
  ```
- **Errors:** 400, 401, 403, 404 (class), 409 `SESSION_ALREADY_ACTIVE`.
- **Rules:** expired-but-unclosed sessions are closed first; the partial unique index prevents concurrent duplicates. `serverTime` lets the client correct clock skew for its countdown.

### 4.2 `GET /api/sessions`
- **Role:** teacher or student.
- **Query:** `classId` (**required**), `status` (`active|ended`, optional), `page`, `limit`.
- **Teacher (owner):** sessions with `sessionCode` only while active; includes `presentCount`.
- **Student (active member):** sessions **without** `sessionCode`, `presentCount`, or roster; includes `myStatus: 'present'|'absent'|null` (null for active sessions).
- **200:** `{ "data": { "sessions": [ { "id":"…", "title":"…", "startedAt":"…", "expiresAt":"…", "status":"ended", "endReason":"expired", "presentCount": 31 } ] }, "meta": { … } }`
- **Errors:** 400, 401, 403, 404. **Rules:** `status` in responses reflects lazy expiry (a past-`expiresAt` session is returned as `ended`).

### 4.3 `GET /api/sessions/:id`
- **Role:** teacher (owner) or student (active/past member of that class).
- **200 (teacher):** full session (as 4.1 minus `qrPayload`/`serverTime` unless active) + `presentCount`, `totalStudents`.
- **200 (student):** `{ id, classId, title, startedAt, expiresAt, status, myStatus }` — **no code**.
- **Errors:** 401, 403, 404. **Rules:** lazy expiry applied.

### 4.4 `POST /api/sessions/:id/end`
- **Role:** teacher (owner). **Body:** none.
- **200:** `{ "data": { "session": { "id":"…", "status":"ended", "endedAt":"…", "endReason":"manual", "presentCount": 31 } } }`
- **Errors:** 401, 403, 404, 409 `SESSION_NOT_ACTIVE`.

---

## 5. Attendance Module

### 5.1 `POST /api/attendance/mark`
- **Role:** student. **Rate limit:** 10/min per user.
- **Body:** `{ "classId": "…c001", "sessionCode": "482913" }` (`sessionCode` exactly 6 digits).
- **201**
  ```json
  { "success": true, "data": { "attendance": { "id": "…f001", "sessionId": "…e002", "classId": "…c001", "status": "present", "method": "code", "markedAt": "2026-11-23T04:32:10.000Z" } } }
  ```
- **Errors:** 400 `VALIDATION_ERROR` / `INVALID_SESSION_CODE`, 401, 403 `NOT_ENROLLED` / `REMOVED_FROM_CLASS`, 404 (class), 409 `ALREADY_MARKED`, 410 `SESSION_EXPIRED`, 429.
- **Rules (checked in this order):** class active → active membership → active session exists → not expired (else close it, `410`) → code matches → insert (unique index handles races). Response never reveals the correct code.

### 5.2 `POST /api/attendance/manual`
- **Role:** teacher (owner of the session's class).
- **Body:** `{ "sessionId": "…e002", "studentId": "…b001", "status": "present" }` (`status` ∈ present|absent).
- **200 (upsert):** `{ "data": { "attendance": { "id":"…", "sessionId":"…", "studentId":"…", "status":"absent", "method":"manual", "markedAt":"…" } } }`
- **Errors:** 400, 401, 403, 404 (session or active member not found).
- **Rules:** allowed even if the session has ended; student must be an **active** member; sets `method='manual'`, `markedBy=teacherId`; `classId` copied from the session.

### 5.3 `GET /api/attendance/session/:sessionId`
- **Role:** teacher (owner). **Query:** `page`, `limit`.
- **200**
  ```json
  { "success": true, "data": {
      "session": { "id":"…e001", "title":"Lecture 14", "startedAt":"…", "status":"ended" },
      "counts": { "present": 31, "absent": 11, "total": 42 },
      "roster": [ { "studentId":"…b001", "name":"Riya Patel", "rollNumber":"21CE045", "status":"present", "method":"code", "markedAt":"…" },
                  { "studentId":"…b002", "name":"Amit Shah", "rollNumber":"21CE046", "status":"absent", "method":null, "markedAt":null } ] },
    "meta": { … } }
  ```
- **Errors:** 401, 403, 404.
- **Rules:** roster = active members ∪ students who have a record for this session; students without a record are `absent`.

### 5.4 `GET /api/attendance/class/:classId/summary`
- **Role:** teacher (owner). **Query:** `page`, `limit`.
- **200**
  ```json
  { "success": true, "data": {
      "classId": "…c001", "totalSessions": 14, "warningThreshold": 75,
      "students": [ { "studentId":"…b001", "name":"Riya Patel", "rollNumber":"21CE045", "totalSessions": 14, "presentCount": 12, "percentage": 85.7, "belowThreshold": false } ] },
    "meta": { … } }
  ```
- **Errors:** 401, 403, 404.
- **Rules:** per-student `totalSessions` counts completed sessions with `startedAt >= joinedAt`; `percentage` is `null` when `totalSessions=0`; sorted by `rollNumber`.

### 5.5 `GET /api/attendance/student/:studentId?classId=…`
- **Role:** teacher (owner of `classId`; student must be/have been a member). **Query:** `classId` (required), `page`, `limit`.
- **200**
  ```json
  { "success": true, "data": {
      "student": { "id":"…b001", "name":"Riya Patel", "rollNumber":"21CE045" },
      "summary": { "totalSessions": 14, "presentCount": 12, "percentage": 85.7, "belowThreshold": false },
      "history": [ { "sessionId":"…e001", "title":"Lecture 14", "startedAt":"…", "status":"present", "method":"code" },
                   { "sessionId":"…e000", "title":"Lecture 13", "startedAt":"…", "status":"absent", "method":null } ] },
    "meta": { … } }
  ```
- **Errors:** 400 (missing `classId`), 401, 403, 404.
- **Rules:** history lists completed sessions since `joinedAt`, newest first; `absent` is derived when no `present` record exists.

### 5.6 `GET /api/attendance/my`
- **Role:** student.
- **Without `classId`:** summary across all joined classes.
  ```json
  { "success": true, "data": { "warningThreshold": 75, "classes": [
      { "classId":"…c001", "name":"Data Structures — Section A", "subjectCode":"CS301", "totalSessions":14, "presentCount":12, "percentage":85.7, "belowThreshold":false } ] } }
  ```
- **With `?classId=…` (+ `page`, `limit`):** same `summary` + `history` shape as 5.5 for the caller.
- **Errors:** 401, 403, 404 (class not joined).
- **Rules:** same percentage logic as 5.4/5.5 so teacher and student always agree.

---

## 6. Endpoint Index (matches PRD & DATABASE)

| Method | Path | Role |
|---|---|---|
| POST | `/auth/register` | public |
| POST | `/auth/login` | public |
| POST | `/auth/logout` | any |
| GET | `/auth/me` | any |
| POST | `/classes` | teacher |
| GET | `/classes` | teacher / student |
| GET | `/classes/:id` | teacher / student |
| PUT | `/classes/:id` | teacher |
| DELETE | `/classes/:id` | teacher |
| POST | `/classes/join` | student |
| GET | `/classes/:id/students` | teacher |
| DELETE | `/classes/:id/students/:studentId` | teacher |
| POST | `/sessions/start` | teacher |
| GET | `/sessions` | teacher / student |
| GET | `/sessions/:id` | teacher / student |
| POST | `/sessions/:id/end` | teacher |
| POST | `/attendance/mark` | student |
| POST | `/attendance/manual` | teacher |
| GET | `/attendance/session/:sessionId` | teacher |
| GET | `/attendance/class/:classId/summary` | teacher |
| GET | `/attendance/student/:studentId` | teacher |
| GET | `/attendance/my` | student |

Also: `GET /health` → `{ "status": "ok" }` (no auth, not under `/api` rate limits) for deployment checks.

## 7. Contract Change Policy
Never change a request/response shape, status code, or error code without updating this file **and** DATABASE.md/PRD.md in the same change, and recording it in TASKS.md.
