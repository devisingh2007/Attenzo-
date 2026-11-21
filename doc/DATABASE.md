# DATABASE — MongoDB (Atlas) + Mongoose 9

> Related: [PRD](PRD.md) · [ARCHITECTURE](ARCHITECTURE.md) · [API](API.md)
> Conventions: collection names are Mongoose defaults (pluralized, lowercase). All timestamps are UTC `Date`. `timestamps: true` adds `createdAt`/`updatedAt` on every schema. IDs are `ObjectId`.

## 0. Entity Overview

```mermaid
erDiagram
    USER ||--o{ CLASS : "teaches (teacherId)"
    USER ||--o{ CLASSMEMBERSHIP : "enrolls (studentId)"
    CLASS ||--o{ CLASSMEMBERSHIP : "has"
    CLASS ||--o{ ATTENDANCESESSION : "has"
    USER ||--o{ ATTENDANCESESSION : "starts (teacherId)"
    ATTENDANCESESSION ||--o{ ATTENDANCE : "has"
    USER ||--o{ ATTENDANCE : "student"
    CLASS ||--o{ ATTENDANCE : "denormalized classId"
```

---

## 1. User — collection `users`

**Purpose:** Accounts for teachers and students.

| Field | Type | Req | Default | Validation / Notes |
|---|---|---|---|---|
| `name` | String | ✔ | — | trim, 2–60 chars |
| `email` | String | ✔ | — | lowercase, trim, valid email, **unique** |
| `passwordHash` | String | ✔ | — | bcrypt hash; `select: false`; never serialized |
| `role` | String enum | ✔ | — | `'teacher' \| 'student'`; immutable after creation |
| `rollNumber` | String | ✔ if student | — | trim, 1–30 chars; required only when `role='student'` |
| `enrollmentNo` | String | ✘ | — | trim, 1–30 chars; students only |
| `isActive` | Boolean | ✔ | `true` | soft-disable; inactive users cannot authenticate |
| `createdAt`, `updatedAt` | Date | auto | now | — |

**Relationships:** referenced by Class (`teacherId`), ClassMembership (`studentId`), AttendanceSession (`teacherId`), Attendance (`studentId`, `markedBy`).

**Indexes**
- `{ email: 1 }` unique
- `{ role: 1 }`

**Schema hooks/rules:** custom validator: `rollNumber` required when `role === 'student'`; stripped when teacher. `toJSON` removes `passwordHash` and `__v`.

**Example**
```json
{
  "_id": "665f1c0e9b1e8a0012a1b001",
  "name": "Riya Patel",
  "email": "riya@example.com",
  "role": "student",
  "rollNumber": "21CE045",
  "enrollmentNo": "210010107045",
  "isActive": true,
  "createdAt": "2026-11-21T09:00:00.000Z",
  "updatedAt": "2026-11-21T09:00:00.000Z"
}
```

---

## 2. Class — collection `classes`

**Purpose:** A subject/section taught by one teacher.

| Field | Type | Req | Default | Validation / Notes |
|---|---|---|---|---|
| `name` | String | ✔ | — | trim, 2–80 chars |
| `subjectCode` | String | ✔ | — | trim, uppercase, 2–20 chars, `[A-Z0-9-]` |
| `description` | String | ✘ | `''` | max 500 chars |
| `teacherId` | ObjectId → `User` | ✔ | — | must reference a user with role `teacher` (checked in service) |
| `joinCode` | String | ✔ | generated | 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0 O 1 I`), **unique** |
| `isActive` | Boolean | ✔ | `true` | soft delete flag |
| `deletedAt` | Date | ✘ | `null` | set on soft delete |

**Relationships:** `teacherId` → User (many classes per teacher). Parent of memberships, sessions, attendance.

**Indexes**
- `{ joinCode: 1 }` unique
- `{ teacherId: 1, isActive: 1, createdAt: -1 }` (teacher's class list)

**Example**
```json
{
  "_id": "665f1c0e9b1e8a0012a1c001",
  "name": "Data Structures — Section A",
  "subjectCode": "CS301",
  "description": "Mon/Wed/Fri 10:00",
  "teacherId": "665f1c0e9b1e8a0012a1b100",
  "joinCode": "K7MX4P",
  "isActive": true,
  "deletedAt": null,
  "createdAt": "2026-11-21T09:10:00.000Z",
  "updatedAt": "2026-11-21T09:10:00.000Z"
}
```

---

## 3. ClassMembership — collection `classmemberships`

**Purpose:** Student ↔ class enrollment (many-to-many).

| Field | Type | Req | Default | Validation / Notes |
|---|---|---|---|---|
| `classId` | ObjectId → `Class` | ✔ | — | — |
| `studentId` | ObjectId → `User` | ✔ | — | role must be `student` (checked in service) |
| `status` | String enum | ✔ | `'active'` | `'active' \| 'removed'` |
| `joinedAt` | Date | ✔ | `Date.now` | start of the student's measured period |
| `removedAt` | Date | ✘ | `null` | set when removed |
| `removedBy` | ObjectId → `User` | ✘ | `null` | the teacher |

**Indexes**
- `{ classId: 1, studentId: 1 }` **unique** (prevents joining twice)
- `{ studentId: 1, status: 1 }` (student's classes)
- `{ classId: 1, status: 1, joinedAt: 1 }` (class roster)

**Rules:** `removed` is terminal in the MVP (no rejoin). The membership row is never deleted.

**Example**
```json
{
  "_id": "665f1c0e9b1e8a0012a1d001",
  "classId": "665f1c0e9b1e8a0012a1c001",
  "studentId": "665f1c0e9b1e8a0012a1b001",
  "status": "active",
  "joinedAt": "2026-11-21T09:20:00.000Z",
  "removedAt": null,
  "removedBy": null
}
```

---

## 4. AttendanceSession — collection `attendancesessions`

**Purpose:** One timed attendance window for a class.

| Field | Type | Req | Default | Validation / Notes |
|---|---|---|---|---|
| `classId` | ObjectId → `Class` | ✔ | — | — |
| `teacherId` | ObjectId → `User` | ✔ | — | must equal `class.teacherId` at creation |
| `sessionCode` | String | ✔ | generated | 6 digits (`crypto.randomInt`, zero-padded); never returned to students |
| `title` | String | ✘ | `''` | optional label, max 80 |
| `startedAt` | Date | ✔ | `Date.now` | — |
| `durationMinutes` | Number | ✔ | `10` | integer 1–60 |
| `expiresAt` | Date | ✔ | `startedAt + duration` | computed in service |
| `status` | String enum | ✔ | `'active'` | `'active' \| 'ended'` |
| `endedAt` | Date | ✘ | `null` | actual end time (`expiresAt` for lazy expiry) |
| `endReason` | String enum | ✘ | `null` | `'manual' \| 'expired' \| 'class_deleted'` |

**Definition — completed session:** `status === 'ended'` **OR** `expiresAt <= now`. Statistics always use this definition.

**Indexes**
- `{ classId: 1, startedAt: -1 }` (history)
- `{ teacherId: 1, startedAt: -1 }`
- `{ classId: 1 }` **unique, partialFilterExpression `{ status: 'active' }`** → at most one active session per class (race-safe)

**Example**
```json
{
  "_id": "665f1c0e9b1e8a0012a1e001",
  "classId": "665f1c0e9b1e8a0012a1c001",
  "teacherId": "665f1c0e9b1e8a0012a1b100",
  "sessionCode": "482913",
  "title": "Lecture 14",
  "startedAt": "2026-11-23T04:30:00.000Z",
  "durationMinutes": 10,
  "expiresAt": "2026-11-23T04:40:00.000Z",
  "status": "ended",
  "endedAt": "2026-11-23T04:40:00.000Z",
  "endReason": "expired"
}
```

---

## 5. Attendance — collection `attendances`

**Purpose:** A student's recorded status for one session.

| Field | Type | Req | Default | Validation / Notes |
|---|---|---|---|---|
| `sessionId` | ObjectId → `AttendanceSession` | ✔ | — | — |
| `classId` | ObjectId → `Class` | ✔ | — | **denormalized from session by the server**; never from client |
| `studentId` | ObjectId → `User` | ✔ | — | — |
| `status` | String enum | ✔ | `'present'` | `'present' \| 'absent'` |
| `method` | String enum | ✔ | — | `'code' \| 'manual'` |
| `markedAt` | Date | ✔ | `Date.now` | — |
| `markedBy` | ObjectId → `User` | ✘ | `null` | teacher id when `method='manual'`; student id when `code` |

**Indexes**
- `{ sessionId: 1, studentId: 1 }` **unique** (no duplicate attendance)
- `{ studentId: 1, classId: 1 }` (student history/percentage)
- `{ classId: 1, studentId: 1, status: 1 }` (class summary)
- `{ sessionId: 1 }` (roster)

**Rules**
- Normal marking creates `present/code`.
- Manual marking **upserts** on `(sessionId, studentId)`: may switch `present ↔ absent`, sets `method='manual'`, `markedBy=teacherId`.
- Percentages count only `status='present'`.

**Example**
```json
{
  "_id": "665f1c0e9b1e8a0012a1f001",
  "sessionId": "665f1c0e9b1e8a0012a1e001",
  "classId": "665f1c0e9b1e8a0012a1c001",
  "studentId": "665f1c0e9b1e8a0012a1b001",
  "status": "present",
  "method": "code",
  "markedAt": "2026-11-23T04:32:10.000Z",
  "markedBy": "665f1c0e9b1e8a0012a1b001"
}
```

---

## 6. Database Rules (enforced where)

| Rule | Enforced by |
|---|---|
| Every user has a role | Schema `required` + enum |
| Teacher manages only own classes | Service ownership check (`class.teacherId`) |
| Student can join many classes; class has many students | `ClassMembership` collection |
| No duplicate membership | Unique `{classId, studentId}` |
| No duplicate attendance | Unique `{sessionId, studentId}` |
| One active session per class | Partial unique `{classId}` where `status='active'` |
| Attendance belongs to a session and a student | Required refs + service validation |
| No cross-user data access | Services verify teacher ownership / active membership on every read |

## 7. Referential Integrity

MongoDB has no foreign keys, so integrity is maintained by:
1. Services verify referenced documents exist (and are active) **before** inserts.
2. No hard deletes of Users, Classes, Memberships, Sessions, or Attendance → no dangling references.
3. `Attendance.classId` is copied from the session inside the service, guaranteeing `attendance.classId === session.classId`.
4. Multi-document consistency is limited in the MVP; flows that need two writes (soft-delete class + end its session) are ordered so a partial failure leaves a valid state (end session first, then deactivate class). Transactions are optional later (require a replica set; Atlas provides one).

## 8. Soft Deletion

| Entity | Mechanism | Effect |
|---|---|---|
| Class | `isActive=false`, `deletedAt` | Hidden from lists; active session ended with `endReason='class_deleted'`; history readable only to the owning teacher via summary endpoints if needed later |
| ClassMembership | `status='removed'` | Student loses access; old records kept |
| User | `isActive=false` | Cannot authenticate (no endpoint in MVP; DB-level only) |
| Session, Attendance | Never deleted | Audit/history |

All default queries filter `isActive: true` (classes) and `status: 'active'` (memberships) explicitly in services.

## 9. Query Optimization

- Every list query is backed by an index above (teacher classes, student classes, class roster, session history, attendance by student/class/session).
- Use `.lean()` for read-only responses; `.select()` to drop unused fields (e.g., `sessionCode` for students).
- Pagination via `skip/limit` with `limit ≤ 100` (acceptable at MVP scale; switch to cursor pagination if lists exceed thousands).
- **Percentage calculation** (per student, per class):
  1. `totalSessions` = count of sessions with `classId`, `startedAt >= membership.joinedAt`, and (`status='ended'` OR `expiresAt <= now`).
  2. `presentCount` = count of Attendance with `studentId`, `classId`, `status='present'`, and `sessionId` in that set.
  3. `percentage = round(presentCount / totalSessions × 100, 1)`; `null` if `totalSessions = 0`.
  For the class summary, fetch completed sessions once, fetch attendance once (`classId` filter), and compute in memory per member (class size ≤ ~200).

## 10. Data Consistency Notes

- Races on join/mark/start are resolved by unique indexes; the error handler maps `E11000` to the correct `409` code.
- `expiresAt` is authoritative (server clock). The client never decides whether a session is open.
- Clock source: server UTC `new Date()`; MongoDB stores UTC.
- Ensure indexes are built at startup in development (`autoIndex: true`); in production create them explicitly via a one-time script and set `autoIndex: false`.

## 11. Indexing Strategy Summary

| Collection | Index | Type | Purpose |
|---|---|---|---|
| users | `{email:1}` | unique | login, duplicate email |
| users | `{role:1}` | normal | role filters |
| classes | `{joinCode:1}` | unique | join lookup |
| classes | `{teacherId:1,isActive:1,createdAt:-1}` | compound | teacher list |
| classmemberships | `{classId:1,studentId:1}` | unique compound | no duplicates |
| classmemberships | `{studentId:1,status:1}` | compound | student's classes |
| classmemberships | `{classId:1,status:1,joinedAt:1}` | compound | roster, percentage baseline |
| attendancesessions | `{classId:1,startedAt:-1}` | compound | history |
| attendancesessions | `{teacherId:1,startedAt:-1}` | compound | teacher listing |
| attendancesessions | `{classId:1}` partial `status:'active'` | unique partial | one active session |
| attendances | `{sessionId:1,studentId:1}` | unique compound | no duplicates |
| attendances | `{studentId:1,classId:1}` | compound | student history |
| attendances | `{classId:1,studentId:1,status:1}` | compound | summary |
| attendances | `{sessionId:1}` | normal | roster |
