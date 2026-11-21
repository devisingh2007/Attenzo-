process.env.NODE_ENV = 'test';
import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Class } from '../src/models/Class';
import { ClassMembership } from '../src/models/ClassMembership';
import type { Server } from 'node:http';

// ----------------------------- knobs -----------------------------
const NUM_TEACHERS = 10;
const NUM_STUDENTS = 100;
const CLASSES_PER_TEACHER = 3;
const RACERS = 20;               // students 80..99 reserved for the parallel-race test
const RACE_PARALLEL = 5;         // concurrent join attempts per racer
const POOL = 25;                 // max in-flight API requests

const TOTAL_CLASSES = NUM_TEACHERS * CLASSES_PER_TEACHER;
const NORMAL_STUDENTS = NUM_STUDENTS - RACERS; // 80
// -----------------------------------------------------------------

let baseUrl = '';
let checks = 0;
function ok(label: string) {
  checks++;
  console.log(`  ✓ ${label}`);
}

interface Person {
  id: string;
  token: string;
  email: string;
  name: string;
}
interface StudentRec extends Person {
  rollNumber: string;
}
interface Klass {
  id: string;
  joinCode: string;
  teacherId: string;
  teacherIdx: number;
}

async function req(
  path: string,
  opts: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; json: any }> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${baseUrl}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let json: any = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Math.min(limit, items.length);
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (;;) {
        const i = cursor++;
        if (i >= items.length) return;
        await fn(items[i], i);
      }
    }),
  );
}

function pad(n: number, w = 3): string {
  return String(n).padStart(w, '0');
}

async function run(): Promise<void> {
  const ts = Date.now();
  const t0 = Date.now();

  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected.');

  const server: Server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 5000;
  baseUrl = `http://localhost:${port}/api`;

  const teacherEmails: string[] = [];
  const studentEmails: string[] = [];
  const classIds: string[] = [];

  const teachers: Person[] = [];
  const students: StudentRec[] = [];
  const classes: Klass[] = [];

  try {
    // =====================================================================
    // Phase 1 — bulk user registration
    // =====================================================================
    console.log(`\n[Phase 1] Registering ${NUM_TEACHERS} teachers + ${NUM_STUDENTS} students in parallel...`);
    await pool(
      Array.from({ length: NUM_TEACHERS }, (_, i) => i),
      POOL,
      async (i) => {
        const email = `mass.teacher${pad(i)}.${ts}@example.com`;
        const name = `Mass Teacher ${pad(i)}`;
        const { status, json } = await req('/auth/register', {
          method: 'POST',
          body: { name, email, password: 'Password123', role: 'teacher' },
        });
        assert.equal(status, 201, `teacher ${i} registration failed: ${JSON.stringify(json)}`);
        teachers[i] = { id: json.data.user.id, token: json.data.token, email, name };
        teacherEmails.push(email);
      },
    );
    ok(`${NUM_TEACHERS} teachers registered`);

    await pool(
      Array.from({ length: NUM_STUDENTS }, (_, i) => i),
      POOL,
      async (i) => {
        const rollNumber = `ROLL-${pad(i, 4)}`;
        const email = `mass.student${pad(i)}.${ts}@example.com`;
        const name = `Mass Student ${pad(i)}`;
        const { status, json } = await req('/auth/register', {
          method: 'POST',
          body: {
            name,
            email,
            password: 'Password123',
            role: 'student',
            rollNumber,
            enrollmentNo: `EN-${pad(i, 4)}`,
          },
        });
        assert.equal(status, 201, `student ${i} registration failed: ${JSON.stringify(json)}`);
        students[i] = { id: json.data.user.id, token: json.data.token, email, name, rollNumber };
        studentEmails.push(email);
      },
    );
    ok(`${NUM_STUDENTS} students registered`);

    // =====================================================================
    // Phase 2 — bulk class creation
    // =====================================================================
    console.log(`\n[Phase 2] Creating ${TOTAL_CLASSES} classes in parallel...`);
    await pool(
      teachers,
      POOL,
      async (t, ti) => {
        await Promise.all(
          Array.from({ length: CLASSES_PER_TEACHER }, async (_, ci) => {
            const { status, json } = await req('/classes', {
              method: 'POST',
              token: t.token,
              body: {
                name: `Mass Class T${pad(ti, 2)}C${ci}`,
                subjectCode: `MASS-${pad(ti, 2)}${pad(ci, 2)}`,
                description: `Room ${ti}-${ci}`,
              },
            });
            assert.equal(status, 201, `class create failed: ${JSON.stringify(json)}`);
            const idx = ti * CLASSES_PER_TEACHER + ci;
            classes[idx] = {
              id: json.data.class.id,
              joinCode: json.data.class.joinCode,
              teacherId: t.id,
              teacherIdx: ti,
            };
            classIds.push(json.data.class.id);
          }),
        );
      },
    );
    ok(`${TOTAL_CLASSES} classes created (joinCodes generated)`);

    // =====================================================================
    // Phase 3 — mass parallel join (normal students)
    // =====================================================================
    console.log(`\n[Phase 3] ${NORMAL_STUDENTS} students joining assigned classes in parallel...`);
    const joinTargets = Array.from({ length: NORMAL_STUDENTS }, (_, i) => ({
      sIdx: i,
      cIdx: i % TOTAL_CLASSES,
    }));
    await pool(joinTargets, POOL, async ({ sIdx, cIdx }) => {
      const s = students[sIdx];
      const c = classes[cIdx];
      const { status, json } = await req('/classes/join', {
        method: 'POST',
        token: s.token,
        body: { joinCode: c.joinCode.toLowerCase() },
      });
      assert.equal(status, 201, `student ${sIdx} join class ${cIdx}: ${JSON.stringify(json)}`);
      assert.equal(json.success, true);
      assert.equal(json.data.class.id, c.id);
      assert.equal(json.data.class.teacher.name, teachers[c.teacherIdx].name);
      assert.ok(json.data.joinedAt);
    });
    ok(`${NORMAL_STUDENTS} joins succeeded (case-insensitive joinCode, teacher embedded)`);

    // =====================================================================
    // Phase 4 — mass parallel race condition
    // =====================================================================
    console.log(
      `\n[Phase 4] ${RACERS} racers × ${RACE_PARALLEL} parallel joins on the same class...`,
    );
    const raceClassIdx = 0;
    const raceMatrix: number[][] = await Promise.all(
      Array.from({ length: RACERS }, async (_, r) => {
        const s = students[NORMAL_STUDENTS + r];
        const attempts = await Promise.all(
          Array.from({ length: RACE_PARALLEL }, () =>
            req('/classes/join', {
              method: 'POST',
              token: s.token,
              body: { joinCode: classes[raceClassIdx].joinCode },
            }),
          ),
        );
        return attempts.map((a) => a.status);
      }),
    );
    for (let r = 0; r < RACERS; r++) {
      const successes = raceMatrix[r].filter((s) => s === 201).length;
      const conflicts = raceMatrix[r].filter((s) => s === 409).length;
      assert.equal(successes, 1, `racer ${r}: expected exactly 1 success, got ${successes}`);
      assert.equal(conflicts, RACE_PARALLEL - 1, `racer ${r}: expected ${RACE_PARALLEL - 1} conflicts`);
    }
    ok(`${RACERS} racers each got exactly one 201 and ${RACE_PARALLEL - 1}× 409 (race-safe)`);

    // =====================================================================
    // Phase 5 — expected roster sizes & bulk listing
    // =====================================================================
    const expectedPerClass = Array.from({ length: TOTAL_CLASSES }, (_, cIdx) =>
      cIdx === 0 ? 3 + RACERS : cIdx < 20 ? 3 : 2,
    );
    // explain: i%30 for i<80 → classes 0..19 get 3 students, classes 20..29 get 2.
    //         class 0 additionally receives all RACERS.

    console.log(`\n[Phase 5] Verifying roster totals & sort order across all ${TOTAL_CLASSES} classes...`);
    await pool(
      Array.from({ length: TOTAL_CLASSES }, (_, i) => i),
      POOL,
      async (cIdx) => {
        const c = classes[cIdx];
        const t = teachers[c.teacherIdx];
        const { status, json } = await req(`/classes/${c.id}/students`, { token: t.token });
        assert.equal(status, 200);
        assert.equal(
          json.meta.total,
          expectedPerClass[cIdx],
          `class ${cIdx} total: got ${json.meta.total}, expected ${expectedPerClass[cIdx]}`,
        );
        const page = (json.data.students ?? []) as any[];
        for (let k = 1; k < page.length; k++) {
          assert.ok(
            page[k - 1].rollNumber <= page[k].rollNumber,
            `class ${cIdx} not sorted at index ${k}: ${page[k - 1].rollNumber} > ${page[k].rollNumber}`,
          );
        }
      },
    );
    ok(`All ${TOTAL_CLASSES} class rosters have correct totals and are sorted by rollNumber`);

    // =====================================================================
    // Phase 6 — mass search
    // =====================================================================
    console.log(`\n[Phase 6] Mass search across multiple classes...`);
    const searchTargets = [0, 7, 42, 68, 79];
    await pool(searchTargets, 5, async (sIdx) => {
      const s = students[sIdx];
      const cIdx = sIdx % TOTAL_CLASSES;
      const c = classes[cIdx];
      const t = teachers[c.teacherIdx];
      const { status, json } = await req(
        `/classes/${c.id}/students?search=${encodeURIComponent(s.rollNumber)}`,
        { token: t.token },
      );
      assert.equal(status, 200);
      assert.equal(json.data.students.length, 1, `search ${s.rollNumber} returned ${json.data.students.length}`);
      assert.equal(json.data.students[0].rollNumber, s.rollNumber);
      assert.equal(json.data.students[0].id, s.id);
    });
    ok(`Exact rollNumber search returned the right student in ${searchTargets.length} classes`);

    // =====================================================================
    // Phase 7 — mass removal
    // =====================================================================
    console.log(`\n[Phase 7] Removing the first member from every class...`);
    const removed: { sIdx: number; cIdx: number }[] = [];
    const rostersBeforeRemoval: Record<number, any[]> = {};

    await pool(
      Array.from({ length: TOTAL_CLASSES }, (_, i) => i),
      POOL,
      async (cIdx) => {
        const c = classes[cIdx];
        const t = teachers[c.teacherIdx];
        const { json } = await req(`/classes/${c.id}/students`, { token: t.token });
        const page = (json.data.students ?? []) as any[];
        rostersBeforeRemoval[cIdx] = page;
        if (page.length === 0) return;
        const victim = page[0];
        const sIdx = students.findIndex((s) => s.rollNumber === victim.rollNumber);
        assert.ok(sIdx >= 0, `could not map victim ${victim.rollNumber} to a student`);
        const del = await req(`/classes/${c.id}/students/${students[sIdx].id}`, {
          method: 'DELETE',
          token: t.token,
        });
        assert.equal(del.status, 200);
        assert.equal(del.json.data.message, 'Student removed');
        removed.push({ sIdx, cIdx });
      },
    );
    ok(`Removed first member from ${removed.length}/${TOTAL_CLASSES} classes`);

    console.log(`\n[Phase 8] Verifying DB soft-delete rows for all ${removed.length} removals...`);
    await pool(removed, POOL, async ({ sIdx, cIdx }) => {
      const c = classes[cIdx];
      const s = students[sIdx];
      const m = await ClassMembership.findOne({ classId: c.id, studentId: s.id });
      assert.ok(m, `membership missing for student ${sIdx} in class ${cIdx}`);
      assert.equal(m.status, 'removed');
      assert.ok(m.removedAt !== null);
      assert.equal(m.removedBy?.toString(), teachers[c.teacherIdx].id);
    });
    ok(`All ${removed.length} DB memberships have status='removed' with removedBy/removedAt`);

    // =====================================================================
    // Phase 9 — post-removal behavior
    // =====================================================================
    console.log(`\n[Phase 9] Removed students must be blocked from re-joining (${removed.length} cases)...`);
    await pool(removed, POOL, async ({ sIdx, cIdx }) => {
      const s = students[sIdx];
      const c = classes[cIdx];
      const { status, json } = await req('/classes/join', {
        method: 'POST',
        token: s.token,
        body: { joinCode: c.joinCode },
      });
      assert.equal(status, 403, `student ${sIdx} re-join: ${JSON.stringify(json)}`);
      assert.equal(json.error.code, 'REMOVED_FROM_CLASS');
    });
    ok(`All ${removed.length} removed students blocked with 403 REMOVED_FROM_CLASS`);

    console.log(`\n[Phase 10] Removed students must not see the class in GET /api/classes...`);
    await pool(removed.slice(0, 15), 15, async ({ sIdx }) => {
      const s = students[sIdx];
      const { status, json } = await req('/classes', { token: s.token });
      assert.equal(status, 200);
      assert.equal(json.data.classes.length, 0, `student ${sIdx} still sees ${json.data.classes.length} classes`);
    });
    ok('Removed students no longer see any classes in GET /api/classes');

    console.log(`\n[Phase 11] Removed students blocked from GET /api/classes/:id...`);
    await pool(removed.slice(0, 15), 15, async ({ sIdx, cIdx }) => {
      const s = students[sIdx];
      const c = classes[cIdx];
      const { status, json } = await req(`/classes/${c.id}`, { token: s.token });
      assert.equal(status, 403);
      assert.equal(json.error.code, 'REMOVED_FROM_CLASS');
    });
    ok('15 removed students received 403 REMOVED_FROM_CLASS on class GET');

    console.log(`\n[Phase 12] Roster shrinks after removal for every class...`);
    await pool(
      removed,
      POOL,
      async ({ cIdx }) => {
        const c = classes[cIdx];
        const t = teachers[c.teacherIdx];
        const { status, json } = await req(`/classes/${c.id}/students`, { token: t.token });
        assert.equal(status, 200);
        assert.equal(
          json.meta.total,
          expectedPerClass[cIdx] - 1,
          `class ${cIdx} after removal: got ${json.meta.total}, expected ${expectedPerClass[cIdx] - 1}`,
        );
      },
    );
    ok('Every class roster shrank by exactly 1 after removal');

    console.log(`\n[Phase 13] Double-removal must return 404...`);
    await pool(removed.slice(0, 15), 15, async ({ sIdx, cIdx }) => {
      const c = classes[cIdx];
      const t = teachers[c.teacherIdx];
      const s = students[sIdx];
      const { status } = await req(`/classes/${c.id}/students/${s.id}`, {
        method: 'DELETE',
        token: t.token,
      });
      assert.equal(status, 404);
    });
    ok('Double-removal correctly returns 404 NOT_FOUND');

    // =====================================================================
    // Phase 14 — negative cases at scale
    // =====================================================================
    console.log(`\n[Phase 14] Invalid join codes at scale (20 students × invalid codes)...`);
    const racerIdx = Array.from({ length: RACERS }, (_, i) => NORMAL_STUDENTS + i);
    await pool(racerIdx, 10, async (sIdx) => {
      const s = students[sIdx];
      const { status, json } = await req('/classes/join', {
        method: 'POST',
        token: s.token,
        body: { joinCode: `NOPE${pad(sIdx)}` },
      });
      assert.equal(status, 404);
      assert.equal(json.error.code, 'INVALID_JOIN_CODE');
    });
    ok(`${RACERS} invalid join codes rejected with 404 INVALID_JOIN_CODE`);

    console.log(`\n[Phase 15] Cross-teacher access blocked at scale...`);
    const crossTargets = Array.from({ length: NUM_TEACHERS - 1 }, (_, i) => i + 1);
    await pool(crossTargets, POOL, async (ti) => {
      const intruder = teachers[0];
      const targetClass = classes[ti * CLASSES_PER_TEACHER];
      const { status } = await req(`/classes/${targetClass.id}/students`, { token: intruder.token });
      assert.equal(status, 404);
    });
    ok(`${crossTargets.length} cross-teacher list attempts blocked with 404 NOT_FOUND`);

    await pool(crossTargets, POOL, async (ti) => {
      const intruder = teachers[0];
      const targetClass = classes[ti * CLASSES_PER_TEACHER];
      // grab a member from that class
      const roster = rostersBeforeRemoval[ti * CLASSES_PER_TEACHER] ?? [];
      if (roster.length === 0) return;
      const member = roster[roster.length - 1];
      const sIdx = students.findIndex((s) => s.rollNumber === member.rollNumber);
      if (sIdx < 0) return;
      const { status } = await req(`/classes/${targetClass.id}/students/${students[sIdx].id}`, {
        method: 'DELETE',
        token: intruder.token,
      });
      assert.equal(status, 404);
    });
    ok(`${crossTargets.length} cross-teacher removal attempts blocked with 404 NOT_FOUND`);

    console.log(`\n[Phase 16] Students blocked from listing rosters at scale...`);
    const studentProbes = [1, 5, 12, 33, 47, 58, 66, 71, 79, 99];
    await pool(studentProbes, 10, async (sIdx) => {
      const s = students[sIdx];
      // pick any class (even one they're not a member of)
      const targetClass = classes[sIdx % TOTAL_CLASSES];
      const { status } = await req(`/classes/${targetClass.id}/students`, { token: s.token });
      assert.equal(status, 403);
    });
    ok('10 student roster probes all returned 403 FORBIDDEN');

    // =====================================================================
    // Summary
    // =====================================================================
    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log(`\n============================================================`);
    console.log(`  ALL ${checks} MASS CHECKS PASSED in ${elapsed}s`);
    console.log(`  ${NUM_TEACHERS} teachers · ${NUM_STUDENTS} students · ${TOTAL_CLASSES} classes`);
    console.log(`  ${NORMAL_STUDENTS} joins · ${RACERS}×${RACE_PARALLEL} race requests · ${removed.length} removals`);
    console.log(`============================================================`);
  } finally {
    console.log('\nCleaning up...');
    try {
      if (classIds.length) {
        await Class.deleteMany({ _id: { $in: classIds } });
        await ClassMembership.deleteMany({ classId: { $in: classIds } });
      }
      const allEmails = [...teacherEmails, ...studentEmails];
      if (allEmails.length) {
        await User.deleteMany({ email: { $in: allEmails } });
      }
    } catch (e) {
      console.error('Cleanup error (non-fatal):', e);
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('Cleanup complete and server closed.');
  }
}

run().catch((err) => {
  console.error('Mass verification failed:', err);
  process.exit(1);
});