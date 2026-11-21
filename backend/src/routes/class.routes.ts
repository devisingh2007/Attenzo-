import { Router } from 'express';
import { classController } from '../controllers/class.controller';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import {
  createClassSchema,
  updateClassSchema,
  classQuerySchema,
  classIdParamSchema,
  joinClassSchema,
  classStudentsQuerySchema,
  removeStudentParamsSchema,
} from '../validators/class';

const classRouter = Router();

// All class routes require authentication
classRouter.use(authenticate);

// 3.1 Create class (Teacher only)
classRouter.post(
  '/',
  authorize('teacher'),
  validate({ body: createClassSchema }),
  (req, res, next) => classController.create(req, res, next)
);

// 3.2 List classes (Teacher or Student)
classRouter.get(
  '/',
  validate({ query: classQuerySchema }),
  (req, res, next) => classController.list(req, res, next)
);

// 3.6 POST /classes/join (Declared before any /:id route per API.md §3.6)
classRouter.post(
  '/join',
  authorize('student'),
  validate({ body: joinClassSchema }),
  (req, res, next) => classController.join(req, res, next)
);

// 3.7 GET /classes/:id/students (Teacher owner only)
classRouter.get(
  '/:id/students',
  authorize('teacher'),
  validate({ params: classIdParamSchema, query: classStudentsQuerySchema }),
  (req, res, next) => classController.listStudents(req, res, next)
);

// 3.8 DELETE /classes/:id/students/:studentId (Teacher owner only)
classRouter.delete(
  '/:id/students/:studentId',
  authorize('teacher'),
  validate({ params: removeStudentParamsSchema }),
  (req, res, next) => classController.removeStudent(req, res, next)
);

// 3.3 Get class details by ID (Teacher owner or Student member)
classRouter.get(
  '/:id',
  validate({ params: classIdParamSchema }),
  (req, res, next) => classController.getById(req, res, next)
);

// 3.4 Update class (Teacher owner only)
classRouter.put(
  '/:id',
  authorize('teacher'),
  validate({ params: classIdParamSchema, body: updateClassSchema }),
  (req, res, next) => classController.update(req, res, next)
);

// 3.5 Delete class (Teacher owner only)
classRouter.delete(
  '/:id',
  authorize('teacher'),
  validate({ params: classIdParamSchema }),
  (req, res, next) => classController.delete(req, res, next)
);

export default classRouter;
