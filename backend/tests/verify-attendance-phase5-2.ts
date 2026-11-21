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
  console.log('=== Starting PART 5.2 Verification Suite ===');
  await connectDB();

  server = app.listen(0);
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 3000;
  baseUrl = `http://localhost:${port}`;

  const ts = Date.now();

  // 1. Create Teacher 1 & Teacher 2
  const regT1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Teacher One',
      email: `t1_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'teacher',
    }),
  });
  assert(regT1.status === 201, `Teacher 1 register failed: ${JSON.stringify(regT1.body)}`);
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
  assert(regT2.status === 201, `Teacher 2 register failed: ${JSON.stringify(regT2.body)}`);
  const t2Token = regT2.body.data.token;

  // 2. Create Student 1 (active), Student 2 (will be removed), Student 3 (not enrolled), Student 4 (for expiry test)
  const regS1 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Student One',
      email: `s1_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `ROLL1_${ts}`,
    }),
  });
  assert(regS1.status === 201, 'Student 1 register failed');
  const s1Token = regS1.body.data.token;
  const s1Id = regS1.body.data.user.id;

  const regS2 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Student Two',
      email: `s2_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `ROLL2_${ts}`,
    }),
  });
  assert(regS2.status === 201, 'Student 2 register failed');
  const s2Token = regS2.body.data.token;
  const s2Id = regS2.body.data.user.id;

  const regS3 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Student Three',
      email: `s3_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `ROLL3_${ts}`,
    }),
  });
  assert(regS3.status === 201, 'Student 3 register failed');
  const s3Token = regS3.body.data.token;
  const s3Id = regS3.body.data.user.id;

  const regS4 = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Student Four',
      email: `s4_${ts}@test.com`,
      password: 'Passw0rd123',
      role: 'student',
      rollNumber: `ROLL4_${ts}`,
    }),
  });
  assert(regS4.status === 201, 'Student 4 register failed');
  const s4Token = regS4.body.data.token;
  const s4Id = regS4.body.data.user.id;

  // 3. Teacher 1 creates class
  const classRes = await request('/api/classes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      name: 'Algorithms 101',
      subjectCode: 'CS101',
      description: 'Intro to Algorithms',
    }),
  });
  assert(classRes.status === 201, 'Create class failed');
  const classId = classRes.body.data.class.id;
  const joinCode = classRes.body.data.class.joinCode;

  // 4. Students join class
  const join1 = await request('/api/classes/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ joinCode }),
  });
  assert(join1.status === 201, 'Student 1 join failed');

  const join2 = await request('/api/classes/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s2Token}` },
    body: JSON.stringify({ joinCode }),
  });
  assert(join2.status === 201, 'Student 2 join failed');

  const join4 = await request('/api/classes/join', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s4Token}` },
    body: JSON.stringify({ joinCode }),
  });
  assert(join4.status === 201, 'Student 4 join failed');

  // 5. Remove Student 2
  const rem2 = await request(`/api/classes/${classId}/students/${s2Id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${t1Token}` },
  });
  assert(rem2.status === 200, 'Remove Student 2 failed');

  // 6. Teacher 1 starts session 1
  const startSess = await request('/api/sessions/start', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      classId,
      durationMinutes: 10,
      title: 'Session 1',
    }),
  });
  assert(startSess.status === 201, 'Start session 1 failed');
  const sessionId1 = startSess.body.data.session.id;
  const sessionCode1 = startSess.body.data.session.sessionCode;
  assert(sessionCode1 && sessionCode1.length === 6, 'Invalid session code generated');

  console.log('✅ Setup completed: 2 Teachers, 4 Students, 1 Class, 1 Active Session');

  // --- TEST 1: Role protection ---
  console.log('Test 1: Role protection on /attendance/mark & /attendance/manual...');
  const tMarkFail = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(tMarkFail.status === 403, `Teacher marking should be 403, got ${tMarkFail.status}`);

  const sManualFail = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ sessionId: sessionId1, studentId: s1Id, status: 'present' }),
  });
  assert(sManualFail.status === 403, `Student manual marking should be 403, got ${sManualFail.status}`);
  console.log('✅ Test 1 Passed: Role protection verified');

  // --- TEST 2: Student 1 marks attendance successfully ---
  console.log('Test 2: Student 1 marks attendance successfully...');
  const markS1 = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markS1.status === 201, `Student 1 mark failed: ${JSON.stringify(markS1.body)}`);
  assert(markS1.body.data.attendance.status === 'present', 'Status should be present');
  assert(markS1.body.data.attendance.method === 'code', 'Method should be code');
  assert(markS1.body.data.attendance.sessionId === sessionId1, 'Session ID mismatch');
  assert(markS1.body.data.attendance.classId === classId, 'Class ID mismatch');
  console.log('✅ Test 2 Passed: Student 1 marked present');

  // --- TEST 3: Duplicate mark gives 409 ALREADY_MARKED ---
  console.log('Test 3: Duplicate mark gives 409 ALREADY_MARKED...');
  const markS1Dup = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s1Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markS1Dup.status === 409, `Expected 409, got ${markS1Dup.status}`);
  assert(markS1Dup.body.error.code === 'ALREADY_MARKED', `Expected ALREADY_MARKED, got ${markS1Dup.body.error.code}`);
  console.log('✅ Test 3 Passed: 409 ALREADY_MARKED on duplicate mark');

  // --- TEST 4: Wrong session code gives 400 INVALID_SESSION_CODE ---
  console.log('Test 4: Wrong session code gives 400 INVALID_SESSION_CODE...');
  const wrongCode = sessionCode1 === '123456' ? '654321' : '123456';
  const markWrong = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s4Token}` },
    body: JSON.stringify({ classId, sessionCode: wrongCode }),
  });
  assert(markWrong.status === 400, `Expected 400, got ${markWrong.status}`);
  assert(markWrong.body.error.code === 'INVALID_SESSION_CODE', `Expected INVALID_SESSION_CODE, got ${markWrong.body.error.code}`);
  console.log('✅ Test 4 Passed: 400 INVALID_SESSION_CODE on incorrect code');

  // --- TEST 5: Removed student gives 403 REMOVED_FROM_CLASS ---
  console.log('Test 5: Removed student gives 403 REMOVED_FROM_CLASS...');
  const markRemoved = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s2Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markRemoved.status === 403, `Expected 403, got ${markRemoved.status}`);
  assert(markRemoved.body.error.code === 'REMOVED_FROM_CLASS', `Expected REMOVED_FROM_CLASS, got ${markRemoved.body.error.code}`);
  console.log('✅ Test 5 Passed: 403 REMOVED_FROM_CLASS for removed student');

  // --- TEST 6: Unenrolled student gives 403 NOT_ENROLLED ---
  console.log('Test 6: Unenrolled student gives 403 NOT_ENROLLED...');
  const markUnenrolled = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s3Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markUnenrolled.status === 403, `Expected 403, got ${markUnenrolled.status}`);
  assert(markUnenrolled.body.error.code === 'NOT_ENROLLED', `Expected NOT_ENROLLED, got ${markUnenrolled.body.error.code}`);
  console.log('✅ Test 6 Passed: 403 NOT_ENROLLED for unenrolled student');

  // --- TEST 7: Expired session gives 410 SESSION_EXPIRED and lazily closes session ---
  console.log('Test 7: Expired session gives 410 SESSION_EXPIRED and lazily closes...');
  // Force session expiresAt to past
  await AttendanceSession.findByIdAndUpdate(sessionId1, {
    expiresAt: new Date(Date.now() - 5000),
  });

  const markExpired = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s4Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markExpired.status === 410, `Expected 410, got ${markExpired.status}`);
  assert(markExpired.body.error.code === 'SESSION_EXPIRED', `Expected SESSION_EXPIRED, got ${markExpired.body.error.code}`);

  // Verify session in DB was closed lazily with endReason: 'expired'
  const dbSession = await AttendanceSession.findById(sessionId1);
  assert(dbSession?.status === 'ended', 'Session should be marked ended');
  assert(dbSession?.endReason === 'expired', `Expected endReason 'expired', got ${dbSession?.endReason}`);
  console.log('✅ Test 7 Passed: 410 SESSION_EXPIRED and lazy DB close confirmed');

  // --- TEST 8: Once session is ended, mark attempt gives 400 INVALID_SESSION_CODE ---
  console.log('Test 8: Mark attempt when no active session gives 400 INVALID_SESSION_CODE...');
  const markNoActive = await request('/api/attendance/mark', {
    method: 'POST',
    headers: { Authorization: `Bearer ${s4Token}` },
    body: JSON.stringify({ classId, sessionCode: sessionCode1 }),
  });
  assert(markNoActive.status === 400, `Expected 400, got ${markNoActive.status}`);
  assert(markNoActive.body.error.code === 'INVALID_SESSION_CODE', `Expected INVALID_SESSION_CODE, got ${markNoActive.body.error.code}`);
  console.log('✅ Test 8 Passed: 400 INVALID_SESSION_CODE when no active session exists');

  // --- TEST 9: Teacher manual marking (present) on ended session ---
  console.log('Test 9: Teacher manual marks Student 4 as present on ended session...');
  const manPres = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      sessionId: sessionId1,
      studentId: s4Id,
      status: 'present',
    }),
  });
  assert(manPres.status === 200, `Manual mark failed: ${JSON.stringify(manPres.body)}`);
  assert(manPres.body.data.attendance.status === 'present', 'Status should be present');
  assert(manPres.body.data.attendance.method === 'manual', 'Method should be manual');
  assert(manPres.body.data.attendance.studentId === s4Id, 'Student ID mismatch');
  console.log('✅ Test 9 Passed: Teacher manual marked present');

  // --- TEST 10: Teacher manual marking updates existing record (present -> absent) ---
  console.log('Test 10: Teacher manual updates Student 1 from present to absent...');
  const manAbs = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      sessionId: sessionId1,
      studentId: s1Id,
      status: 'absent',
    }),
  });
  assert(manAbs.status === 200, `Manual mark to absent failed: ${JSON.stringify(manAbs.body)}`);
  assert(manAbs.body.data.attendance.status === 'absent', 'Status should be absent');
  assert(manAbs.body.data.attendance.method === 'manual', 'Method should be manual');
  console.log('✅ Test 10 Passed: Teacher updated attendance from present to absent');

  // --- TEST 11: Teacher manual marking on removed or unenrolled student gives 404 ---
  console.log('Test 11: Manual mark on inactive/unenrolled student returns 404...');
  const manUnenrolled = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      sessionId: sessionId1,
      studentId: s3Id,
      status: 'present',
    }),
  });
  assert(manUnenrolled.status === 404, `Expected 404 for unenrolled student, got ${manUnenrolled.status}`);

  const manRemoved = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t1Token}` },
    body: JSON.stringify({
      sessionId: sessionId1,
      studentId: s2Id,
      status: 'present',
    }),
  });
  assert(manRemoved.status === 404, `Expected 404 for removed student, got ${manRemoved.status}`);
  console.log('✅ Test 11 Passed: 404 on manual marking inactive/unenrolled student');

  // --- TEST 12: Teacher 2 (non-owner) cannot manual mark Teacher 1 session -> 403 ---
  console.log('Test 12: Teacher 2 cannot manual mark Teacher 1 class session -> 403...');
  const manNonOwner = await request('/api/attendance/manual', {
    method: 'POST',
    headers: { Authorization: `Bearer ${t2Token}` },
    body: JSON.stringify({
      sessionId: sessionId1,
      studentId: s4Id,
      status: 'absent',
    }),
  });
  assert(manNonOwner.status === 403, `Expected 403 for non-owner, got ${manNonOwner.status}`);
  console.log('✅ Test 12 Passed: 403 for non-owner teacher manual marking');

  console.log('🎉 ALL 12 PART 5.2 VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');

  server.close();
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  if (server) server.close();
  disconnectDB().finally(() => process.exit(1));
});
