import crypto from 'node:crypto';
import mongoose, { Schema, Model } from 'mongoose';

export interface IWebhook {
    wid: string;
    pid: string;
    name: string;
    url: string;
    method: 'GET' | 'POST';
    contentType: 'json' | 'query_params';
    condition: 'always' | 'success' | 'fail';
    payloadTemplate: string;
    headers: Record<string, string>;
    enabled: boolean;
    createdAt: Date;
}

type WebhookModel = Model<IWebhook>;

export const WebhookSchema = new Schema<IWebhook, WebhookModel>({
    wid: { type: String, default: () => crypto.randomUUID(), trim: true, maxlength: 50 },
    pid: { type: String, default: '', trim: true, maxlength: 50 },
    name: { type: String, default: '', trim: true, maxlength: 100 },
    url: { type: String, default: '', trim: true, maxlength: 2000 },
    method: { type: String, enum: ['GET', 'POST'], default: 'POST' },
    contentType: { type: String, enum: ['json', 'query_params'], default: 'json' },
    condition: { type: String, enum: ['always', 'success', 'fail'], default: 'always' },
    payloadTemplate: {
        type: String,
        default: '{"project":"{{projectName}}","build":"{{buildVersion}}","status":"{{buildResult}}","timestamp":"{{timestamp}}"}',
        maxlength: 5000,
    },
    headers: { type: Map, of: String, default: {} },
    enabled: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

WebhookSchema.path('pid').required(true, 'Project ID cannot be blank');
WebhookSchema.path('wid').required(true, 'Webhook ID cannot be blank');
WebhookSchema.path('url').required(true, 'Webhook URL cannot be blank');
WebhookSchema.path('name').required(true, 'Webhook name cannot be blank');

export const Webhook = mongoose.model<IWebhook, WebhookModel>('Webhook', WebhookSchema);
