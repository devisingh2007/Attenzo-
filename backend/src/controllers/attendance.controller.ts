import { Request, Response, NextFunction } from 'express';
import { attendanceService } from '../services/attendance.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import {
  MarkAttendanceInput,
  ManualAttendanceInput,
  SessionIdParamInput,
  ClassIdParamInput,
  StudentIdParamInput,
  PaginationQueryInput,
  StudentAttendanceQueryInput,
  MyAttendanceQueryInput,
} from '../validators/attendance';

export class AttendanceController {
  async markAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const input = (req.validated?.body || req.body) as MarkAttendanceInput;
      const result = await attendanceService.markAttendance(studentId, input);
      sendSuccess(res, { attendance: result }, 201);
    } catch (err) {
      next(err);
    }
  }

  async manualAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const input = (req.validated?.body || req.body) as ManualAttendanceInput;
      const result = await attendanceService.manualMarkAttendance(teacherId, input);
      sendSuccess(res, { attendance: result }, 200);
    } catch (err) {
      next(err);
    }
  }

  async getSessionAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { sessionId } = (req.validated?.params || req.params) as SessionIdParamInput;
      const pagination = (req.validated?.query || req.query) as PaginationQueryInput;
      const result = await attendanceService.getSessionAttendance(teacherId, sessionId, pagination);
      sendPaginated(
        res,
        {
          session: result.session,
          counts: result.counts,
          roster: result.roster,
        },
        result.meta,
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async getClassSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { classId } = (req.validated?.params || req.params) as ClassIdParamInput;
      const pagination = (req.validated?.query || req.query) as PaginationQueryInput;
      const result = await attendanceService.getClassAttendanceSummary(teacherId, classId, pagination);
      sendPaginated(
        res,
        {
          classId: result.classId,
          totalSessions: result.totalSessions,
          warningThreshold: result.warningThreshold,
          students: result.students,
        },
        result.meta,
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async getStudentAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const teacherId = req.user!.id;
      const { studentId } = (req.validated?.params || req.params) as StudentIdParamInput;
      const query = (req.validated?.query || req.query) as StudentAttendanceQueryInput;
      const result = await attendanceService.getStudentAttendanceHistory(teacherId, studentId, query);
      sendPaginated(
        res,
        {
          student: result.student,
          summary: result.summary,
          history: result.history,
        },
        result.meta,
        200
      );
    } catch (err) {
      next(err);
    }
  }

  async getMyAttendance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const query = (req.validated?.query || req.query) as MyAttendanceQueryInput;
      const result = await attendanceService.getMyAttendance(studentId, query);

      if ('meta' in result) {
        // Query with classId: paginated history
        sendPaginated(
          res,
          {
            student: result.student,
            summary: result.summary,
            history: result.history,
          },
          result.meta,
          200
        );
      } else {
        // Query without classId: summary across all classes
        sendSuccess(res, result, 200);
      }
    } catch (err) {
      next(err);
    }
  }
}

export const attendanceController = new AttendanceController();
