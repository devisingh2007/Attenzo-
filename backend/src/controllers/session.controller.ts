import { Request, Response, NextFunction } from 'express';
import { sessionService } from '../services/session.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import {
  StartSessionInput,
  SessionQueryInput,
  SessionIdParamInput,
} from '../validators/session';

export class SessionController {
  async start(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.validated!.body as StartSessionInput;
      const result = await sessionService.start(req.user!.id, input);
      sendSuccess(res, { session: result }, 201);
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.validated!.query as SessionQueryInput;
      const result = await sessionService.list(req.user!, query);
      sendPaginated(res, { sessions: result.sessions }, result.meta, 200);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as SessionIdParamInput;
      const result = await sessionService.getById(id, req.user!);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  async end(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.validated!.params as SessionIdParamInput;
      const result = await sessionService.end(id, req.user!.id);
      sendSuccess(res, { session: result }, 200);
    } catch (err) {
      next(err);
    }
  }
}

export const sessionController = new SessionController();
