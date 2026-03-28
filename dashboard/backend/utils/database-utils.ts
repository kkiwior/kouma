import mongoose from 'mongoose';
import { mongodbUrl } from '../config/env.config';
import { ActivityLog } from '../models/activity-log';
import { Build } from '../models/build';
import { Case } from '../models/case';
import { Project } from '../models/project';
import { Ignoring } from '../models/ignoring';
import { Webhook } from '../models/webhook';
import { logger } from './logger.ts';

mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err));
mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected, reconnecting...');
    connect();
});

export async function connect() {
    try {
        await mongoose.connect(mongodbUrl);
        await setupIndexes();
    } catch (e) {
        logger.error('Failed to connect to database:', e);
    }
}

async function setupIndexes() {
    try {
        await Promise.all([
            Project.collection.createIndex({ pid: 1 }, { unique: true }),
            Project.collection.createIndex({ projectName: 1 }, { unique: true }),
            Build.collection.createIndex({ bid: 1 }, { unique: true }),
            Build.collection.createIndex({ pid: 1 }),
            Case.collection.createIndex({ cid: 1 }, { unique: true }),
            Case.collection.createIndex({ bid: 1 }),
            Case.collection.createIndex({ pid: 1 }),
            Case.collection.createIndex({ pid: 1, bid: 1, caseName: 1 }),
            Case.collection.createIndex({ bid: 1, caseResult: 1, updatedAt: -1 }),
            Build.collection.createIndex({ pid: 1, _id: -1 }),
            Build.collection.createIndex({ pid: 1, buildStatus: 1 }),
            Build.collection.createIndex({ pid: 1, createdAt: -1 }),
            Ignoring.collection.createIndex({ pid: 1, caseName: 1 }, { unique: true }),
            Webhook.collection.createIndex({ wid: 1 }, { unique: true }),
            Webhook.collection.createIndex({ pid: 1 }),
            ActivityLog.collection.createIndex({ pid: 1, createdAt: -1 }),
        ]);
        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.error('Failed to create database indexes:', error);
    }
}
