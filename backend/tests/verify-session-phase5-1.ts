import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Class } from '../src/models/Class';
import { ClassMembership } from '../src/models/ClassMembership';
import { AttendanceSession } from '../src/models/AttendanceSession';
import type { Server } from 'node:http';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected to MongoDB.');

  const timestamp = Date.now();
  const teacherAEmail = `teacherA.p51.${timestamp}@example.com`;
  const teacherBEmail = `teacherB.p51.${timestamp}@example.com`;
  const studentAEmail = `studentA.p51.${timestamp}@example.com`;
  const studentBEmail = `studentB.p51.${timestamp}@example.com`;

  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api`;

  let classAId = '';
  let classBId = '';

  try {
    console.log('\n--- 1. Registering Users ---');
    const regTA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Teacher Alice', email: teacherAEmail, password: 'Password123', role: 'teacher' }),
    });
    const dataTA = await regTA.json();
    assert.equal(regTA.status, 201);
    const tokenTA = dataTA.data.token;

    const regTB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Teacher Bob', email: teacherBEmail, password: 'Password123', role: 'teacher' }),
    });
    const dataTB = await regTB.json();
    assert.equal(regTB.status, 201);
    const tokenTB = dataTB.data.token;

    const regSA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student Charlie', email: studentAEmail, password: 'Password123', role: 'student', rollNumber: 'R-501' }),
    });
    const dataSA = await regSA.json();
    assert.equal(regSA.status, 201);
    const tokenSA = dataSA.data.token;

    const regSB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Student Dave', email: studentBEmail, password: 'Password123', role: 'student', rollNumber: 'R-502' }),
    });
    const dataSB = await regSB.json();
    assert.equal(regSB.status, 201);
    const tokenSB = dataSB.data.token;
    console.log('✓ All 4 users registered');

    console.log('\n--- 2. Setting up Class and Enrollment ---');
    const createClassRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ name: 'Physics 101', subjectCode: 'PHY101' }),
    });
    const classData = await createClassRes.json();
    assert.equal(createClassRes.status, 201);
    classAId = classData.data.class.id;
    const joinCode = classData.data.class.joinCode;

    // Student A joins Class A
    const joinRes = await fetch(`${baseUrl}/classes/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSA}` },
      body: JSON.stringify({ joinCode }),
    });
    assert.equal(joinRes.status, 201);
    console.log('✓ Class A created and Student A enrolled');

    console.log('\n--- 3. Teacher A starts a session ---');
    const startRes = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ classId: classAId, durationMinutes: 10, title: 'Lecture 1: Kinematics' }),
    });
    const startData = await startRes.json();
    console.log('Start session status:', startRes.status);
    assert.equal(startRes.status, 201);
    assert.equal(startData.success, true);
    const session1 = startData.data.session;
    assert.ok(session1.id);
    assert.equal(session1.classId, classAId);
    assert.equal(session1.title, 'Lecture 1: Kinematics');
    assert.match(session1.sessionCode, /^\d{6}$/, 'sessionCode must be exactly 6 digits');
    assert.equal(session1.status, 'active');
    assert.equal(session1.durationMinutes, 10);
    assert.ok(session1.qrPayload);
    const parsedQR = JSON.parse(session1.qrPayload);
    assert.equal(parsedQR.v, 1);
    assert.equal(parsedQR.classId, classAId);
    assert.equal(parsedQR.code, session1.sessionCode);
    assert.ok(session1.serverTime);
    console.log(`✓ Session started with code: ${session1.sessionCode}, expiresAt: ${session1.expiresAt}`);

    console.log('\n--- 4. Second active session attempt (409 SESSION_ALREADY_ACTIVE) ---');
    const duplicateStartRes = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ classId: classAId, durationMinutes: 10, title: 'Lecture 2' }),
    });
    const dupStartData = await duplicateStartRes.json();
    console.log('Duplicate start status:', duplicateStartRes.status);
    assert.equal(duplicateStartRes.status, 409);
    assert.equal(dupStartData.error.code, 'SESSION_ALREADY_ACTIVE');
    console.log('✓ Second session rejected with 409 SESSION_ALREADY_ACTIVE');

    console.log('\n--- 5. Student / non-owner starting session ---');
    const studentStartRes = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenSA}` },
      body: JSON.stringify({ classId: classAId }),
    });
    assert.equal(studentStartRes.status, 403, 'Student cannot start session');

    const teacherBStartRes = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTB}` },
      body: JSON.stringify({ classId: classAId }),
    });
    assert.equal(teacherBStartRes.status, 404, 'Non-owner teacher receives 404');
    console.log('✓ Role and ownership checks verified for session start');

    console.log('\n--- 6. Class Details Active Session Integration (Part 4.1 TODO) ---');
    const teacherClassGetRes = await fetch(`${baseUrl}/classes/${classAId}`, {
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const teacherClassGetData = await teacherClassGetRes.json();
    assert.equal(teacherClassGetRes.status, 200);
    assert.ok(teacherClassGetData.data.class.activeSession);
    assert.equal(teacherClassGetData.data.class.activeSession.sessionCode, session1.sessionCode);
    console.log('✓ Teacher gets activeSession with sessionCode in class details');

    const studentClassGetRes = await fetch(`${baseUrl}/classes/${classAId}`, {
      headers: { Authorization: `Bearer ${tokenSA}` },
    });
    const studentClassGetData = await studentClassGetRes.json();
    assert.equal(studentClassGetRes.status, 200);
    assert.ok(studentClassGetData.data.class.activeSession);
    assert.equal(studentClassGetData.data.class.activeSession.sessionCode, undefined, 'Student must NEVER receive sessionCode');
    console.log('✓ Student gets activeSession WITHOUT sessionCode in class details');

    console.log('\n--- 7. List Sessions (Teacher vs Student projections) ---');
    const teacherListRes = await fetch(`${baseUrl}/sessions?classId=${classAId}`, {
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const teacherListData = await teacherListRes.json();
    assert.equal(teacherListRes.status, 200);
    assert.equal(teacherListData.data.sessions.length, 1);
    assert.equal(teacherListData.data.sessions[0].sessionCode, session1.sessionCode);
    assert.equal(teacherListData.data.sessions[0].presentCount, 0);

    const studentListRes = await fetch(`${baseUrl}/sessions?classId=${classAId}`, {
      headers: { Authorization: `Bearer ${tokenSA}` },
    });
    const studentListData = await studentListRes.json();
    assert.equal(studentListRes.status, 200);
    assert.equal(studentListData.data.sessions.length, 1);
    assert.equal(studentListData.data.sessions[0].sessionCode, undefined, 'Student must NOT see sessionCode');
    assert.equal(studentListData.data.sessions[0].presentCount, undefined, 'Student must NOT see presentCount');
    assert.equal(studentListData.data.sessions[0].myStatus, null, 'myStatus is null for active session');
    console.log('✓ List sessions correctly projected by role');

    console.log('\n--- 8. Get Session by ID (Teacher vs Student projections) ---');
    const teacherGetRes = await fetch(`${baseUrl}/sessions/${session1.id}`, {
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const teacherGetData = await teacherGetRes.json();
    assert.equal(teacherGetRes.status, 200);
    assert.equal(teacherGetData.data.sessionCode, session1.sessionCode);
    assert.ok(teacherGetData.data.qrPayload);
    assert.ok(teacherGetData.data.serverTime);
    assert.equal(teacherGetData.data.presentCount, 0);
    assert.equal(teacherGetData.data.totalStudents, 1);

    const studentGetRes = await fetch(`${baseUrl}/sessions/${session1.id}`, {
      headers: { Authorization: `Bearer ${tokenSA}` },
    });
    const studentGetData = await studentGetRes.json();
    assert.equal(studentGetRes.status, 200);
    assert.equal(studentGetData.data.sessionCode, undefined);
    assert.equal(studentGetData.data.qrPayload, undefined);
    assert.equal(studentGetData.data.presentCount, undefined);
    assert.equal(studentGetData.data.totalStudents, undefined);
    assert.equal(studentGetData.data.myStatus, null);
    console.log('✓ Get session by ID correctly projected by role');

    console.log('\n--- 9. Lazy Expiry Verification ---');
    // Artificially expire session 1 in DB
    const pastTime = new Date(Date.now() - 10000);
    await AttendanceSession.updateOne({ _id: session1.id }, { expiresAt: pastTime });

    // Reading the session triggers lazy expiry
    const getExpiredRes = await fetch(`${baseUrl}/sessions/${session1.id}`, {
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const getExpiredData = await getExpiredRes.json();
    assert.equal(getExpiredRes.status, 200);
    assert.equal(getExpiredData.data.status, 'ended');
    assert.equal(getExpiredData.data.endReason, 'expired');
    assert.equal(new Date(getExpiredData.data.endedAt).getTime(), pastTime.getTime());

    // Reading class details now returns activeSession: null
    const classDetailsAfterExpiryRes = await fetch(`${baseUrl}/classes/${classAId}`, {
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const classDetailsAfterExpiryData = await classDetailsAfterExpiryRes.json();
    assert.equal(classDetailsAfterExpiryData.data.class.activeSession, null);
    console.log('✓ Lazy expiry successfully updated session and cleared class activeSession');

    console.log('\n--- 10. Start a new session after expiry & Manual End Session ---');
    const start2Res = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ classId: classAId, durationMinutes: 15, title: 'Lecture 2: Forces' }),
    });
    assert.equal(start2Res.status, 201, 'Should start successfully after previous session expired');
    const session2 = (await start2Res.json()).data.session;

    // Student attempts to end session (403 FORBIDDEN)
    const studentEndRes = await fetch(`${baseUrl}/sessions/${session2.id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenSA}` },
    });
    assert.equal(studentEndRes.status, 403);

    // Non-owner teacher attempts to end session (404 NOT_FOUND)
    const teacherBEndRes = await fetch(`${baseUrl}/sessions/${session2.id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTB}` },
    });
    assert.equal(teacherBEndRes.status, 404);

    // Teacher A manually ends session
    const endRes = await fetch(`${baseUrl}/sessions/${session2.id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const endData = await endRes.json();
    console.log('Manual end status:', endRes.status);
    assert.equal(endRes.status, 200);
    assert.equal(endData.data.session.status, 'ended');
    assert.equal(endData.data.session.endReason, 'manual');
    assert.ok(endData.data.session.endedAt);

    // Ending already-ended session returns 409 SESSION_NOT_ACTIVE
    const endAgainRes = await fetch(`${baseUrl}/sessions/${session2.id}/end`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    const endAgainData = await endAgainRes.json();
    assert.equal(endAgainRes.status, 409);
    assert.equal(endAgainData.error.code, 'SESSION_NOT_ACTIVE');
    console.log('✓ Manual end verified and repeat end returned 409 SESSION_NOT_ACTIVE');

    console.log('\n--- 11. Class Deletion Hook (Part 4.1 TODO) ---');
    // Start session 3 on Class A
    const start3Res = await fetch(`${baseUrl}/sessions/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ classId: classAId, durationMinutes: 20 }),
    });
    assert.equal(start3Res.status, 201);
    const session3 = (await start3Res.json()).data.session;

    // Soft delete Class A
    const delClassRes = await fetch(`${baseUrl}/classes/${classAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenTA}` },
    });
    assert.equal(delClassRes.status, 200);

    // Verify session 3 is ended with endReason='class_deleted'
    const dbSession3 = await AttendanceSession.findById(session3.id);
    assert.ok(dbSession3);
    assert.equal(dbSession3.status, 'ended');
    assert.equal(dbSession3.endReason, 'class_deleted');
    assert.ok(dbSession3.endedAt !== null);
    console.log('✓ Soft deleting class terminated active session with endReason="class_deleted"');

    console.log('\n--- 12. Parallel Race on Start Session ---');
    // Create Class B
    const createClassBRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
      body: JSON.stringify({ name: 'Race Class', subjectCode: 'RACE101' }),
    });
    assert.equal(createClassBRes.status, 201);
    classBId = (await createClassBRes.json()).data.class.id;

    const [raceStart1, raceStart2] = await Promise.all([
      fetch(`${baseUrl}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
        body: JSON.stringify({ classId: classBId, durationMinutes: 10 }),
      }),
      fetch(`${baseUrl}/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenTA}` },
        body: JSON.stringify({ classId: classBId, durationMinutes: 10 }),
      }),
    ]);
    const raceStatuses = [raceStart1.status, raceStart2.status].sort();
    console.log('Parallel start statuses:', raceStatuses);
    assert.deepEqual(raceStatuses, [201, 409], 'Exactly one start must succeed and one must be 409');
    console.log('✓ Concurrent session starts safely guarded by partial unique index');

    console.log('\nALL 12 PHASE 5.1 SESSION LIFECYCLE CHECKS PASSED SUCCESSFULLY!');
  } finally {
    if (classAId) {
      await Class.deleteOne({ _id: classAId });
      await ClassMembership.deleteMany({ classId: classAId });
      await AttendanceSession.deleteMany({ classId: classAId });
    }
    if (classBId) {
      await Class.deleteOne({ _id: classBId });
      await ClassMembership.deleteMany({ classId: classBId });
      await AttendanceSession.deleteMany({ classId: classBId });
    }
    await User.deleteMany({ email: { $in: [teacherAEmail, teacherBEmail, studentAEmail, studentBEmail] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('Cleanup complete and server closed.');
  }
}

run().catch((err) => {
  console.error('Phase 5.1 verification failed:', err);
  process.exit(1);
});
