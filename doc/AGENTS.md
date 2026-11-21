# AGENTS — Rules for Claude Code and other AI coding agents

> This file is binding. If a rule here conflicts with a chat instruction, **stop and ask the owner** before proceeding.

---

## 1. Read Before You Code

Before writing or changing any code, read (in this order):

1. `PRD.md` — what we build and what we do NOT build
2. `TECH_STACK.md` — exact stack, allowed/forbidden packages
3. `ARCHITECTURE.md` — layers, flows, folder structure
4. `DATABASE.md` — schemas, indexes, rules
5. `API.md` — the contract
6. `DESIGN.md` — tokens, screens, components
7. `TASKS.md` — current phase and checklist

Only work on the task/phase the owner has approved. If the docs are silent or contradict each other, **ask; do not guess**.

## 2. Coding Rules

- **TypeScript strict** in both `backend/` and `mobile/`. No `any` unless commented with a reason.
- `async/await` only (no raw `.then` chains, no callbacks).
- Naming: files `camelCase.ts` (components `PascalCase.tsx`), types/interfaces `PascalCase`, constants `UPPER_SNAKE_CASE`, DB fields `camelCase`.
- Avoid unnecessary dependencies. Any package not listed in `TECH_STACK.md` requires owner approval first.
- No code duplication: shared logic goes in `utils/` (or `services/` for business rules); shared UI goes in `components/`.
- Validate **every** API input with Zod. Handle errors via `ApiError` and the central error handler; never swallow errors.
- Controllers stay thin; **business rules and ownership checks live in services**.
- Never use deprecated APIs (see `TECH_STACK.md` §7). Install Expo-managed packages with `npx expo install`.
- Never hardcode API URLs, secrets, or magic numbers; use `config/` and env.
- Follow the documented architecture and folder structure. No new layers.

### Security — non-negotiable
- **Never** store tokens in AsyncStorage → Expo SecureStore only.
- **Never** expose secrets in the mobile app (`EXPO_PUBLIC_*` is public).
- **Never** commit `.env` files (only `.env.example`). Keep `.gitignore` correct from Phase 0.
- **Never** log passwords, tokens, or the session code.
- **Never** return `passwordHash`, and **never** return `sessionCode` to a student.
- **Never** trust IDs/roles from the client; verify ownership/membership on the server.
- **Never** pass raw `req.body`/`req.query` objects into Mongoose filters.

## 3. Strict Communication Rule — REST ONLY

Use REST API only. **Never introduce** Socket.IO, WebSockets, SSE, Firebase Realtime Database, long-polling, or any real-time service. **Do not add polling timers** that call the API. Fresh data comes from fetch-on-focus, pull-to-refresh, explicit Refresh buttons, and post-mutation refetch. The only timer allowed is a local UI countdown that makes no network calls.

## 4. Scope Guard

Do not implement anything listed under "Out-of-Scope" in `PRD.md` (exports, notifications, geofence, rotating QR, dispute flow, admin role, password reset, image upload, dark mode, etc.). If you think something is needed, **propose it; don't build it**.

## 5. Development Workflow (every phase)

1. Read the relevant documentation.
2. Explain the task in your own words.
3. Provide an implementation plan.
4. List the files you will create or modify.
5. **Wait for approval before starting a new major phase.**
6. Implement **one phase at a time**; do not jump ahead.
7. Test the completed functionality (commands/requests/steps shown to the owner).
8. Fix TypeScript and runtime errors (`tsc` clean, server boots, app boots).
9. Update `TASKS.md` — tick boxes **only after verification**.
10. Report what was implemented and **how to test it**.

### Hard "don'ts"
- Never rewrite unrelated code.
- Never silently change API contracts or DB schemas. If a change is needed: stop, explain, update `API.md`/`DATABASE.md`/`PRD.md` **in the same change**, note it in `TASKS.md`, get approval.
- Never mark a task done unless it is implemented **and** verified.
- Never delete or overwrite the owner's files without asking.
- Never invent package versions; resolve with `npm view <pkg> version` / `npx expo install`, then record in `TECH_STACK.md` §8.
- Never run destructive commands (dropping databases, `git reset --hard`, `rm -rf`) without explicit approval.

## 6. Git Hygiene

- Commit after each verified task/phase with a clear message (`feat(auth): add login endpoint`).
- Never commit `.env`, `node_modules`, build output, or secrets. If a secret is committed by mistake, tell the owner immediately (it must be rotated).

## 7. Project Commands

**Rule: document and run only scripts that actually exist in `package.json`.** The table below lists the scripts that Phase 0 and Phase 1 must create. Until a script exists in the file, treat it as *planned*, and update this table to match reality after Phase 0.

### Backend (`/backend`) — active scripts
| Script | Command it runs | Purpose |
|---|---|---|
| `npm run dev` | `tsx watch src/server.ts` | Dev server with reload |
| `npm run build` | `tsc` | Compile to `dist/` |
| `npm start` | `node dist/server.js` | Run compiled server |
| `npm run typecheck` | `tsc --noEmit` | Type check |
| `npm test` | _Planned from Phase 8 (`vitest run`)_ | Unit & API tests |

### Mobile (`/mobile`)
| Command | Purpose |
|---|---|
| `npx expo start` | Start dev server; scan QR with Expo Go |
| `npx expo start --clear` | Start with cleared Metro cache |
| `npx expo-doctor@latest` | Check dependency/SDK compatibility |
| `npx tsc --noEmit` | Type check |
| `npx expo install <pkg>` | Install SDK-compatible packages |

(Expo's default template defines `start`, `android`, `ios`, `web`, and often `lint`/`reset-project`; verify in `mobile/package.json` before relying on them.)

## 8. Definition of Done (per task)

- Behavior matches PRD acceptance criteria and API.md exactly (status codes, error codes, response shape).
- Input validated, errors handled, ownership enforced.
- TypeScript compiles with no errors; app/server runs.
- Tested manually (and with automated tests from Phase 8 onward) — steps documented in the report.
- No secrets, no `console.log` debris, no unused imports.
- `TASKS.md` updated.

## 9. When in Doubt

Ask one clear question with 2–3 options and a recommendation. Do not proceed on assumptions that affect the API, database, security, or scope.
