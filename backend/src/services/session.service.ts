import { Types } from 'mongoose';
import { AttendanceSession, IAttendanceSession, AttendanceSessionDocument } from '../models/AttendanceSession';
import { Class } from '../models/Class';
import { ClassMembership } from '../models/ClassMembership';
import { Attendance } from '../models/Attendance';
import { ApiError } from '../utils/ApiError';
import { generateSessionCode } from '../utils/sessionCode';
import { StartSessionInput, SessionQueryInput } from '../validators/session';

export function isSessionCompleted(session: { status: string; expiresAt: Date }): boolean {
  return session.status === 'ended' || session.expiresAt.getTime() <= Date.now();
}

/**
 * Shared helper to apply lazy expiry to a session document.
 * If active but past expiresAt, updates DB and sets status='ended', endedAt=expiresAt, endReason='expired'.
 */
export async function applyLazyExpiry(session: AttendanceSessionDocument): Promise<boolean> {
  if (session.status === 'active' && session.expiresAt.getTime() <= Date.now()) {
    session.status = 'ended';
    session.endedAt = session.expiresAt;
    session.endReason = 'expired';
    await session.save();
    return true;
  }
  return false;
}

/**
 * Shared helper to lazily close any expired active sessions for a class.
 */
export async function closeExpiredSessionsForClass(classId: Types.ObjectId): Promise<void> {
  const now = new Date();
  const expiredSessions = await AttendanceSession.find({
    classId,
    status: 'active',
    expiresAt: { $lte: now },
  });

  for (const s of expiredSessions) {
    s.status = 'ended';
    s.endedAt = s.expiresAt;
    s.endReason = 'expired';
    await s.save();
  }
}

export class SessionService {
  /**
   * 4.1 Start an attendance session (Teacher owner only).
   * First closes any expired-but-active session of the class.
   * Race-safe against concurrent starts via partial unique index { classId: 1 } where status='active'.
   */
  async start(teacherId: string, input: StartSessionInput) {
    if (!Types.ObjectId.isValid(input.classId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(input.classId),
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    // 1. Close any expired-but-active session for this class
    await closeExpiredSessionsForClass(classDoc._id);

    // 2. Pre-check if an active session is still running
    const existingActive = await AttendanceSession.findOne({
      classId: classDoc._id,
      status: 'active',
    });
    if (existingActive) {
      throw new ApiError(409, 'SESSION_ALREADY_ACTIVE', 'An attendance session is already active for this class');
    }

    // 3. Generate sessionCode and calculate expiry
    const sessionCode = generateSessionCode();
    const durationMinutes = input.durationMinutes || 10;
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

    const session = new AttendanceSession({
      classId: classDoc._id,
      teacherId: new Types.ObjectId(teacherId),
      sessionCode,
      title: input.title || '',
      startedAt,
      durationMinutes,
      expiresAt,
      status: 'active',
      endedAt: null,
      endReason: null,
    });

    try {
      await session.save();
    } catch (err: any) {
      // Catch Mongo duplicate key error on partial unique index { classId: 1, status: 'active' }
      if (err && (err.code === 11000 || err.code === 11001)) {
        throw new ApiError(409, 'SESSION_ALREADY_ACTIVE', 'An attendance session is already active for this class');
      }
      throw err;
    }

    const qrPayload = JSON.stringify({
      v: 1,
      classId: classDoc._id.toString(),
      code: sessionCode,
    });

    return {
      id: (session._id as any).toString(),
      classId: classDoc._id.toString(),
      title: session.title,
      sessionCode: session.sessionCode,
      status: session.status,
      startedAt: session.startedAt,
      expiresAt: session.expiresAt,
      durationMinutes: session.durationMinutes,
      qrPayload,
      serverTime: new Date(),
    };
  }

  /**
   * 4.2 List attendance sessions (Teacher owner or Student member).
   * Teacher gets sessionCode only while active, plus presentCount.
   * Student gets no sessionCode/counts; includes myStatus.
   */
  async list(user: { id: string; role: 'teacher' | 'student' }, query: SessionQueryInput) {
    if (!Types.ObjectId.isValid(query.classId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(query.classId),
      isActive: true,
    });

    if (!classDoc) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    if (user.role === 'teacher') {
      if (classDoc.teacherId.toString() !== user.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Class not found');
      }
    } else {
      // Student: must be actively enrolled
      const membership = await ClassMembership.findOne({
        classId: classDoc._id,
        studentId: new Types.ObjectId(user.id),
        status: 'active',
      });
      if (!membership) {
        throw new ApiError(404, 'NOT_FOUND', 'Class not found');
      }
    }

    // Lazily close any expired sessions for this class before querying
    await closeExpiredSessionsForClass(classDoc._id);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = { classId: classDoc._id };
    if (query.status) {
      filter.status = query.status;
    }

    const total = await AttendanceSession.countDocuments(filter);
    const sessions = await AttendanceSession.find(filter)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit);

    const sessionIds = sessions.map((s) => s._id);

    if (user.role === 'teacher') {
      // Compute presentCount for each session via aggregation
      const counts = await Attendance.aggregate([
        { $match: { sessionId: { $in: sessionIds }, status: 'present' } },
        { $group: { _id: '$sessionId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map<string, number>(counts.map((c) => [c._id.toString(), c.count]));

      const dtos = sessions.map((s) => ({
        id: (s._id as any).toString(),
        classId: s.classId.toString(),
        title: s.title,
        startedAt: s.startedAt,
        expiresAt: s.expiresAt,
        status: s.status,
        durationMinutes: s.durationMinutes,
        ...(s.status === 'active' && { sessionCode: s.sessionCode }),
        ...(s.endedAt && { endedAt: s.endedAt }),
        ...(s.endReason && { endReason: s.endReason }),
        presentCount: countMap.get(s._id.toString()) || 0,
      }));

      return {
        sessions: dtos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      // Student: lookup my attendance for ended sessions
      const userAttendances = await Attendance.find({
        sessionId: { $in: sessionIds },
        studentId: new Types.ObjectId(user.id),
      });
      const attendanceMap = new Map<string, string>(
        userAttendances.map((a) => [a.sessionId.toString(), a.status])
      );

      const dtos = sessions.map((s) => {
        let myStatus: 'present' | 'absent' | null = null;
        if (s.status === 'ended') {
          myStatus = attendanceMap.get(s._id.toString()) === 'present' ? 'present' : 'absent';
        }

        return {
          id: (s._id as any).toString(),
          classId: s.classId.toString(),
          title: s.title,
          startedAt: s.startedAt,
          expiresAt: s.expiresAt,
          status: s.status,
          durationMinutes: s.durationMinutes,
          ...(s.endedAt && { endedAt: s.endedAt }),
          ...(s.endReason && { endReason: s.endReason }),
          myStatus,
        };
      });

      return {
        sessions: dtos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }
  }

  /**
   * 4.3 Get session by ID (Role-specific payload).
   */
  async getById(id: string, user: { id: string; role: 'teacher' | 'student' }) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }

    const sessionDoc = await AttendanceSession.findById(id);
    if (!sessionDoc) {
      throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }

    const classDoc = await Class.findOne({
      _id: sessionDoc.classId,
      isActive: true,
    });

    if (!classDoc) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    // Apply lazy expiry
    await applyLazyExpiry(sessionDoc);

    if (user.role === 'teacher') {
      if (classDoc.teacherId.toString() !== user.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Session not found');
      }

      const presentCount = await Attendance.countDocuments({
        sessionId: sessionDoc._id,
        status: 'present',
      });
      const totalStudents = await ClassMembership.countDocuments({
        classId: classDoc._id,
        status: 'active',
      });

      const qrPayload = JSON.stringify({
        v: 1,
        classId: classDoc._id.toString(),
        code: sessionDoc.sessionCode,
      });

      return {
        id: (sessionDoc._id as any).toString(),
        classId: classDoc._id.toString(),
        title: sessionDoc.title,
        startedAt: sessionDoc.startedAt,
        expiresAt: sessionDoc.expiresAt,
        durationMinutes: sessionDoc.durationMinutes,
        status: sessionDoc.status,
        endedAt: sessionDoc.endedAt,
        endReason: sessionDoc.endReason,
        presentCount,
        totalStudents,
        ...(sessionDoc.status === 'active' && {
          sessionCode: sessionDoc.sessionCode,
          qrPayload,
          serverTime: new Date(),
        }),
      };
    } else {
      // Student: verify class membership
      const membership = await ClassMembership.findOne({
        classId: classDoc._id,
        studentId: new Types.ObjectId(user.id),
      });

      if (!membership) {
        throw new ApiError(404, 'NOT_FOUND', 'Session not found');
      }

      let myStatus: 'present' | 'absent' | null = null;
      if (sessionDoc.status === 'ended') {
        const att = await Attendance.findOne({
          sessionId: sessionDoc._id,
          studentId: new Types.ObjectId(user.id),
        });
        myStatus = att && att.status === 'present' ? 'present' : 'absent';
      }

      return {
        id: (sessionDoc._id as any).toString(),
        classId: classDoc._id.toString(),
        title: sessionDoc.title,
        startedAt: sessionDoc.startedAt,
        expiresAt: sessionDoc.expiresAt,
        durationMinutes: sessionDoc.durationMinutes,
        status: sessionDoc.status,
        endedAt: sessionDoc.endedAt,
        endReason: sessionDoc.endReason,
        myStatus,
      };
    }
  }

  /**
   * 4.4 End session manually (Teacher owner only).
   */
  async end(id: string, teacherId: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }

    const sessionDoc = await AttendanceSession.findById(id);
    if (!sessionDoc) {
      throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }

    const classDoc = await Class.findOne({
      _id: sessionDoc.classId,
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Session not found');
    }

    if (sessionDoc.status === 'ended') {
      throw new ApiError(409, 'SESSION_NOT_ACTIVE', 'Attendance session is not active');
    }

    if (sessionDoc.expiresAt.getTime() <= Date.now()) {
      sessionDoc.status = 'ended';
      sessionDoc.endedAt = sessionDoc.expiresAt;
      sessionDoc.endReason = 'expired';
      await sessionDoc.save();
      throw new ApiError(409, 'SESSION_NOT_ACTIVE', 'Attendance session is not active');
    }

    sessionDoc.status = 'ended';
    sessionDoc.endedAt = new Date();
    sessionDoc.endReason = 'manual';
    await sessionDoc.save();

    const presentCount = await Attendance.countDocuments({
      sessionId: sessionDoc._id,
      status: 'present',
    });

    return {
      id: (sessionDoc._id as any).toString(),
      status: sessionDoc.status,
      endedAt: sessionDoc.endedAt,
      endReason: sessionDoc.endReason,
      presentCount,
    };
  }
}

export const sessionService = new SessionService();
