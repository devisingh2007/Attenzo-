import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './ApiError';

export interface JwtUserPayload {
  sub: string;
  role: 'teacher' | 'student';
}

export function signToken(payload: JwtUserPayload): string {
  const options: SignOptions = {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as any,
  };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): JwtUserPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtUserPayload;
  } catch (err: unknown) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Token expired');
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token');
  }
}
