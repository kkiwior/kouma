import mongoose, { Schema, Model } from 'mongoose';

export interface IActivityLog {
    pid: string;
    action: string;
    actor: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: Date;
}

type ActivityLogModel = Model<IActivityLog>;

export const ActivityLogSchema = new Schema<IActivityLog, ActivityLogModel>({
    pid: { type: String, required: true, trim: true, maxlength: 50 },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    actor: { type: String, default: '', trim: true, maxlength: 200 },
    entityType: { type: String, default: '', trim: true, maxlength: 50 },
    entityId: { type: String, default: '', trim: true, maxlength: 100 },
    details: { type: String, default: '', trim: true, maxlength: 1000 },
    createdAt: { type: Date, default: Date.now },
});

export const ActivityLog = mongoose.model<IActivityLog, ActivityLogModel>('ActivityLog', ActivityLogSchema);
