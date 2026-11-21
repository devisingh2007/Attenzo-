import { Request, Response, NextFunction } from 'express';
import { classService } from '../services/class.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import {
  CreateClassInput,
  UpdateClassInput,
  ClassQueryInput,
  ClassIdParamInput,
  JoinClassInput,
  ClassStudentsQueryInput,
  RemoveStudentParamsInput,
} from '../validators/class';

export class ClassController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.validated!.body as CreateClassInput;
      const result = await classService.create(req.user!.id, input);
      sendSuccess(res, { class: result }, 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.validated!.query as ClassQueryInput;
      const result = await classService.list(req.user!, query);
      sendPaginated(res, { classes: result.classes }, result.meta, 200);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as ClassIdParamInput;
      const result = await classService.getById(id, req.user!);
      sendSuccess(res, { class: result }, 200);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as ClassIdParamInput;
      const input = req.validated!.body as UpdateClassInput;
      const result = await classService.update(id, req.user!.id, input);
      sendSuccess(res, { class: result }, 200);
    } catch (err) {
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as ClassIdParamInput;
      const result = await classService.delete(id, req.user!.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async join(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.validated!.body as JoinClassInput;
      const result = await classService.join(req.user!.id, input);
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  async listStudents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as ClassIdParamInput;
      const query = req.validated!.query as ClassStudentsQueryInput;
      const result = await classService.listStudents(req.user!.id, id, query);
      sendPaginated(res, { students: result.students }, result.meta, 200);
    } catch (err) {
      next(err);
    }
  }

  async removeStudent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, studentId } = req.validated!.params as RemoveStudentParamsInput;
      const result = await classService.removeStudent(req.user!.id, id, studentId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const classController = new ClassController();
