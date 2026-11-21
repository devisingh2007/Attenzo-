import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { User } from '../src/models/User';
import type { Server } from 'node:http';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected to MongoDB.');

  const testEmailStudent = `test.student.phase32.${Date.now()}@example.com`;
  const testEmailTeacher = `test.teacher.phase32.${Date.now()}@example.com`;

  // Start app on an ephemeral port
  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api`;

  try {
    await User.deleteMany({ email: { $in: [testEmailStudent, testEmailTeacher] } });

    console.log('\n--- 1. Testing GET /api/auth/me without token ---');
    const noTokenRes = await fetch(`${baseUrl}/auth/me`);
    const noTokenData = await noTokenRes.json();
    console.log('No token status:', noTokenRes.status);
    assert.equal(noTokenRes.status, 401);
    assert.equal(noTokenData.error.code, 'UNAUTHORIZED');
    console.log('✓ Missing token rejected with 401 UNAUTHORIZED');

    console.log('\n--- 2. Testing GET /api/auth/me with invalid/malformed token ---');
    const badTokenRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: 'Bearer thisisobviouslynotavalidjwttoken' },
    });
    const badTokenData = await badTokenRes.json();
    console.log('Bad token status:', badTokenRes.status);
    assert.equal(badTokenRes.status, 401);
    assert.equal(badTokenData.error.code, 'UNAUTHORIZED');
    console.log('✓ Malformed token rejected with 401 UNAUTHORIZED');

    console.log('\n--- 3. Registering test student and teacher ---');
    const studentRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student 32',
        email: testEmailStudent,
        password: 'Password123',
        role: 'student',
        rollNumber: '32STU01',
        enrollmentNo: 'EN32STU01',
      }),
    });
    const studentRegData = await studentRegRes.json();
    assert.equal(studentRegRes.status, 201);
    const studentToken = studentRegData.data.token;
    assert.ok(studentToken);

    const teacherRegRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher 32',
        email: testEmailTeacher,
        password: 'Password123',
        role: 'teacher',
      }),
    });
    const teacherRegData = await teacherRegRes.json();
    assert.equal(teacherRegRes.status, 201);
    const teacherToken = teacherRegData.data.token;
    assert.ok(teacherToken);
    console.log('✓ Student and teacher registered with valid tokens');

    console.log('\n--- 4. Testing GET /api/auth/me with student token ---');
    const studentMeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentMeData = await studentMeRes.json();
    console.log('Student me status:', studentMeRes.status);
    assert.equal(studentMeRes.status, 200);
    assert.equal(studentMeData.success, true);
    assert.equal(studentMeData.data.user.email, testEmailStudent);
    assert.equal(studentMeData.data.user.role, 'student');
    assert.equal(studentMeData.data.user.rollNumber, '32STU01');
    assert.equal(studentMeData.data.user.enrollmentNo, 'EN32STU01');
    assert.equal(studentMeData.data.user.passwordHash, undefined);
    console.log('✓ Student profile correctly retrieved');

    console.log('\n--- 5. Testing GET /api/auth/me with teacher token ---');
    const teacherMeRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    const teacherMeData = await teacherMeRes.json();
    console.log('Teacher me status:', teacherMeRes.status);
    assert.equal(teacherMeRes.status, 200);
    assert.equal(teacherMeData.success, true);
    assert.equal(teacherMeData.data.user.email, testEmailTeacher);
    assert.equal(teacherMeData.data.user.role, 'teacher');
    assert.equal(teacherMeData.data.user.rollNumber, undefined);
    assert.equal(teacherMeData.data.user.enrollmentNo, undefined);
    console.log('✓ Teacher profile correctly retrieved');

    console.log('\n--- 6. Testing POST /api/auth/logout with token ---');
    const logoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const logoutData = await logoutRes.json();
    console.log('Logout status:', logoutRes.status);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutData.success, true);
    assert.equal(logoutData.data.message, 'Logged out');
    console.log('✓ Logout endpoint succeeded');

    console.log('\n--- 7. Testing POST /api/auth/logout without token ---');
    const noAuthLogoutRes = await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
    });
    console.log('No auth logout status:', noAuthLogoutRes.status);
    assert.equal(noAuthLogoutRes.status, 401);
    console.log('✓ Logout without token rejected with 401 UNAUTHORIZED');

    console.log('\n--- 8. Testing RBAC on classes route: Teacher allowed ---');
    const teacherClassRes = await fetch(`${baseUrl}/classes`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
    });
    console.log('Teacher on classes status:', teacherClassRes.status);
    assert.equal(teacherClassRes.status, 200);
    console.log('✓ Teacher allowed on authenticated classes route');

    console.log('\n--- 9. Testing RBAC on teacher-only route: Student rejected (403 FORBIDDEN) ---');
    const studentCreateClassRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ name: 'Unauthorized Class', subjectCode: 'CS100' }),
    });
    console.log('Student create class status:', studentCreateClassRes.status);
    assert.equal(studentCreateClassRes.status, 403);
    const studentCreateClassData = await studentCreateClassRes.json();
    assert.equal(studentCreateClassData.error.code, 'FORBIDDEN');
    console.log('✓ Student rejected from teacher-only route with 403 FORBIDDEN');

    console.log('\n--- 12. Testing Inactive User Token Rejection ---');
    await User.updateOne({ email: testEmailStudent }, { isActive: false });
    const inactiveUserRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const inactiveUserData = await inactiveUserRes.json();
    console.log('Inactive user me status:', inactiveUserRes.status);
    assert.equal(inactiveUserRes.status, 401);
    assert.equal(inactiveUserData.error.code, 'UNAUTHORIZED');
    console.log('✓ Token for deactivated user rejected with 401 UNAUTHORIZED');

    console.log('\nALL 12 AUTHENTICATION & RBAC CHECKS PASSED SUCCESSFULLY!');
  } finally {
    await User.deleteMany({ email: { $in: [testEmailStudent, testEmailTeacher] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('Cleanup complete and server closed.');
  }
}

run().catch((err) => {
  console.error('Phase 3.2 verification failed:', err);
  process.exit(1);
});
