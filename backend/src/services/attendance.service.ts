import { Types } from 'mongoose';
import { User } from '../models/User';
import { Class } from '../models/Class';
import { ClassMembership } from '../models/ClassMembership';
import { AttendanceSession } from '../models/AttendanceSession';
import { Attendance } from '../models/Attendance';
import { ApiError } from '../utils/ApiError';
import { calculatePercentage } from '../utils/percentage';
import { ATTENDANCE_WARNING_THRESHOLD } from '../config/constants';
import {
  MarkAttendanceInput,
  ManualAttendanceInput,
  PaginationQueryInput,
  StudentAttendanceQueryInput,
  MyAttendanceQueryInput,
} from '../validators/attendance';

export interface AttendanceDto {
  id: string;
  sessionId: string;
  classId?: string;
  studentId?: string;
  status: 'present' | 'absent';
  method: 'code' | 'manual';
  markedAt: string;
}

export interface AttendanceStats {
  totalSessions: number;
  presentCount: number;
  percentage: number | null;
  belowThreshold: boolean;
}

export interface SessionRosterItem {
  studentId: string;
  name: string;
  rollNumber: string;
  status: 'present' | 'absent';
  method: 'code' | 'manual' | null;
  markedAt: string | null;
}

export interface SessionAttendanceResult {
  session: {
    id: string;
    title: string;
    startedAt: string;
    status: 'active' | 'ended';
  };
  counts: {
    present: number;
    absent: number;
    total: number;
  };
  roster: SessionRosterItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StudentSummaryItem extends AttendanceStats {
  studentId: string;
  name: string;
  rollNumber: string;
}

export interface ClassSummaryResult {
  classId: string;
  totalSessions: number;
  warningThreshold: number;
  students: StudentSummaryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AttendanceHistoryItem {
  sessionId: string;
  title: string;
  startedAt: string;
  status: 'present' | 'absent';
  method: 'code' | 'manual' | null;
}

export interface StudentAttendanceHistoryResult {
  student: {
    id: string;
    name: string;
    rollNumber: string;
  };
  summary: AttendanceStats;
  history: AttendanceHistoryItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MyClassSummaryItem extends AttendanceStats {
  classId: string;
  name: string;
  subjectCode: string;
}

export interface MyClassesSummaryResult {
  warningThreshold: number;
  classes: MyClassSummaryItem[];
}

/**
 * Shared calculation function that computes {totalSessions, presentCount, percentage, belowThreshold}.
 * totalSessions = completed sessions (status ended OR expiresAt <= now) with startedAt >= student's membership joinedAt.
 * presentCount = Attendance records with status 'present' for those completed sessions.
 */
export function computeStatsFromData(
  joinedAt: Date,
  completedSessions: { _id: Types.ObjectId | string; startedAt: Date }[],
  presentSessionIdSet: Set<string>
): AttendanceStats {
  const joinedTime = new Date(joinedAt).getTime();
  const eligibleSessions = completedSessions.filter(
    (s) => new Date(s.startedAt).getTime() >= joinedTime
  );
  const totalSessions = eligibleSessions.length;

  let presentCount = 0;
  for (const s of eligibleSessions) {
    const sId = s._id.toString();
    if (presentSessionIdSet.has(sId)) {
      presentCount++;
    }
  }

  const percentage = calculatePercentage(presentCount, totalSessions);
  const belowThreshold = percentage !== null && percentage < ATTENDANCE_WARNING_THRESHOLD;

  return {
    totalSessions,
    presentCount,
    percentage,
    belowThreshold,
  };
}

export class AttendanceService {
  /**
   * Compute attendance stats for a specific student and class.
   * Can query the DB or use pre-loaded data.
   */
  async computeAttendanceStats(
    studentId: string,
    classId: string,
    joinedAt?: Date
  ): Promise<AttendanceStats> {
    let studentJoinedAt = joinedAt;
    if (!studentJoinedAt) {
      const membership = await ClassMembership.findOne({ classId, studentId });
      if (!membership) {
        return {
          totalSessions: 0,
          presentCount: 0,
          percentage: null,
          belowThreshold: false,
        };
      }
      studentJoinedAt = membership.joinedAt;
    }

    const now = new Date();
    const completedSessions = await AttendanceSession.find({
      classId,
      $or: [{ status: 'ended' }, { expiresAt: { $lte: now } }],
    })
      .select('_id startedAt')
      .lean();

    const attendances = await Attendance.find({
      classId,
      studentId: new Types.ObjectId(studentId),
      status: 'present',
    })
      .select('sessionId')
      .lean();

    const presentSessionIdSet = new Set<string>(
      attendances.map((a) => a.sessionId.toString())
    );

    return computeStatsFromData(studentJoinedAt, completedSessions, presentSessionIdSet);
  }

  /**
   * Mark attendance via 6-digit session code (Student only).
   */
  async markAttendance(
    studentId: string,
    input: MarkAttendanceInput
  ): Promise<AttendanceDto> {
    const cls = await Class.findOne({ _id: input.classId, isActive: true });
    if (!cls) {
      throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
    }

    const membership = await ClassMembership.findOne({
      classId: input.classId,
      studentId,
    });

    if (!membership) {
      throw new ApiError(403, 'NOT_ENROLLED', 'You are not enrolled in this class');
    }

    if (membership.status === 'removed') {
      throw new ApiError(
        403,
        'REMOVED_FROM_CLASS',
        'You have been removed from this class'
      );
    }

    if (membership.status !== 'active') {
      throw new ApiError(403, 'NOT_ENROLLED', 'You are not an active member of this class');
    }

    const session = await AttendanceSession.findOne({
      classId: input.classId,
      status: 'active',
    });

    if (!session) {
      throw new ApiError(400, 'INVALID_SESSION_CODE', 'Invalid session code');
    }

    const now = new Date();
    if (session.expiresAt <= now) {
      session.status = 'ended';
      session.endedAt = session.expiresAt;
      session.endReason = 'expired';
      await session.save();
      throw new ApiError(410, 'SESSION_EXPIRED', 'Attendance session has expired');
    }

    if (session.sessionCode !== input.sessionCode) {
      throw new ApiError(400, 'INVALID_SESSION_CODE', 'Invalid session code');
    }

    try {
      const attendance = await Attendance.create({
        sessionId: session._id,
        classId: session.classId,
        studentId: new Types.ObjectId(studentId),
        status: 'present',
        method: 'code',
        markedAt: now,
        markedBy: new Types.ObjectId(studentId),
      });

      return {
        id: attendance._id.toString(),
        sessionId: attendance.sessionId.toString(),
        classId: attendance.classId.toString(),
        status: attendance.status,
        method: attendance.method,
        markedAt: attendance.markedAt.toISOString(),
      };
    } catch (err: unknown) {
      const mongoErr = err as { code?: number; keyPattern?: Record<string, number> };
      if (mongoErr && (mongoErr.code === 11000 || mongoErr.code === 11001)) {
        throw new ApiError(
          409,
          'ALREADY_MARKED',
          'Attendance has already been marked for this session'
        );
      }
      throw err;
    }
  }

  /**
   * Teacher manual marking (upsert).
   */
  async manualMarkAttendance(
    teacherId: string,
    input: ManualAttendanceInput
  ): Promise<AttendanceDto> {
    const session = await AttendanceSession.findById(input.sessionId);
    if (!session) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    const cls = await Class.findById(session.classId);
    if (!cls || !cls.isActive) {
      throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
    }

    if (cls.teacherId.toString() !== teacherId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to manage attendance for this class'
      );
    }

    const membership = await ClassMembership.findOne({
      classId: session.classId,
      studentId: input.studentId,
      status: 'active',
    });

    if (!membership) {
      throw new ApiError(
        404,
        'STUDENT_NOT_ENROLLED',
        'Student is not an active member of this class'
      );
    }

    const attendance = await Attendance.findOneAndUpdate(
      {
        sessionId: session._id,
        studentId: new Types.ObjectId(input.studentId),
      },
      {
        $set: {
          classId: session.classId,
          status: input.status,
          method: 'manual',
          markedAt: new Date(),
          markedBy: new Types.ObjectId(teacherId),
        },
        $setOnInsert: {
          sessionId: session._id,
          studentId: new Types.ObjectId(input.studentId),
        },
      },
      {
        returnDocument: 'after',
        upsert: true,
        runValidators: true,
      }
    );

    if (!attendance) {
      throw new ApiError(500, 'INTERNAL_ERROR', 'Failed to update attendance');
    }

    return {
      id: attendance._id.toString(),
      sessionId: attendance.sessionId.toString(),
      studentId: attendance.studentId.toString(),
      status: attendance.status,
      method: attendance.method,
      markedAt: attendance.markedAt.toISOString(),
    };
  }

  /**
   * GET /api/attendance/session/:sessionId (Teacher owner only)
   * Roster = active members union students who have a record for this session;
   * students without a record are marked absent.
   */
  async getSessionAttendance(
    teacherId: string,
    sessionId: string,
    pagination: PaginationQueryInput
  ): Promise<SessionAttendanceResult> {
    const session = await AttendanceSession.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
    }

    const cls = await Class.findById(session.classId);
    if (!cls || !cls.isActive) {
      throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
    }

    if (cls.teacherId.toString() !== teacherId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view attendance for this class'
      );
    }

    const now = new Date();
    const isEnded = session.status === 'ended' || session.expiresAt <= now;
    const sessionStatus: 'active' | 'ended' = isEnded ? 'ended' : 'active';

    // 1. Find active members
    const activeMembers = await ClassMembership.find({
      classId: session.classId,
      status: 'active',
    }).lean();

    // 2. Find attendance records for this session
    const attendanceRecords = await Attendance.find({
      sessionId: session._id,
    }).lean();

    const attMap = new Map<string, (typeof attendanceRecords)[0]>();
    for (const record of attendanceRecords) {
      attMap.set(record.studentId.toString(), record);
    }

    // 3. Union active members + students who marked attendance
    const studentIdSet = new Set<string>();
    activeMembers.forEach((m) => studentIdSet.add(m.studentId.toString()));
    attendanceRecords.forEach((a) => studentIdSet.add(a.studentId.toString()));

    const students = await User.find({
      _id: { $in: Array.from(studentIdSet) },
    }).lean();

    // 4. Build roster
    const roster: SessionRosterItem[] = students.map((s) => {
      const att = attMap.get(s._id.toString());
      if (att) {
        return {
          studentId: s._id.toString(),
          name: s.name,
          rollNumber: s.rollNumber || '',
          status: att.status,
          method: att.method,
          markedAt: att.markedAt.toISOString(),
        };
      }
      return {
        studentId: s._id.toString(),
        name: s.name,
        rollNumber: s.rollNumber || '',
        status: 'absent',
        method: null,
        markedAt: null,
      };
    });

    // 5. Sort roster by rollNumber
    roster.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

    // 6. Counts
    let present = 0;
    let absent = 0;
    for (const item of roster) {
      if (item.status === 'present') {
        present++;
      } else {
        absent++;
      }
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    const paginatedRoster = roster.slice(skip, skip + limit);

    return {
      session: {
        id: session._id.toString(),
        title: session.title || '',
        startedAt: session.startedAt.toISOString(),
        status: sessionStatus,
      },
      counts: {
        present,
        absent,
        total: roster.length,
      },
      roster: paginatedRoster,
      meta: {
        page,
        limit,
        total: roster.length,
        totalPages: Math.ceil(roster.length / limit) || 1,
      },
    };
  }

  /**
   * GET /api/attendance/class/:classId/summary (Teacher owner only)
   * Computed with one sessions query + one attendance query, in memory.
   */
  async getClassAttendanceSummary(
    teacherId: string,
    classId: string,
    pagination: PaginationQueryInput
  ): Promise<ClassSummaryResult> {
    const cls = await Class.findById(classId);
    if (!cls || !cls.isActive) {
      throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
    }

    if (cls.teacherId.toString() !== teacherId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view attendance for this class'
      );
    }

    const now = new Date();

    // 1. Single sessions query (completed sessions)
    const completedSessions = await AttendanceSession.find({
      classId: cls._id,
      $or: [{ status: 'ended' }, { expiresAt: { $lte: now } }],
    })
      .select('_id startedAt')
      .lean();

    // 2. Active memberships populated with user info
    const memberships = await ClassMembership.find({
      classId: cls._id,
      status: 'active',
    })
      .populate<{ studentId: { _id: Types.ObjectId; name: string; rollNumber?: string } }>(
        'studentId',
        'name rollNumber'
      )
      .lean();

    // 3. Single attendance query (all present records for this class)
    const attendances = await Attendance.find({
      classId: cls._id,
      status: 'present',
    })
      .select('studentId sessionId')
      .lean();

    const studentPresentMap = new Map<string, Set<string>>();
    for (const a of attendances) {
      const sId = a.studentId.toString();
      if (!studentPresentMap.has(sId)) {
        studentPresentMap.set(sId, new Set<string>());
      }
      studentPresentMap.get(sId)!.add(a.sessionId.toString());
    }

    // 4. In-memory stats calculation per active student
    const studentList: StudentSummaryItem[] = [];
    for (const m of memberships) {
      const studentObj = m.studentId;
      if (!studentObj) continue;
      const sId = studentObj._id.toString();
      const presentSet = studentPresentMap.get(sId) || new Set<string>();

      const stats = computeStatsFromData(m.joinedAt, completedSessions, presentSet);
      studentList.push({
        studentId: sId,
        name: studentObj.name,
        rollNumber: studentObj.rollNumber || '',
        ...stats,
      });
    }

    // 5. Sort by rollNumber
    studentList.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));

    // 6. Paginate
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;
    const skip = (page - 1) * limit;
    const paginatedStudents = studentList.slice(skip, skip + limit);

    return {
      classId: cls._id.toString(),
      totalSessions: completedSessions.length,
      warningThreshold: ATTENDANCE_WARNING_THRESHOLD,
      students: paginatedStudents,
      meta: {
        page,
        limit,
        total: studentList.length,
        totalPages: Math.ceil(studentList.length / limit) || 1,
      },
    };
  }

  /**
   * GET /api/attendance/student/:studentId?classId= (Teacher owner of classId)
   */
  async getStudentAttendanceHistory(
    teacherId: string,
    studentId: string,
    query: StudentAttendanceQueryInput
  ): Promise<StudentAttendanceHistoryResult> {
    const cls = await Class.findById(query.classId);
    if (!cls || !cls.isActive) {
      throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
    }

    if (cls.teacherId.toString() !== teacherId) {
      throw new ApiError(
        403,
        'FORBIDDEN',
        'You do not have permission to view attendance for this class'
      );
    }

    const membership = await ClassMembership.findOne({
      classId: query.classId,
      studentId,
    });

    if (!membership) {
      throw new ApiError(
        404,
        'STUDENT_NOT_ENROLLED',
        'Student is not enrolled in this class'
      );
    }

    const studentUser = await User.findById(studentId);
    if (!studentUser) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'Student user not found');
    }

    const now = new Date();
    // Completed sessions since joinedAt, newest first
    const eligibleSessions = await AttendanceSession.find({
      classId: query.classId,
      startedAt: { $gte: membership.joinedAt },
      $or: [{ status: 'ended' }, { expiresAt: { $lte: now } }],
    })
      .sort({ startedAt: -1 })
      .lean();

    const attendances = await Attendance.find({
      classId: query.classId,
      studentId: new Types.ObjectId(studentId),
    }).lean();

    const attMap = new Map<string, (typeof attendances)[0]>();
    const presentSet = new Set<string>();
    for (const a of attendances) {
      attMap.set(a.sessionId.toString(), a);
      if (a.status === 'present') {
        presentSet.add(a.sessionId.toString());
      }
    }

    const summary = computeStatsFromData(
      membership.joinedAt,
      eligibleSessions,
      presentSet
    );

    const history: AttendanceHistoryItem[] = eligibleSessions.map((session) => {
      const att = attMap.get(session._id.toString());
      return {
        sessionId: session._id.toString(),
        title: session.title || '',
        startedAt: session.startedAt.toISOString(),
        status: att ? att.status : 'absent',
        method: att ? att.method : null,
      };
    });

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const paginatedHistory = history.slice(skip, skip + limit);

    return {
      student: {
        id: studentUser._id.toString(),
        name: studentUser.name,
        rollNumber: studentUser.rollNumber || '',
      },
      summary,
      history: paginatedHistory,
      meta: {
        page,
        limit,
        total: history.length,
        totalPages: Math.ceil(history.length / limit) || 1,
      },
    };
  }

  /**
   * GET /api/attendance/my (Student only)
   * Without classId: summary across all joined classes.
   * With classId: summary + history identical to teacher view.
   */
  async getMyAttendance(
    studentId: string,
    query: MyAttendanceQueryInput
  ): Promise<MyClassesSummaryResult | StudentAttendanceHistoryResult> {
    const studentUser = await User.findById(studentId);
    if (!studentUser) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    if (query.classId) {
      // With classId: verify membership
      const membership = await ClassMembership.findOne({
        classId: query.classId,
        studentId,
      });

      if (!membership) {
        throw new ApiError(404, 'NOT_ENROLLED', 'Class not joined');
      }

      const cls = await Class.findById(query.classId);
      if (!cls || !cls.isActive) {
        throw new ApiError(404, 'CLASS_NOT_FOUND', 'Class not found or inactive');
      }

      const now = new Date();
      const eligibleSessions = await AttendanceSession.find({
        classId: query.classId,
        startedAt: { $gte: membership.joinedAt },
        $or: [{ status: 'ended' }, { expiresAt: { $lte: now } }],
      })
        .sort({ startedAt: -1 })
        .lean();

      const attendances = await Attendance.find({
        classId: query.classId,
        studentId: new Types.ObjectId(studentId),
      }).lean();

      const attMap = new Map<string, (typeof attendances)[0]>();
      const presentSet = new Set<string>();
      for (const a of attendances) {
        attMap.set(a.sessionId.toString(), a);
        if (a.status === 'present') {
          presentSet.add(a.sessionId.toString());
        }
      }

      const summary = computeStatsFromData(
        membership.joinedAt,
        eligibleSessions,
        presentSet
      );

      const history: AttendanceHistoryItem[] = eligibleSessions.map((session) => {
        const att = attMap.get(session._id.toString());
        return {
          sessionId: session._id.toString(),
          title: session.title || '',
          startedAt: session.startedAt.toISOString(),
          status: att ? att.status : 'absent',
          method: att ? att.method : null,
        };
      });

      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
      const paginatedHistory = history.slice(skip, skip + limit);

      return {
        student: {
          id: studentUser._id.toString(),
          name: studentUser.name,
          rollNumber: studentUser.rollNumber || '',
        },
        summary,
        history: paginatedHistory,
        meta: {
          page,
          limit,
          total: history.length,
          totalPages: Math.ceil(history.length / limit) || 1,
        },
      };
    } else {
      // Without classId: summary across all joined classes with active membership
      const memberships = await ClassMembership.find({
        studentId,
        status: 'active',
      })
        .populate<{ classId: { _id: Types.ObjectId; name: string; subjectCode: string; isActive: boolean } }>(
          'classId',
          'name subjectCode isActive'
        )
        .lean();

      const classSummaries: MyClassSummaryItem[] = [];
      const now = new Date();

      for (const m of memberships) {
        const c = m.classId;
        if (!c || !c.isActive) continue;

        const completedSessions = await AttendanceSession.find({
          classId: c._id,
          $or: [{ status: 'ended' }, { expiresAt: { $lte: now } }],
        })
          .select('_id startedAt')
          .lean();

        const attendances = await Attendance.find({
          classId: c._id,
          studentId: new Types.ObjectId(studentId),
          status: 'present',
        })
          .select('sessionId')
          .lean();

        const presentSet = new Set<string>(
          attendances.map((a) => a.sessionId.toString())
        );

        const stats = computeStatsFromData(m.joinedAt, completedSessions, presentSet);
        classSummaries.push({
          classId: c._id.toString(),
          name: c.name,
          subjectCode: c.subjectCode,
          ...stats,
        });
      }

      return {
        warningThreshold: ATTENDANCE_WARNING_THRESHOLD,
        classes: classSummaries,
      };
    }
  }
}

export const attendanceService = new AttendanceService();
