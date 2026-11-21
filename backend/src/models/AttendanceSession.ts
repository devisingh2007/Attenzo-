import { Schema, model, Document, Model, Types } from 'mongoose';

export type SessionStatus = 'active' | 'ended';
export type SessionEndReason = 'manual' | 'expired' | 'class_deleted';

export interface IAttendanceSession {
  classId: Types.ObjectId;
  teacherId: Types.ObjectId;
  sessionCode: string;
  title?: string;
  startedAt: Date;
  durationMinutes: number;
  expiresAt: Date;
  status: SessionStatus;
  endedAt: Date | null;
  endReason: SessionEndReason | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceSessionDocument = Document & IAttendanceSession;

const attendanceSessionSchema = new Schema<IAttendanceSession>(
  {
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
    },
    sessionCode: {
      type: String,
      required: [true, 'Session code is required'],
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
      maxlength: [80, 'Title cannot exceed 80 characters'],
    },
    startedAt: {
      type: Date,
      required: [true, 'Started date is required'],
      default: Date.now,
    },
    durationMinutes: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      default: 10,
      min: [1, 'Duration must be at least 1 minute'],
      max: [60, 'Duration cannot exceed 60 minutes'],
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'ended'],
        message: '{VALUE} is not a valid session status',
      },
      required: [true, 'Status is required'],
      default: 'active',
    },
    endedAt: {
      type: Date,
      default: null,
    },
    endReason: {
      type: String,
      enum: {
        values: ['manual', 'expired', 'class_deleted'],
        message: '{VALUE} is not a valid end reason',
      },
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes per DATABASE.md §4 & §11
attendanceSessionSchema.index({ classId: 1, startedAt: -1 });
attendanceSessionSchema.index({ teacherId: 1, startedAt: -1 });
// Partial unique index: at most one active session per class (race-safe)
attendanceSessionSchema.index(
  { classId: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export const AttendanceSession: Model<IAttendanceSession> = model<IAttendanceSession>(
  'AttendanceSession',
  attendanceSessionSchema
);
