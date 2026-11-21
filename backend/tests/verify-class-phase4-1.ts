import assert from 'node:assert/strict';
import { connectDB, disconnectDB } from '../src/config/db';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Class } from '../src/models/Class';
import { ClassMembership } from '../src/models/ClassMembership';
import type { Server } from 'node:http';

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  console.log('Connected to MongoDB.');

  const timestamp = Date.now();
  const teacherAEmail = `teacherA.${timestamp}@example.com`;
  const teacherBEmail = `teacherB.${timestamp}@example.com`;
  const studentAEmail = `studentA.${timestamp}@example.com`;
  const studentBEmail = `studentB.${timestamp}@example.com`;

  const server: Server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  const baseUrl = `http://localhost:${port}/api`;

  let createdClassId: string = '';

  try {
    console.log('\n--- 1. Registering 2 Teachers and 2 Students ---');
    const regTeacherA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher Alice',
        email: teacherAEmail,
        password: 'Password123',
        role: 'teacher',
      }),
    });
    const teacherAData = await regTeacherA.json();
    assert.equal(regTeacherA.status, 201);
    const teacherAToken = teacherAData.data.token;

    const regTeacherB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Teacher Bob',
        email: teacherBEmail,
        password: 'Password123',
        role: 'teacher',
      }),
    });
    const teacherBData = await regTeacherB.json();
    assert.equal(regTeacherB.status, 201);
    const teacherBToken = teacherBData.data.token;

    const regStudentA = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Charlie',
        email: studentAEmail,
        password: 'Password123',
        role: 'student',
        rollNumber: 'ROLL-CHA-01',
      }),
    });
    const studentAData = await regStudentA.json();
    assert.equal(regStudentA.status, 201);
    const studentAToken = studentAData.data.token;
    const studentAId = studentAData.data.user.id;

    const regStudentB = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Student Dave',
        email: studentBEmail,
        password: 'Password123',
        role: 'student',
        rollNumber: 'ROLL-DAV-02',
      }),
    });
    const studentBData = await regStudentB.json();
    assert.equal(regStudentB.status, 201);
    const studentBToken = studentBData.data.token;

    console.log('✓ All 4 users registered successfully');

    console.log('\n--- 2. Student creating class (Must be 403 FORBIDDEN) ---');
    const studentCreateRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentAToken}`,
      },
      body: JSON.stringify({
        name: 'Illegal Class',
        subjectCode: 'CS101',
      }),
    });
    console.log('Student create class status:', studentCreateRes.status);
    assert.equal(studentCreateRes.status, 403);
    const studentCreateData = await studentCreateRes.json();
    assert.equal(studentCreateData.error.code, 'FORBIDDEN');
    console.log('✓ Student correctly forbidden from creating class');

    console.log('\n--- 3. Teacher A creating a class ---');
    const teacherCreateRes = await fetch(`${baseUrl}/classes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherAToken}`,
      },
      body: JSON.stringify({
        name: 'Data Structures — Section A',
        subjectCode: 'cs301',
        description: 'Mon/Wed/Fri 10:00',
      }),
    });
    console.log('Teacher create class status:', teacherCreateRes.status);
    assert.equal(teacherCreateRes.status, 201);
    const teacherCreateData = await teacherCreateRes.json();
    assert.equal(teacherCreateData.success, true);
    assert.equal(teacherCreateData.data.class.name, 'Data Structures — Section A');
    assert.equal(teacherCreateData.data.class.subjectCode, 'CS301', 'Subject code must be uppercased');
    assert.equal(teacherCreateData.data.class.description, 'Mon/Wed/Fri 10:00');
    assert.ok(teacherCreateData.data.class.joinCode, 'joinCode must be present for teacher');
    assert.equal(teacherCreateData.data.class.joinCode.length, 6);
    assert.equal(teacherCreateData.data.class.studentCount, 0);
    createdClassId = teacherCreateData.data.class.id;
    console.log('✓ Class created with id:', createdClassId, 'joinCode:', teacherCreateData.data.class.joinCode);

    console.log('\n--- 4. Teacher A lists classes ---');
    const teacherListRes = await fetch(`${baseUrl}/classes`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    console.log('Teacher list status:', teacherListRes.status);
    assert.equal(teacherListRes.status, 200);
    const teacherListData = await teacherListRes.json();
    assert.equal(teacherListData.success, true);
    assert.equal(teacherListData.data.classes.length, 1);
    assert.equal(teacherListData.data.classes[0].joinCode, teacherCreateData.data.class.joinCode);
    assert.equal(teacherListData.meta.total, 1);
    assert.equal(teacherListData.meta.page, 1);
    console.log('✓ Teacher list returned classes with joinCode and pagination meta');

    console.log('\n--- 5. Student A lists classes before enrolling ---');
    const studentListBeforeRes = await fetch(`${baseUrl}/classes`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    const studentListBeforeData = await studentListBeforeRes.json();
    assert.equal(studentListBeforeRes.status, 200);
    assert.equal(studentListBeforeData.data.classes.length, 0);
    console.log('✓ Student sees 0 classes prior to enrollment');

    console.log('\n--- 6. Enroll Student A into Class ---');
    await ClassMembership.create({
      classId: createdClassId,
      studentId: studentAId,
      status: 'active',
      joinedAt: new Date(),
    });
    console.log('✓ Student A membership created directly in DB');

    console.log('\n--- 7. Student A lists classes after enrolling ---');
    const studentListAfterRes = await fetch(`${baseUrl}/classes`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    const studentListAfterData = await studentListAfterRes.json();
    assert.equal(studentListAfterRes.status, 200);
    assert.equal(studentListAfterData.data.classes.length, 1);
    const enrolledClass = studentListAfterData.data.classes[0];
    assert.equal(enrolledClass.joinCode, undefined, 'joinCode must NOT be visible to student');
    assert.equal(enrolledClass.teacher.name, 'Teacher Alice');
    assert.equal(enrolledClass.studentCount, 1);
    console.log('✓ Student list includes teacher info, studentCount, and omits joinCode');

    console.log('\n--- 8. Teacher A gets class by ID ---');
    const teacherGetRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    assert.equal(teacherGetRes.status, 200);
    const teacherGetData = await teacherGetRes.json();
    assert.equal(teacherGetData.data.class.joinCode, teacherCreateData.data.class.joinCode);
    assert.equal(teacherGetData.data.class.studentCount, 1);
    assert.equal(teacherGetData.data.class.activeSession, null);
    console.log('✓ Teacher gets full class details with joinCode and activeSession: null');

    console.log('\n--- 9. Student A gets class by ID ---');
    const studentGetRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    assert.equal(studentGetRes.status, 200);
    const studentGetData = await studentGetRes.json();
    assert.equal(studentGetData.data.class.joinCode, undefined, 'joinCode forbidden for students');
    assert.equal(studentGetData.data.class.teacher.name, 'Teacher Alice');
    assert.equal(studentGetData.data.class.studentCount, 1);
    assert.equal(studentGetData.data.class.activeSession, null);
    console.log('✓ Student gets class details with teacher, without joinCode');

    console.log('\n--- 10. Student B (not enrolled) gets class by ID (404 NOT_FOUND) ---');
    const studentBGetRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${studentBToken}` },
    });
    console.log('Student B get status:', studentBGetRes.status);
    assert.equal(studentBGetRes.status, 404);
    const studentBGetData = await studentBGetRes.json();
    assert.equal(studentBGetData.error.code, 'NOT_FOUND');
    console.log('✓ Unenrolled student receives 404 NOT_FOUND');

    console.log('\n--- 11. Teacher B (not owner) gets class by ID (404 NOT_FOUND) ---');
    const teacherBGetRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    console.log('Teacher B get status:', teacherBGetRes.status);
    assert.equal(teacherBGetRes.status, 404);
    const teacherBGetData = await teacherBGetRes.json();
    assert.equal(teacherBGetData.error.code, 'NOT_FOUND');
    console.log('✓ Non-owner teacher receives 404 NOT_FOUND');

    console.log('\n--- 12. Teacher B attempts to update Teacher A class (404 NOT_FOUND) ---');
    const teacherBUpdateRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherBToken}`,
      },
      body: JSON.stringify({ name: 'Hacked Name' }),
    });
    assert.equal(teacherBUpdateRes.status, 404);
    console.log('✓ Non-owner teacher cannot update class');

    console.log('\n--- 13. Teacher A updates class name ---');
    const teacherAUpdateRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherAToken}`,
      },
      body: JSON.stringify({
        name: 'Advanced Data Structures',
        description: 'Updated description',
      }),
    });
    assert.equal(teacherAUpdateRes.status, 200);
    const teacherAUpdateData = await teacherAUpdateRes.json();
    assert.equal(teacherAUpdateData.data.class.name, 'Advanced Data Structures');
    assert.equal(teacherAUpdateData.data.class.description, 'Updated description');
    assert.equal(teacherAUpdateData.data.class.joinCode, teacherCreateData.data.class.joinCode, 'joinCode must remain unchanged');
    console.log('✓ Teacher successfully updated class fields while joinCode remained immutable');

    console.log('\n--- 14. Teacher B attempts to delete Teacher A class (404 NOT_FOUND) ---');
    const teacherBDeleteRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherBToken}` },
    });
    assert.equal(teacherBDeleteRes.status, 404);
    console.log('✓ Non-owner teacher cannot delete class');

    console.log('\n--- 15. Teacher A soft-deletes class ---');
    const teacherADeleteRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    assert.equal(teacherADeleteRes.status, 200);
    const teacherADeleteData = await teacherADeleteRes.json();
    assert.equal(teacherADeleteData.data.message, 'Class deleted');

    // Verify soft delete in DB
    const dbClass = await Class.findById(createdClassId);
    assert.ok(dbClass, 'Document must still exist in DB');
    assert.equal(dbClass.isActive, false, 'isActive must be false');
    assert.ok(dbClass.deletedAt !== null, 'deletedAt must be set');
    console.log('✓ Class successfully soft deleted');

    console.log('\n--- 16. Verify deleted class is omitted from lists and getById ---');
    const teacherListAfterDeleteRes = await fetch(`${baseUrl}/classes`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    const teacherListAfterDeleteData = await teacherListAfterDeleteRes.json();
    assert.equal(teacherListAfterDeleteData.data.classes.length, 0);

    const teacherGetDeletedRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${teacherAToken}` },
    });
    assert.equal(teacherGetDeletedRes.status, 404);

    const studentGetDeletedRes = await fetch(`${baseUrl}/classes/${createdClassId}`, {
      headers: { Authorization: `Bearer ${studentAToken}` },
    });
    assert.equal(studentGetDeletedRes.status, 404);
    console.log('✓ Deleted class is omitted from all listings and returns 404 on getById');

    console.log('\nALL 16 PHASE 4.1 CLASS LIFECYCLE CHECKS PASSED SUCCESSFULLY!');
  } finally {
    if (createdClassId) {
      await Class.deleteOne({ _id: createdClassId });
      await ClassMembership.deleteMany({ classId: createdClassId });
    }
    await User.deleteMany({
      email: { $in: [teacherAEmail, teacherBEmail, studentAEmail, studentBEmail] },
    });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await disconnectDB();
    console.log('Cleanup complete and server closed.');
  }
}

run().catch((err) => {
  console.error('Phase 4.1 verification failed:', err);
  process.exit(1);
});
