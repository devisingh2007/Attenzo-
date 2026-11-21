export interface ValidatedData<B = any, P = any, Q = any> {
  body: B;
  params: P;
  query: Q;
}

export interface AuthUser {
  id: string;
  role: 'teacher' | 'student';
}

declare global {
  namespace Express {
    interface Request {
      validated?: ValidatedData;
      user?: AuthUser;
    }
  }
}
