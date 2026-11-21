import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';
import { ApiError } from '../utils/ApiError';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication token required');
    }

    const payload = verifyToken(token);

    const user = await User.findById(payload.sub);
    if (!user || user.isActive === false) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }

    req.user = {
      id: (user._id as any).toString(),
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}
