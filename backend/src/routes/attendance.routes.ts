import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { markLimiter } from '../middleware/rateLimiters';
import {
  markAttendanceSchema,
  manualAttendanceSchema,
  sessionIdParamSchema,
  classIdParamSchema,
  studentIdParamSchema,
  paginationQuerySchema,
  studentAttendanceQuerySchema,
  myAttendanceQuerySchema,
} from '../validators/attendance';
import { attendanceController } from '../controllers/attendance.controller';

const attendanceRouter = Router();

// All attendance routes require authentication
attendanceRouter.use(authenticate);

// Student marks attendance with 6-digit code (API.md §5.1)
attendanceRouter.post(
  '/mark',
  authorize('student'),
  markLimiter,
  validate({ body: markAttendanceSchema }),
  (req, res, next) => attendanceController.markAttendance(req, res, next)
);

// Teacher manually marks attendance (present/absent) (API.md §5.2)
attendanceRouter.post(
  '/manual',
  authorize('teacher'),
  validate({ body: manualAttendanceSchema }),
  (req, res, next) => attendanceController.manualAttendance(req, res, next)
);

// Student views own attendance summary or class history (API.md §5.6)
attendanceRouter.get(
  '/my',
  authorize('student'),
  validate({ query: myAttendanceQuerySchema }),
  (req, res, next) => attendanceController.getMyAttendance(req, res, next)
);

// Teacher views session roster and counts (API.md §5.3)
attendanceRouter.get(
  '/session/:sessionId',
  authorize('teacher'),
  validate({ params: sessionIdParamSchema, query: paginationQuerySchema }),
  (req, res, next) => attendanceController.getSessionAttendance(req, res, next)
);

// Teacher views class attendance summary (API.md §5.4)
attendanceRouter.get(
  '/class/:classId/summary',
  authorize('teacher'),
  validate({ params: classIdParamSchema, query: paginationQuerySchema }),
  (req, res, next) => attendanceController.getClassSummary(req, res, next)
);

// Teacher views student attendance history (API.md §5.5)
attendanceRouter.get(
  '/student/:studentId',
  authorize('teacher'),
  validate({ params: studentIdParamSchema, query: studentAttendanceQuerySchema }),
  (req, res, next) => attendanceController.getStudentAttendance(req, res, next)
);

export default attendanceRouter;
