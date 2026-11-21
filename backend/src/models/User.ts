import { Schema, model, Document, Model } from 'mongoose';

export type UserRole = 'teacher' | 'student';

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  rollNumber?: string;
  enrollmentNo?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = Document & IUser;

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['teacher', 'student'],
        message: '{VALUE} is not a valid role',
      },
      required: [true, 'Role is required'],
      immutable: true,
    },
    rollNumber: {
      type: String,
      trim: true,
      minlength: [1, 'Roll number cannot be empty'],
      maxlength: [30, 'Roll number cannot exceed 30 characters'],
    },
    enrollmentNo: {
      type: String,
      trim: true,
      minlength: [1, 'Enrollment number cannot be empty'],
      maxlength: [30, 'Enrollment number cannot exceed 30 characters'],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Explicit indexes per DATABASE.md §1 & §11
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });

// Async-only pre-validate hook (Mongoose 9: async only, no next callback)
userSchema.pre('validate', async function () {
  if (this.role === 'student') {
    if (!this.rollNumber || this.rollNumber.trim() === '') {
      this.invalidate('rollNumber', 'Roll number is required for students');
    }
  } else if (this.role === 'teacher') {
    this.rollNumber = undefined;
    this.enrollmentNo = undefined;
  }
});

export const User: Model<IUser> = model<IUser>('User', userSchema);
