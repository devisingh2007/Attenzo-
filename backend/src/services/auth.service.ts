import bcryptjs from 'bcryptjs';
import { env } from '../config/env';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { signToken } from '../utils/jwt';
import { RegisterInput, LoginInput } from '../validators/auth';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  role: 'teacher' | 'student';
  rollNumber?: string;
  enrollmentNo?: string;
  createdAt: Date;
}

export interface AuthResult {
  user: UserDto;
  token: string;
}

export function toUserDto(user: IUser & { _id: unknown }): UserDto {
  const dto: UserDto = {
    id: (user._id as any).toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  if (user.role === 'student') {
    if (user.rollNumber) dto.rollNumber = user.rollNumber;
    if (user.enrollmentNo) dto.enrollmentNo = user.enrollmentNo;
  }

  return dto;
}

export class AuthService {
  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    }

    const passwordHash = await bcryptjs.hash(input.password, env.BCRYPT_ROUNDS);

    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      ...(input.role === 'student' && {
        rollNumber: input.rollNumber,
        ...(input.enrollmentNo && { enrollmentNo: input.enrollmentNo }),
      }),
    });

    await user.save();

    const token = signToken({
      sub: (user._id as any).toString(),
      role: user.role,
    });

    return {
      user: toUserDto(user as any),
      token,
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await User.findOne({ email: input.email }).select('+passwordHash');
    if (!user) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (user.isActive === false) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const isMatch = await bcryptjs.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const token = signToken({
      sub: (user._id as any).toString(),
      role: user.role,
    });

    return {
      user: toUserDto(user as any),
      token,
    };
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await User.findById(userId);
    if (!user || user.isActive === false) {
      throw new ApiError(401, 'UNAUTHORIZED', 'User not found or inactive');
    }
    return toUserDto(user as any);
  }
}

export const authService = new AuthService();
