process.env.NODE_ENV = 'test';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { Server } from 'http';
import { AttendanceSession } from '../src/models/AttendanceSession';

let server: Server;
let baseUrl: string;

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  }
}

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function run(): Promise<void> {
  console.log('=== Starting PART 5.3 Verification Suite ===');
  await connectDB();

  server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;
  baseUrl = `http://localhost:${port}`;

  const ts = Date.now();

  // 1. Register Teacher 1 and Teacher 2
  const regT1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Teacher One',
      email: `t1_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'teacher',
    }),
  });
  assert(regT1.status === 201, 'Teacher 1 register failed');
  const t1Token = regT1.body.data.token;

  const regT2 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Teacher Two',
      email: `t2_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'teacher',
    }),
  });
  assert(regT2.status === 201, 'Teacher 2 register failed');
  const t2Token = regT2.body.data.token;

  // 2. Register Students
  // Student 1 (joins before session 1)
  const regS1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Alice Student',
      email: `s1_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `CS_01_${ts}`,
    }),
  });
  assert(regS1.status === 201, 'Student 1 register failed');
  const s1Token = regS1.body.data.token;
  const s1Id = regS1.body.data.user.id;

  // Student 2 (joins before session 1)
  const regS2 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Bob Student',
      email: `s2_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `CS_02_${ts}`,
    }),
  });
  assert(regS2.status === 201, 'Student 2 register failed');
  const s2Token = regS2.body.data.token;
  const s2Id = regS2.body.data.user.id;

  // Student 3 (late joiner: joins after session 1)
  const regS3 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Charlie Student',
      email: `s3_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `CS_03_${ts}`,
    }),
  });
  assert(regS3.status === 201, 'Student 3 register failed');
  const s3Token = regS3.body.data.token;
  const s3Id = regS3.body.data.user.id;

  // Student 4 (removed before session 3)
  const regS4 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Dave Student',
      email: `s4_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `CS_04_${ts}`,
    }),
  });
  assert(regS4.status === 201, 'Student 4 register failed');
  const s4Token = regS4.body.data.token;
  const s4Id = regS4.body.data.user.id;

  // 3. Teacher 1 creates Class 1
  const classRes = await request('/api/classes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      name: 'Operating Systems',
      subjectCode: 'CS201',
      description: 'Core OS concepts',
    }),
  });
  assert(classRes.status === 201, 'Create class failed');
  const classId = classRes.body.data.class.id;
  const joinCode = classRes.body.data.class.joinCode;

  // 4. Student 1, 2, 4 join Class 1
  for (const token of [s1Token, s2Token, s4Token]) {
    const j = await request('/api/classes/join', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ joinCode }),
    });
    assert(j.status === 201, 'Join class failed');
  }

  // --- SESSION 1 ---
  const s1Start = await request('/api/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ classId, title: 'Lecture 1: Processes' }),
  });
  assert(s1Start.status === 201, 'Start session 1 failed');
  const sess1Id = s1Start.body.data.session.id;
  const sess1Code = s1Start.body.data.session.sessionCode;

  // Student 1 & 4 mark attendance for Session 1
  const m1_1 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ classId, sessionCode: sess1Code }),
  });
  assert(m1_1.status === 201, 'Student 1 mark session 1 failed');

  const m1_4 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s4Token}` },
    body: JSON.stringify({ classId, sessionCode: sess1Code }),
  });
  assert(m1_4.status === 201, 'Student 4 mark session 1 failed');

  // End Session 1
  const s1End = await request(`/api/sessions/${sess1Id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s1End.status === 200, 'End session 1 failed');

  // Small delay so late-joiner joinedAt is strictly after session 1 startedAt
  await new Promise((r) => setTimeout(r, 50));

  // --- STUDENT 3 (Late joiner) joins Class 1 ---
  const j3 = await request('/api/classes/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s3Token}` },
    body: JSON.stringify({ joinCode }),
  });
  assert(j3.status === 201, 'Student 3 late join failed');

  // --- SESSION 2 ---
  const s2Start = await request('/api/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ classId, title: 'Lecture 2: Threads' }),
  });
  assert(s2Start.status === 201, 'Start session 2 failed');
  const sess2Id = s2Start.body.data.session.id;
  const sess2Code = s2Start.body.data.session.sessionCode;

  // Student 1 & 3 mark Session 2 via code
  const m2_1 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ classId, sessionCode: sess2Code }),
  });
  assert(m2_1.status === 201, 'Student 1 mark session 2 failed');

  const m2_3 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s3Token}` },
    body: JSON.stringify({ classId, sessionCode: sess2Code }),
  });
  assert(m2_3.status === 201, 'Student 3 mark session 2 failed');

  // Teacher manual marks Student 2 as present for Session 2
  const man2_2 = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ sessionId: sess2Id, studentId: s2Id, status: 'present' }),
  });
  assert(man2_2.status === 200, 'Manual mark student 2 session 2 failed');

  // Teacher manual marks Student 4 as present for Session 2
  const man2_4 = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ sessionId: sess2Id, studentId: s4Id, status: 'present' }),
  });
  assert(man2_4.status === 200, 'Manual mark student 4 session 2 failed');

  // End Session 2
  const s2End = await request(`/api/sessions/${sess2Id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s2End.status === 200, 'End session 2 failed');

  // --- REMOVE STUDENT 4 ---
  const rem4 = await request(`/api/classes/${classId}/students/${s4Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(rem4.status === 200, 'Remove student 4 failed');

  // --- SESSION 3 ---
  const s3Start = await request('/api/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ classId, title: 'Lecture 3: Deadlocks' }),
  });
  assert(s3Start.status === 201, 'Start session 3 failed');
  const sess3Id = s3Start.body.data.session.id;
  const sess3Code = s3Start.body.data.session.sessionCode;

  // Student 1 & 3 mark Session 3
  const m3_1 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ classId, sessionCode: sess3Code }),
  });
  assert(m3_1.status === 201, 'Student 1 mark session 3 failed');

  const m3_3 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s3Token}` },
    body: JSON.stringify({ classId, sessionCode: sess3Code }),
  });
  assert(m3_3.status === 201, 'Student 3 mark session 3 failed');

  // End Session 3
  const s3End = await request(`/api/sessions/${sess3Id}/end`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s3End.status === 200, 'End session 3 failed');

  console.log('✅ Scenario Setup Completed: 3 completed sessions, 4 students with varied history');

  // ==========================================
  // TEST 1: GET /api/attendance/session/:sessionId (API.md §5.3)
  // ==========================================
  console.log('Test 1: GET /api/attendance/session/:sessionId (Teacher view)...');
  const sessRes = await request(`/api/attendance/session/${sess1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(sessRes.status === 200, `Get session attendance failed: ${JSON.stringify(sessRes.body)}`);
  const sData = sessRes.body.data;
  assert(sData.session.id === sess1Id, 'Session ID mismatch');
  assert(sData.session.status === 'ended', 'Session status should be ended');
  // In session 1: Student 1 (present), Student 4 (present), Student 2 (absent), Student 3 (absent)
  assert(sData.counts.present === 2, `Expected 2 present, got ${sData.counts.present}`);
  assert(sData.counts.absent === 2, `Expected 2 absent, got ${sData.counts.absent}`);
  assert(sData.counts.total === 4, `Expected 4 total in roster, got ${sData.counts.total}`);

  // Test pagination on session roster
  const pageRes = await request(`/api/attendance/session/${sess1Id}?limit=2&page=1`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(pageRes.status === 200, 'Paginated session attendance failed');
  assert(pageRes.body.data.roster.length === 2, `Expected 2 items on page 1, got ${pageRes.body.data.roster.length}`);
  assert(pageRes.body.meta.totalPages === 2, `Expected 2 total pages, got ${pageRes.body.meta.totalPages}`);
  console.log('✅ Test 1 Passed: Session attendance roster & counts verified');

  // ==========================================
  // TEST 2: GET /api/attendance/class/:classId/summary (API.md §5.4)
  // ==========================================
  console.log('Test 2: GET /api/attendance/class/:classId/summary (Teacher view)...');
  const sumRes = await request(`/api/attendance/class/${classId}/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(sumRes.status === 200, `Get class summary failed: ${JSON.stringify(sumRes.body)}`);
  const classSummary = sumRes.body.data;
  assert(classSummary.classId === classId, 'Class ID mismatch');
  assert(classSummary.totalSessions === 3, `Expected 3 total sessions, got ${classSummary.totalSessions}`);
  assert(classSummary.warningThreshold === 75, 'Warning threshold should be 75');

  // Active members only: Students 1, 2, 3 (Student 4 is removed)
  assert(classSummary.students.length === 3, `Expected 3 active students in summary, got ${classSummary.students.length}`);

  // Find students in summary
  const s1Stat = classSummary.students.find((s: any) => s.studentId === s1Id);
  const s2Stat = classSummary.students.find((s: any) => s.studentId === s2Id);
  const s3Stat = classSummary.students.find((s: any) => s.studentId === s3Id);

  // Student 1: 3/3 sessions -> 100%, belowThreshold = false
  assert(s1Stat.totalSessions === 3, `S1 totalSessions: ${s1Stat.totalSessions}`);
  assert(s1Stat.presentCount === 3, `S1 presentCount: ${s1Stat.presentCount}`);
  assert(s1Stat.percentage === 100, `S1 percentage: ${s1Stat.percentage}`);
  assert(s1Stat.belowThreshold === false, 'S1 belowThreshold should be false');

  // Student 2: 1/3 sessions -> 33.3%, belowThreshold = true
  assert(s2Stat.totalSessions === 3, `S2 totalSessions: ${s2Stat.totalSessions}`);
  assert(s2Stat.presentCount === 1, `S2 presentCount: ${s2Stat.presentCount}`);
  assert(s2Stat.percentage === 33.3, `S2 percentage: ${s2Stat.percentage}`);
  assert(s2Stat.belowThreshold === true, 'S2 belowThreshold should be true');

  // Student 3 (Late joiner): joined after session 1 -> only 2 eligible sessions! 2/2 -> 100%
  assert(s3Stat.totalSessions === 2, `S3 totalSessions: ${s3Stat.totalSessions}`);
  assert(s3Stat.presentCount === 2, `S3 presentCount: ${s3Stat.presentCount}`);
  assert(s3Stat.percentage === 100, `S3 percentage: ${s3Stat.percentage}`);
  assert(s3Stat.belowThreshold === false, 'S3 belowThreshold should be false');
  console.log('✅ Test 2 Passed: Class summary, sorting, and late-joiner calculation verified');

  // ==========================================
  // TEST 3: GET /api/attendance/student/:studentId?classId= (API.md §5.5)
  // ==========================================
  console.log('Test 3: GET /api/attendance/student/:studentId?classId= (Teacher view)...');
  // Missing classId should fail validation
  const noClassRes = await request(`/api/attendance/student/${s1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(noClassRes.status === 400, `Missing classId should be 400, got ${noClassRes.status}`);

  // View Student 2 history
  const s2HistRes = await request(`/api/attendance/student/${s2Id}?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s2HistRes.status === 200, `Get student 2 history failed: ${JSON.stringify(s2HistRes.body)}`);
  const s2Data = s2HistRes.body.data;
  assert(s2Data.student.id === s2Id, 'Student ID mismatch');
  assert(s2Data.summary.percentage === 33.3, `Expected 33.3%, got ${s2Data.summary.percentage}`);
  assert(s2Data.history.length === 3, `Expected 3 history items, got ${s2Data.history.length}`);
  // History newest first: Session 3 (absent), Session 2 (present manual), Session 1 (absent)
  assert(s2Data.history[0].sessionId === sess3Id && s2Data.history[0].status === 'absent', 'Session 3 should be absent');
  assert(s2Data.history[1].sessionId === sess2Id && s2Data.history[1].status === 'present' && s2Data.history[1].method === 'manual', 'Session 2 should be present manual');
  assert(s2Data.history[2].sessionId === sess1Id && s2Data.history[2].status === 'absent', 'Session 1 should be absent');

  // View Student 3 (late joiner) history -> only 2 sessions in history
  const s3HistRes = await request(`/api/attendance/student/${s3Id}?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s3HistRes.status === 200, 'Student 3 history failed');
  assert(s3HistRes.body.data.history.length === 2, `Expected 2 history items for late joiner, got ${s3HistRes.body.data.history.length}`);

  // View Student 4 (removed student) -> teacher CAN view history of removed student
  const s4HistRes = await request(`/api/attendance/student/${s4Id}?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(s4HistRes.status === 200, `Removed student history failed: ${JSON.stringify(s4HistRes.body)}`);
  assert(s4HistRes.body.data.summary.presentCount === 2, 'Removed student present count should be 2');
  console.log('✅ Test 3 Passed: Teacher student attendance history & summary verified');

  // ==========================================
  // TEST 4: GET /api/attendance/my (Student view, API.md §5.6)
  // ==========================================
  console.log('Test 4: GET /api/attendance/my (Student self-views)...');
  // Student 1 without classId: summary across all classes
  const myAllRes = await request('/api/attendance/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${s1Token}` },
  });
  assert(myAllRes.status === 200, `My attendance (all) failed: ${JSON.stringify(myAllRes.body)}`);
  assert(myAllRes.body.data.warningThreshold === 75, 'Warning threshold should be 75');
  assert(myAllRes.body.data.classes.length === 1, 'Should have 1 active class');
  const myClass1 = myAllRes.body.data.classes[0];
  assert(myClass1.classId === classId, 'Class ID mismatch');
  assert(myClass1.totalSessions === 3 && myClass1.presentCount === 3 && myClass1.percentage === 100, 'Stats mismatch');

  // Student 2 with ?classId=: summary + history identical to teacher view
  const myS2Res = await request(`/api/attendance/my?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${s2Token}` },
  });
  assert(myS2Res.status === 200, `My attendance (classId) failed: ${JSON.stringify(myS2Res.body)}`);
  assert(myS2Res.body.data.summary.percentage === 33.3, 'Student percentage must match teacher view');
  assert(myS2Res.body.data.summary.belowThreshold === true, 'belowThreshold must be true');
  assert(myS2Res.body.data.history.length === 3, 'History length mismatch');

  // Student 3 with ?classId= (late joiner)
  const myS3Res = await request(`/api/attendance/my?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${s3Token}` },
  });
  assert(myS3Res.status === 200, 'Student 3 my attendance failed');
  assert(myS3Res.body.data.summary.totalSessions === 2, 'Late joiner totalSessions must be 2');
  assert(myS3Res.body.data.summary.percentage === 100, 'Percentage must be 100');
  console.log('✅ Test 4 Passed: Student self-view identical to teacher view');

  // ==========================================
  // TEST 5: Class with 0 completed sessions
  // ==========================================
  console.log('Test 5: Zero completed sessions returns percentage=null and belowThreshold=false...');
  const class2Res = await request('/api/classes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      name: 'Computer Networks',
      subjectCode: 'CS301',
      description: 'Zero sessions class',
    }),
  });
  assert(class2Res.status === 201, 'Create class 2 failed');
  const class2Id = class2Res.body.data.class.id;
  const joinCode2 = class2Res.body.data.class.joinCode;

  await request('/api/classes/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ joinCode: joinCode2 }),
  });

  const sumClass2 = await request(`/api/attendance/class/${class2Id}/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(sumClass2.status === 200, 'Class 2 summary failed');
  assert(sumClass2.body.data.totalSessions === 0, 'Class 2 totalSessions should be 0');
  assert(sumClass2.body.data.students[0].percentage === null, 'Percentage should be null when totalSessions=0');
  assert(sumClass2.body.data.students[0].belowThreshold === false, 'belowThreshold should be false when totalSessions=0');
  console.log('✅ Test 5 Passed: Zero sessions edge case verified');

  // ==========================================
  // TEST 6: Security, RBAC & Ownership checks
  // ==========================================
  console.log('Test 6: Role and ownership protections...');
  // Student cannot access teacher endpoints
  const sOnSession = await request(`/api/attendance/session/${sess1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${s1Token}` },
  });
  assert(sOnSession.status === 403, `Student on /session/:id should be 403, got ${sOnSession.status}`);

  const sOnClassSum = await request(`/api/attendance/class/${classId}/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${s1Token}` },
  });
  assert(sOnClassSum.status === 403, `Student on /class/:id/summary should be 403, got ${sOnClassSum.status}`);

  const sOnStudent = await request(`/api/attendance/student/${s2Id}?classId=${classId}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${s1Token}` },
  });
  assert(sOnStudent.status === 403, `Student on /student/:id should be 403, got ${sOnStudent.status}`);

  // Teacher cannot access /my (student only)
  const tOnMy = await request('/api/attendance/my', {
    method: 'GET',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(tOnMy.status === 403, `Teacher on /my should be 403, got ${tOnMy.status}`);

  // Teacher 2 (non-owner) cannot view Teacher 1 class summary or session
  const t2OnSum = await request(`/api/attendance/class/${classId}/summary`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t2Token}` },
  });
  assert(t2OnSum.status === 403, `Teacher 2 on class summary should be 403, got ${t2OnSum.status}`);

  const t2OnSess = await request(`/api/attendance/session/${sess1Id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${t2Token}` },
  });
  assert(t2OnSess.status === 403, `Teacher 2 on session should be 403, got ${t2OnSess.status}`);
  console.log('✅ Test 6 Passed: All role and ownership protections verified');

  console.log('🎉 ALL 6 PART 5.3 VERIFICATION TEST SUITES PASSED SUCCESSFULLY! 🎉');

  server.close();
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
