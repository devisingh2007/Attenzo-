import { Types } from 'mongoose';
import { Class, IClass } from '../models/Class';
import { ClassMembership } from '../models/ClassMembership';
import { AttendanceSession } from '../models/AttendanceSession';
import { applyLazyExpiry } from './session.service';
import { ApiError } from '../utils/ApiError';
import { generateJoinCode } from '../utils/joinCode';
import { CreateClassInput, UpdateClassInput, ClassQueryInput, JoinClassInput, ClassStudentsQueryInput } from '../validators/class';

export interface ClassTeacherDto {
  id: string;
  name: string;
  subjectCode: string;
  description: string;
  joinCode: string;
  studentCount: number;
  activeSession?: any | null;
  createdAt: Date;
}

export interface ClassStudentDto {
  id: string;
  name: string;
  subjectCode: string;
  description: string;
  teacher: {
    id: string;
    name: string;
  };
  studentCount: number;
  activeSession?: any | null;
  createdAt: Date;
}

export interface PaginatedResult<T> {
  classes: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ClassService {
  /**
   * Create a new class (Teacher only).
   * Generates unique joinCode with up to 5 retries on duplicate key collision.
   */
  async create(teacherId: string, input: CreateClassInput): Promise<ClassTeacherDto> {
    const maxRetries = 5;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const joinCode = generateJoinCode();

        const newClass = new Class({
          name: input.name,
          subjectCode: input.subjectCode,
          description: input.description,
          teacherId: new Types.ObjectId(teacherId),
          joinCode,
          isActive: true,
          deletedAt: null,
        });

        await newClass.save();

        return {
          id: (newClass._id as any).toString(),
          name: newClass.name,
          subjectCode: newClass.subjectCode,
          description: newClass.description || '',
          joinCode: newClass.joinCode,
          studentCount: 0,
          createdAt: newClass.createdAt,
        };
      } catch (err: any) {
        lastError = err;
        // If duplicate joinCode collision (code 11000/11001), retry
        if (err && (err.code === 11000 || err.code === 11001)) {
          continue;
        }
        throw err;
      }
    }

    throw new ApiError(500, 'INTERNAL_ERROR', 'Failed to generate a unique join code. Please try again.');
  }

  /**
   * List classes with pagination (Teacher sees own; Student sees active enrolled).
   */
  async list(
    user: { id: string; role: 'teacher' | 'student' },
    query: ClassQueryInput
  ): Promise<PaginatedResult<ClassTeacherDto | ClassStudentDto>> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    if (user.role === 'teacher') {
      const filter = { teacherId: new Types.ObjectId(user.id), isActive: true };
      const total = await Class.countDocuments(filter);
      const classes = await Class.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const classIds = classes.map((c) => c._id);
      const counts = await ClassMembership.aggregate([
        { $match: { classId: { $in: classIds }, status: 'active' } },
        { $group: { _id: '$classId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map<string, number>(counts.map((c) => [c._id.toString(), c.count]));

      const dtos: ClassTeacherDto[] = classes.map((c) => ({
        id: (c._id as any).toString(),
        name: c.name,
        subjectCode: c.subjectCode,
        description: c.description || '',
        joinCode: c.joinCode,
        studentCount: countMap.get(c._id.toString()) || 0,
        createdAt: c.createdAt,
      }));

      return {
        classes: dtos,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    } else {
      // Student: active enrolled classes only
      const memberships = await ClassMembership.find({
        studentId: new Types.ObjectId(user.id),
        status: 'active',
      });
      const enrolledClassIds = memberships.map((m) => m.classId);

      const filter = { _id: { $in: enrolledClassIds }, isActive: true };
      const total = await Class.countDocuments(filter);
      const classes = await Class.find(filter)
        .populate('teacherId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const classIds = classes.map((c) => c._id);
      const counts = await ClassMembership.aggregate([
        { $match: { classId: { $in: classIds }, status: 'active' } },
        { $group: { _id: '$classId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map<string, number>(counts.map((c) => [c._id.toString(), c.count]));

      const dtos: ClassStudentDto[] = classes.map((c) => {
        const teacher = c.teacherId as any;
        return {
          id: (c._id as any).toString(),
          name: c.name,
          subjectCode: c.subjectCode,
          description: c.description || '',
          teacher: {
            id: teacher?._id ? teacher._id.toString() : teacher?.toString() || '',
            name: teacher?.name || '',
          },
          studentCount: countMap.get(c._id.toString()) || 0,
          createdAt: c.createdAt,
        };
      });

      return {
        classes: dtos,
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
   * Get class details by ID (Role-specific payload).
   */
  async getById(
    id: string,
    user: { id: string; role: 'teacher' | 'student' }
  ): Promise<ClassTeacherDto | ClassStudentDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    if (user.role === 'teacher') {
      const classDoc = await Class.findOne({
        _id: new Types.ObjectId(id),
        isActive: true,
      });

      if (!classDoc || classDoc.teacherId.toString() !== user.id) {
        throw new ApiError(404, 'NOT_FOUND', 'Class not found');
      }

      const studentCount = await ClassMembership.countDocuments({
        classId: classDoc._id,
        status: 'active',
      });

      // Active session lookup and lazy expiry (Part 5.1)
      const activeSessionDoc = await AttendanceSession.findOne({
        classId: classDoc._id,
        status: 'active',
      });
      let activeSession = null;
      if (activeSessionDoc) {
        const isExpired = await applyLazyExpiry(activeSessionDoc);
        if (!isExpired) {
          activeSession = {
            id: (activeSessionDoc._id as any).toString(),
            startedAt: activeSessionDoc.startedAt,
            expiresAt: activeSessionDoc.expiresAt,
            sessionCode: activeSessionDoc.sessionCode,
          };
        }
      }

      return {
        id: (classDoc._id as any).toString(),
        name: classDoc.name,
        subjectCode: classDoc.subjectCode,
        description: classDoc.description || '',
        joinCode: classDoc.joinCode,
        studentCount,
        activeSession,
        createdAt: classDoc.createdAt,
      };
    } else {
      // Student
      const membership = await ClassMembership.findOne({
        classId: new Types.ObjectId(id),
        studentId: new Types.ObjectId(user.id),
      });

      if (!membership) {
        throw new ApiError(404, 'NOT_FOUND', 'Class not found');
      }

      if (membership.status === 'removed') {
        throw new ApiError(403, 'REMOVED_FROM_CLASS', 'You have been removed from this class');
      }

      const classDoc = await Class.findOne({
        _id: new Types.ObjectId(id),
        isActive: true,
      }).populate('teacherId', 'name');

      if (!classDoc) {
        throw new ApiError(404, 'NOT_FOUND', 'Class not found');
      }

      const studentCount = await ClassMembership.countDocuments({
        classId: classDoc._id,
        status: 'active',
      });

      // Active session lookup and lazy expiry (Part 5.1 - never reveals sessionCode to students)
      const activeSessionDoc = await AttendanceSession.findOne({
        classId: classDoc._id,
        status: 'active',
      });
      let activeSession = null;
      if (activeSessionDoc) {
        const isExpired = await applyLazyExpiry(activeSessionDoc);
        if (!isExpired) {
          activeSession = {
            id: (activeSessionDoc._id as any).toString(),
            startedAt: activeSessionDoc.startedAt,
            expiresAt: activeSessionDoc.expiresAt,
          };
        }
      }

      const teacher = classDoc.teacherId as any;

      return {
        id: (classDoc._id as any).toString(),
        name: classDoc.name,
        subjectCode: classDoc.subjectCode,
        description: classDoc.description || '',
        teacher: {
          id: teacher?._id ? teacher._id.toString() : teacher?.toString() || '',
          name: teacher?.name || '',
        },
        studentCount,
        activeSession,
        createdAt: classDoc.createdAt,
      };
    }
  }

  /**
   * Update class fields (Teacher only, must own class).
   * joinCode and teacherId are immutable.
   */
  async update(id: string, teacherId: string, input: UpdateClassInput): Promise<ClassTeacherDto> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(id),
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    if (input.name !== undefined) classDoc.name = input.name;
    if (input.subjectCode !== undefined) classDoc.subjectCode = input.subjectCode;
    if (input.description !== undefined) classDoc.description = input.description;

    await classDoc.save();

    const studentCount = await ClassMembership.countDocuments({
      classId: classDoc._id,
      status: 'active',
    });

    return {
      id: (classDoc._id as any).toString(),
      name: classDoc.name,
      subjectCode: classDoc.subjectCode,
      description: classDoc.description || '',
      joinCode: classDoc.joinCode,
      studentCount,
      createdAt: classDoc.createdAt,
    };
  }

  /**
   * Soft delete class (Teacher only, must own class).
   */
  async delete(id: string, teacherId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(id),
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    classDoc.isActive = false;
    classDoc.deletedAt = new Date();
    await classDoc.save();

    // Part 5.1: End active session with endReason: 'class_deleted'
    await AttendanceSession.updateMany(
      { classId: classDoc._id, status: 'active' },
      {
        $set: {
          status: 'ended',
          endedAt: new Date(),
          endReason: 'class_deleted',
        },
      }
    );

    return { message: 'Class deleted' };
  }

  /**
   * 3.6 Student joins a class using 6-character joinCode.
   * Race-safe against parallel duplicate joins via unique index error E11000.
   */
  async join(
    studentId: string,
    input: JoinClassInput
  ): Promise<{
    class: {
      id: string;
      name: string;
      subjectCode: string;
      teacher: {
        id: string;
        name: string;
      };
    };
    joinedAt: Date;
  }> {
    const classDoc = await Class.findOne({
      joinCode: input.joinCode,
      isActive: true,
    }).populate('teacherId', 'name');

    if (!classDoc) {
      throw new ApiError(404, 'INVALID_JOIN_CODE', 'Invalid or inactive join code');
    }

    const existingMembership = await ClassMembership.findOne({
      classId: classDoc._id,
      studentId: new Types.ObjectId(studentId),
    });

    if (existingMembership) {
      if (existingMembership.status === 'removed') {
        throw new ApiError(403, 'REMOVED_FROM_CLASS', 'You have been removed from this class');
      }
      if (existingMembership.status === 'active') {
        throw new ApiError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this class');
      }
    }

    let membership;
    try {
      membership = new ClassMembership({
        classId: classDoc._id,
        studentId: new Types.ObjectId(studentId),
        status: 'active',
        joinedAt: new Date(),
        removedAt: null,
        removedBy: null,
      });
      await membership.save();
    } catch (err: any) {
      if (err && (err.code === 11000 || err.code === 11001)) {
        throw new ApiError(409, 'ALREADY_ENROLLED', 'You are already enrolled in this class');
      }
      throw err;
    }

    const teacher = classDoc.teacherId as any;

    return {
      class: {
        id: (classDoc._id as any).toString(),
        name: classDoc.name,
        subjectCode: classDoc.subjectCode,
        teacher: {
          id: teacher?._id ? teacher._id.toString() : teacher?.toString() || '',
          name: teacher?.name || '',
        },
      },
      joinedAt: membership.joinedAt,
    };
  }

  /**
   * 3.7 List active students in a class (Teacher owner only).
   * Sorted by rollNumber ascending, paginated.
   */
  async listStudents(
    teacherId: string,
    classId: string,
    query: ClassStudentsQueryInput
  ): Promise<{
    students: Array<{
      id: string;
      name: string;
      email: string;
      rollNumber?: string;
      enrollmentNo?: string;
      joinedAt: Date;
    }>;
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    if (!Types.ObjectId.isValid(classId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(classId),
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      {
        $match: {
          classId: classDoc._id,
          status: 'active',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
        },
      },
      { $unwind: '$student' },
    ];

    if (query.search) {
      const searchRegex = new RegExp(query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'student.name': searchRegex },
            { 'student.rollNumber': searchRegex },
          ],
        },
      });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await ClassMembership.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    pipeline.push(
      { $sort: { 'student.rollNumber': 1 } },
      { $skip: skip },
      { $limit: limit }
    );

    const members = await ClassMembership.aggregate(pipeline);

    const students = members.map((m) => ({
      id: m.student._id.toString(),
      name: m.student.name,
      email: m.student.email,
      ...(m.student.rollNumber && { rollNumber: m.student.rollNumber }),
      ...(m.student.enrollmentNo && { enrollmentNo: m.student.enrollmentNo }),
      joinedAt: m.joinedAt,
    }));

    return {
      students,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3.8 Remove student from class (Teacher owner only).
   * Sets status='removed', removedAt, removedBy. Never deletes the membership row.
   */
  async removeStudent(
    teacherId: string,
    classId: string,
    studentId: string
  ): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(classId) || !Types.ObjectId.isValid(studentId)) {
      throw new ApiError(404, 'NOT_FOUND', 'Class or student not found');
    }

    const classDoc = await Class.findOne({
      _id: new Types.ObjectId(classId),
      isActive: true,
    });

    if (!classDoc || classDoc.teacherId.toString() !== teacherId) {
      throw new ApiError(404, 'NOT_FOUND', 'Class not found');
    }

    const membership = await ClassMembership.findOne({
      classId: classDoc._id,
      studentId: new Types.ObjectId(studentId),
      status: 'active',
    });

    if (!membership) {
      throw new ApiError(404, 'NOT_FOUND', 'Active student membership not found');
    }

    membership.status = 'removed';
    membership.removedAt = new Date();
    membership.removedBy = new Types.ObjectId(teacherId);
    await membership.save();

    return { message: 'Student removed' };
  }
}

export const classService = new ClassService();
