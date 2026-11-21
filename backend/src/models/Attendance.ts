import { Schema, model, Document, Model, Types } from 'mongoose';

export type AttendanceStatus = 'present' | 'absent';
export type AttendanceMethod = 'code' | 'manual';

export interface IAttendance {
  sessionId: Types.ObjectId;
  classId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: AttendanceStatus;
  method: AttendanceMethod;
  markedAt: Date;
  markedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AttendanceDocument = Document & IAttendance;

const attendanceSchema = new Schema<IAttendance>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'AttendanceSession',
      required: [true, 'Session ID is required'],
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: 'Class',
      required: [true, 'Class ID is required'],
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student ID is required'],
    },
    status: {
      type: String,
      enum: {
        values: ['present', 'absent'],
        message: '{VALUE} is not a valid attendance status',
      },
      required: [true, 'Status is required'],
      default: 'present',
    },
    method: {
      type: String,
      enum: {
        values: ['code', 'manual'],
        message: '{VALUE} is not a valid marking method',
      },
      required: [true, 'Method is required'],
    },
    markedAt: {
      type: Date,
      required: [true, 'Marked date is required'],
      default: Date.now,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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

// Indexes per DATABASE.md §5 & §11
attendanceSchema.index({ sessionId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ studentId: 1, classId: 1 });
attendanceSchema.index({ classId: 1, studentId: 1, status: 1 });
attendanceSchema.index({ sessionId: 1 });

export const Attendance: Model<IAttendance> = model<IAttendance>(
  'Attendance',
  attendanceSchema
);
