import { Schema, model, Document, Model, Types } from 'mongoose';

export interface IClass {
  name: string;
  subjectCode: string;
  description?: string;
  teacherId: Types.ObjectId;
  joinCode: string;
  isActive: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ClassDocument = Document & IClass;

const classSchema = new Schema<IClass>(
  {
    name: {
      type: String,
      required: [true, 'Class name is required'],
      trim: true,
      minlength: [2, 'Class name must be at least 2 characters'],
      maxlength: [80, 'Class name cannot exceed 80 characters'],
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
      minlength: [2, 'Subject code must be at least 2 characters'],
      maxlength: [20, 'Subject code cannot exceed 20 characters'],
      match: [/^[A-Z0-9-]+$/, 'Subject code must contain only uppercase letters, numbers, and hyphens'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Teacher ID is required'],
    },
    joinCode: {
      type: String,
      required: [true, 'Join code is required'],
      trim: true,
      uppercase: true,
      minlength: [6, 'Join code must be 6 characters'],
      maxlength: [6, 'Join code must be 6 characters'],
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    deletedAt: {
      type: Date,
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

// Explicit indexes per DATABASE.md §2 & §11
classSchema.index({ joinCode: 1 }, { unique: true });
classSchema.index({ teacherId: 1, isActive: 1, createdAt: -1 });

export const Class: Model<IClass> = model<IClass>('Class', classSchema);
