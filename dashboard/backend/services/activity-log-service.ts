import { ActivityLog } from '../models/activity-log.ts';
import { logger } from '../utils/logger.ts';

class ActivityLogService {
    async log(pid: string, action: string, actor: string, entityType: string, entityId: string, details: string = ''): Promise<void> {
        try {
            await new ActivityLog({ pid, action, actor, entityType, entityId, details }).save();
        } catch (error) {
            logger.error('Failed to save activity log:', error);
        }
    }

    async getLogsByPid(pid: string, page: number = 1, limit: number = 50): Promise<{ logs: unknown[]; total: number }> {
        const skip = (page - 1) * limit;
        const [logs, total] = await Promise.all([
            ActivityLog.find({ pid }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
            ActivityLog.countDocuments({ pid }),
        ]);
        return { logs, total };
    }
}

export const activityLogService = new ActivityLogService();
