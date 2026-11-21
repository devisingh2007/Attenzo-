# PRD — Teacher–Student Attendance Management App

> Status: Draft v1.0 · Last reviewed: 21 Nov 2026
> Related: [TECH_STACK](TECH_STACK.md) · [ARCHITECTURE](ARCHITECTURE.md) · [DATABASE](DATABASE.md) · [API](API.md) · [DESIGN](DESIGN.md) · [AGENTS](AGENTS.md) · [TASKS](TASKS.md)

---

## 1. Product Overview

A cross-platform mobile app (React Native + Expo) where **teachers** create classes and run timed attendance sessions, and **students** join classes, mark their own attendance with a session code, and track their attendance percentage. All communication is **REST over HTTP only**.

## 2. Problem Statement

Taking attendance on paper or in spreadsheets is slow, error-prone, and hard to audit. Teachers lose class time, records get lost, and students cannot see how close they are to attendance thresholds until it is too late.

This app moves attendance to the phone. A teacher opens a short-lived session and shares a code; students mark themselves present within the window; both sides can review accurate history and percentages at any time.

## 3. Product Vision

The simplest reliable way for a teacher to take attendance in under a minute and for a student to always know where they stand.

## 4. Product Objectives

1. A teacher can start a session and complete attendance for a class in under 1 minute.
2. A student can mark attendance in under 15 seconds.
3. No duplicate attendance records; no access to other users' data.
4. Attendance percentage is always correct and consistent between teacher and student views.
5. A solid, maintainable foundation that later phases (QR rotation, geofencing, exports) can extend.

## 5. Target Users

| User | Description |
|---|---|
| Teacher | School/college/coaching instructor managing one or more classes of 10–200 students |
| Student | Learner enrolled in one or more classes, using their own smartphone |

## 6. User Roles

Exactly two roles. **No Admin role** in the MVP (needs explicit approval to add).

**Teacher** — register/login; create, edit, soft-delete own classes; view enrolled students; remove a student; start/end sessions; manually mark a student present/absent; view session, class, and per-student attendance.

**Student** — register/login; join classes with a class code; view enrolled classes and details; mark attendance via a session code; view personal history and percentage.

## 7. Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | Users register with a role (teacher/student) and log in with email + password. |
| FR-02 | Authenticated session persists across app restarts using a JWT held in Expo SecureStore. |
| FR-03 | Teacher creates a class (name, subject code, optional description); system generates a unique 6-character join code. |
| FR-04 | Teacher edits class details and soft-deletes a class. |
| FR-05 | Student joins a class by entering its join code; duplicate joins are rejected. |
| FR-06 | Teacher views enrolled students (name, roll number, email) and can remove a student. |
| FR-07 | Teacher starts an attendance session for one of their classes (default 10 min, 1–60 min allowed). Only one active session per class. |
| FR-08 | The session exposes a 6-digit **session code** (also rendered as a static QR containing the same code) visible **only to the teacher**. |
| FR-09 | Student marks attendance by entering (or scanning) the code for the selected class while the session is active. |
| FR-10 | System rejects: expired session, wrong code, non-member, removed member, duplicate marking. |
| FR-11 | Teacher can end a session early; sessions also expire automatically at `expiresAt` (checked lazily, no background jobs). |
| FR-12 | Teacher can manually mark a student present or absent for any session of their class (corrections / phone problems). |
| FR-13 | Teacher views per-session roster (present/absent), per-class summary (percentage per student), and per-student history. |
| FR-14 | Student views per-class attendance percentage and per-session history (present/absent). |
| FR-15 | Student sees a warning when percentage is below 75% (constant, configurable in code). |

## 8. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-01 | **Security:** hashed passwords, JWT auth, RBAC, ownership checks on every resource, rate limiting, input validation. |
| NFR-02 | **Performance:** typical API responses < 500 ms at 200 students/class on Atlas free/shared tier. |
| NFR-03 | **Reliability:** duplicate attendance prevented at the database level (unique index), not only in code. |
| NFR-04 | **Usability:** every screen has loading, empty, and error states; errors are human-readable. |
| NFR-05 | **Maintainability:** TypeScript strict mode everywhere; layered backend; documented API contract. |
| NFR-06 | **Compatibility:** Android and iOS via Expo; tested primarily on Android phones with Expo Go. |
| NFR-07 | **Time handling:** all timestamps stored/transferred in UTC (ISO 8601); displayed in device local time. |
| NFR-08 | **Data retention:** attendance history is never hard-deleted. |

## 9. MVP Features (strict boundary)

1. Auth (register, login, logout, me) with two roles.
2. Class management (create, list, view, edit, soft-delete, join by code, view/remove students).
3. Attendance sessions (start, list, view, end, lazy expiry).
4. Student marking by session code (QR display/scan is the last MVP item; manual code entry is the baseline).
5. Teacher manual mark (present/absent).
6. Attendance views and percentage (teacher: session roster, class summary, per-student; student: my summary and history).
7. Profile and Settings screens (view profile, logout).

## 10. User Stories

**Auth**
- US-01: As a teacher/student, I register with name, email, password, and role so I can use the app.
- US-02: As a user, I log in and stay logged in until I log out.

**Classes**
- US-03: As a teacher, I create a class and receive a join code to share.
- US-04: As a teacher, I edit or delete my class.
- US-05: As a student, I join a class with its code.
- US-06: As a teacher, I see who is enrolled and remove a student who should not be there.
- US-07: As a student, I see all my classes and open a class's details.

**Attendance**
- US-08: As a teacher, I start a session and see its code and remaining time.
- US-09: As a teacher, I end a session early.
- US-10: As a student, I enter the code and am marked present.
- US-11: As a teacher, I correct a student's status manually.
- US-12: As a teacher, I view who was present/absent in a session.
- US-13: As a teacher, I view each student's percentage for a class.
- US-14: As a student, I see my percentage and history per class.

## 11. Acceptance Criteria

**AC-AUTH**
- Register with a duplicate email → `409 EMAIL_ALREADY_EXISTS`.
- Password < 8 chars or without letter+digit → `400 VALIDATION_ERROR`.
- Wrong password and unknown email return the same `401 INVALID_CREDENTIALS`.
- After app restart with a valid token, the user lands on their role's home screen without logging in.
- Student registration without `rollNumber` → `400`.

**AC-CLASS**
- Created class has a unique 6-character join code.
- A teacher cannot read/update/delete another teacher's class (`403`/`404`).
- Joining with a valid code creates exactly one active membership; joining again → `409 ALREADY_ENROLLED`.
- Invalid code → `404 INVALID_JOIN_CODE`.
- A removed student cannot rejoin → `403 REMOVED_FROM_CLASS`.
- Deleted class disappears from lists but its attendance history remains in the database.

**AC-SESSION**
- Starting a session when one is already active (not expired) → `409 SESSION_ALREADY_ACTIVE`.
- Session response to the teacher includes `sessionCode`, `expiresAt`, `serverTime`.
- No endpoint returns `sessionCode` to a student.
- Ending an already-ended session → `409 SESSION_NOT_ACTIVE`.

**AC-MARK**
- Valid code, enrolled student, active session → `201`, status `present`, method `code`.
- Wrong code → `400 INVALID_SESSION_CODE`; expired → `410 SESSION_EXPIRED`; not enrolled → `403 NOT_ENROLLED`.
- Second attempt for the same session → `409 ALREADY_MARKED`; the database never holds two records for (session, student).
- Manual mark by a teacher of another class → `403`.

**AC-PERCENT**
- `percentage = presentCount / totalSessions × 100`, rounded to 1 decimal; `null` when `totalSessions = 0`.
- `totalSessions` counts only *completed* sessions (ended, or `expiresAt` in the past) that started **on/after the student's `joinedAt`**.
- Teacher and student views show identical numbers for the same student and class.

## 12. Business Rules

1. One user = one role, fixed at registration.
2. Email is unique (stored lowercase).
3. A class belongs to exactly one teacher; a student may belong to many classes.
4. Only one active session per class at a time.
5. Default session duration is 10 minutes; allowed range 1–60.
6. The session code is random (6 digits), scoped to the class, and valid only while the session is active.
7. Only **present** needs a record in normal flow; absent = a completed session with no `present` record. Manual "absent" writes an explicit `absent` record (used to correct a wrong present).
8. A student is only measured on sessions that started after they joined.
9. A removed student keeps historical records but cannot mark new attendance or rejoin.
10. Soft delete for classes, memberships, and users; sessions and attendance are never deleted.
11. Percentage warning threshold: 75%.
12. Self-registration as teacher is allowed in the MVP (see Assumptions / Risks).

## 13. Security Requirements

- Passwords hashed with bcrypt (cost ≥ 10); never logged or returned.
- JWT (HS256, 7-day expiry) signed with a secret ≥ 32 chars from env; token stored **only** in Expo SecureStore (never AsyncStorage).
- RBAC middleware (`teacher`/`student`) plus **ownership checks** in services.
- Zod validation on every request body, query, and param.
- Rate limiting: global, stricter for `/auth/*` and `/attendance/mark`.
- Helmet, CORS allow-list, request body size limit (10 kb).
- Secrets only in `.env` (never committed); mobile holds no secrets (`EXPO_PUBLIC_*` values are public by definition).
- Generic error messages for auth failures; no stack traces in production responses.
- Session code never returned to students.

## 14. Success Metrics

| Metric | Target |
|---|---|
| Time for a teacher to complete a session | < 60 s |
| Time for a student to mark attendance | < 15 s |
| Duplicate attendance records | 0 |
| API p95 latency | < 500 ms |
| Crash-free sessions (pilot) | > 99% |
| Pilot adoption | 1 real class (≥ 20 students) running 2 weeks |

## 15. Future Enhancements (post-MVP, not planned in detail)

Rotating QR tokens · geofence check · device binding · mock-location detection · late status · CSV/PDF export · push notifications · attendance dispute flow · timetable/schedule · multiple teachers per class · admin role · email verification and password reset · dark mode.

## 16. Out-of-Scope (explicitly NOT in MVP)

- PDF/CSV export
- Payment integration
- Student–teacher dispute management
- Advanced analytics, charts beyond a simple percentage/progress bar
- AI attendance prediction
- Chat, messaging, video calling
- **Any real-time communication** (Socket.IO, WebSockets, SSE, Firebase Realtime) and real-time/push notifications
- Rotating QR, geofencing, device binding, GPS checks
- Email verification, forgot/reset password, change password, social login
- Admin role, institutions/departments, multi-tenant
- Image upload / avatars
- Offline mode and background sync
- Social features of any kind

## 17. Assumptions & Risks

| # | Assumption / Decision | Risk / Note |
|---|---|---|
| A1 | Session code (6 digits) is the only verification in MVP. | A student can share the code with an absent friend. Mitigated only by short window + teacher manual correction. Stronger checks are future work. |
| A2 | Self-registration as teacher is open. | Students could register as teachers. Acceptable for MVP/pilot; future: admin approval or invite. |
| A3 | No email verification or password reset. | Lost password = no recovery in MVP. |
| A4 | JWT lifetime 7 days, no refresh token. | Stolen token valid until expiry; user `isActive` is re-checked each request. |
| A5 | Removed students cannot rejoin. | Teacher has no "restore" action in MVP. |
| A6 | Class size ≤ ~200; summary endpoints compute in the service layer. | Re-evaluate with aggregation pipelines if classes grow. |
| A7 | Student fields: `name`, `email`, `password`, `rollNumber` (required), `enrollmentNo` (optional). Teacher: `name`, `email`, `password`. | — |
| A8 | Light theme only. | — |
