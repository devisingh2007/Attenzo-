import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { verifyToken } from '../src/utils/jwt';
import type { Server } from 'node:http';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected to MongoDB.');

  const testEmailStudent = `test.student.${Date.now()}@example.com`;
  const testEmailTeacher = `test.teacher.${Date.now()}@example.com`;

  // Start app on an ephemeral port
  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api/auth`;

  try {
    // Clean up any old test users
    await User.deleteMany({ email: { $in: [testEmailStudent, testEmailTeacher] } });

    console.log('\n--- 1. Testing Student Registration ---');
    const studentRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: testEmailStudent,
        password: 'Password123',
        role: 'student',
        rollNumber: '21CE099',
        enrollmentNo: 'EN210099',
      }),
    });
    const studentData = await studentRes.json();
    console.log('Student reg status:', studentRes.status);
    assert.equal(studentRes.status, 201, 'Student reg must be 201');
    assert.equal(studentData.success, true);
    assert.equal(studentData.data.user.email, testEmailStudent);
    assert.equal(studentData.data.user.role, 'student');
    assert.equal(studentData.data.user.rollNumber, '21CE099');
    assert.equal(studentData.data.user.enrollmentNo, 'EN210099');
    assert.equal(studentData.data.user.passwordHash, undefined, 'passwordHash must not be exposed');
    assert.ok(studentData.data.token, 'token must be returned');

    // Verify token
    const studentTokenPayload = verifyToken(studentData.data.token);
    assert.equal(studentTokenPayload.sub, studentData.data.user.id);
    assert.equal(studentTokenPayload.role, 'student');
    console.log('✓ Student registration and token verified');

    console.log('\n--- 2. Testing Student Registration without rollNumber ---');
    const invalidStudentRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'No Roll Student',
        email: `noroll.${Date.now()}@example.com`,
        password: 'Password123',
        role: 'student',
      }),
    });
    const invalidStudentData = await invalidStudentRes.json();
    console.log('Invalid student status:', invalidStudentRes.status);
    assert.equal(invalidStudentRes.status, 400);
    assert.equal(invalidStudentData.error.code, 'VALIDATION_ERROR');
    console.log('✓ Missing rollNumber rejected with VALIDATION_ERROR');

    console.log('\n--- 3. Testing Teacher Registration ---');
    const teacherRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Prof Test',
        email: testEmailTeacher,
        password: 'Password123',
        role: 'teacher',
      }),
    });
    const teacherData = await teacherRes.json();
    console.log('Teacher reg status:', teacherRes.status);
    assert.equal(teacherRes.status, 201);
    assert.equal(teacherData.success, true);
    assert.equal(teacherData.data.user.role, 'teacher');
    assert.equal(teacherData.data.user.rollNumber, undefined);
    assert.equal(teacherData.data.user.enrollmentNo, undefined);
    assert.ok(teacherData.data.token);
    console.log('✓ Teacher registration verified');

    console.log('\n--- 4. Testing Teacher Registration with rollNumber (Forbidden) ---');
    const teacherWithRollRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher With Roll',
        email: `twroll.${Date.now()}@example.com`,
        password: 'Password123',
        role: 'teacher',
        rollNumber: 'ROLL123',
      }),
    });
    const teacherWithRollData = await teacherWithRollRes.json();
    console.log('Teacher with roll status:', teacherWithRollRes.status);
    assert.equal(teacherWithRollRes.status, 400);
    assert.equal(teacherWithRollData.error.code, 'VALIDATION_ERROR');
    console.log('✓ Teacher with rollNumber rejected with VALIDATION_ERROR');

    console.log('\n--- 5. Testing Duplicate Email Registration ---');
    const dupRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Student',
        email: testEmailStudent,
        password: 'Password123',
        role: 'student',
        rollNumber: '21CE999',
      }),
    });
    const dupData = await dupRes.json();
    console.log('Duplicate status:', dupRes.status);
    assert.equal(dupRes.status, 409);
    assert.equal(dupData.error.code, 'EMAIL_ALREADY_EXISTS');
    console.log('✓ Duplicate email rejected with 409 EMAIL_ALREADY_EXISTS');

    console.log('\n--- 6. Testing Weak Password (<8 chars or no numbers) ---');
    const weakPassRes = await fetch(`${baseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Weak Pass',
        email: `weak.${Date.now()}@example.com`,
        password: 'password', // no numbers
        role: 'student',
        rollNumber: '21CE000',
      }),
    });
    const weakPassData = await weakPassRes.json();
    console.log('Weak password status:', weakPassRes.status);
    assert.equal(weakPassRes.status, 400);
    assert.equal(weakPassData.error.code, 'VALIDATION_ERROR');
    console.log('✓ Password without numbers rejected with VALIDATION_ERROR');

    console.log('\n--- 7. Testing Valid Login ---');
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailStudent,
        password: 'Password123',
      }),
    });
    const loginData = await loginRes.json();
    console.log('Login status:', loginRes.status);
    assert.equal(loginRes.status, 200);
    assert.equal(loginData.success, true);
    assert.equal(loginData.data.user.email, testEmailStudent);
    assert.ok(loginData.data.token);
    console.log('✓ Valid login returned user and token');

    console.log('\n--- 8. Testing Login with Wrong Password ---');
    const wrongPassRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailStudent,
        password: 'WrongPassword999',
      }),
    });
    const wrongPassData = await wrongPassRes.json();
    console.log('Wrong pass status:', wrongPassRes.status);
    assert.equal(wrongPassRes.status, 401);
    assert.equal(wrongPassData.error.code, 'INVALID_CREDENTIALS');
    console.log('✓ Wrong password returned 401 INVALID_CREDENTIALS');

    console.log('\n--- 9. Testing Login with Unknown Email ---');
    const unknownEmailRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nobody@nowhere.com',
        password: 'Password123',
      }),
    });
    const unknownEmailData = await unknownEmailRes.json();
    console.log('Unknown email status:', unknownEmailRes.status);
    assert.equal(unknownEmailRes.status, 401);
    assert.equal(unknownEmailData.error.code, 'INVALID_CREDENTIALS');
    assert.equal(unknownEmailData.error.message, wrongPassData.error.message, 'Must return identical message');
    console.log('✓ Unknown email returned identical 401 INVALID_CREDENTIALS');

    console.log('\n--- 10. Testing Login with Inactive User ---');
    await User.updateOne({ email: testEmailStudent }, { isActive: false });
    const inactiveRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailStudent,
        password: 'Password123',
      }),
    });
    const inactiveData = await inactiveRes.json();
    console.log('Inactive user status:', inactiveRes.status);
    assert.equal(inactiveRes.status, 401);
    assert.equal(inactiveData.error.code, 'INVALID_CREDENTIALS');
    console.log('✓ Inactive user returned 401 INVALID_CREDENTIALS');

    console.log('\nALL 10 AUTH VERIFICATION CHECKS PASSED SUCCESSFULLY!');
  } finally {
    // Clean up
    await User.deleteMany({ email: { $in: [testEmailStudent, testEmailTeacher] } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('Cleanup complete and server closed.');
  }
}

run().catch((err) => {
  console.error('Auth verification failed:', err);
  process.exit(1);
});
