import { Schema, model, Document, Model, Types } from 'mongoose';

export type MembershipStatus = 'active' | 'removed';

export interface IClassMembership {
  classId: Types.ObjectId;
  studentId: Types.ObjectId;
  status: MembershipStatus;
  joinedAt: Date;
  removedAt: Date | null;
  removedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ClassMembershipDocument = Document & IClassMembership;

const classMembershipSchema = new Schema<IClassMembership>(
  {
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
        values: ['active', 'removed'],
        message: '{VALUE} is not a valid membership status',
      },
      required: [true, 'Status is required'],
      default: 'active',
    },
    joinedAt: {
      type: Date,
      required: [true, 'Joined date is required'],
      default: Date.now,
    },
    removedAt: {
      type: Date,
      default: null,
    },
    removedBy: {
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

// Indexes per DATABASE.md §3 & §11
classMembershipSchema.index({ classId: 1, studentId: 1 }, { unique: true });
classMembershipSchema.index({ studentId: 1, status: 1 });
classMembershipSchema.index({ classId: 1, status: 1, joinedAt: 1 });

export const ClassMembership: Model<IClassMembership> = model<IClassMembership>(
  'ClassMembership',
  classMembershipSchema
);
