import { describe, it, expect, mock, beforeEach } from 'bun:test';

const mockSave = mock(() => Promise.resolve({}));
const mockFind = mock(() => ({
    sort: mock(() => ({ skip: mock(() => ({ limit: mock(() => ({ lean: mock(() => Promise.resolve([])) })) })) })),
}));
const mockCountDocuments = mock(() => Promise.resolve(0));

mock.module('../models/activity-log.ts', () => ({
    ActivityLog: Object.assign(
        function (this: Record<string, unknown>, data: Record<string, unknown>) {
            Object.assign(this, data);
            this.save = mockSave;
            return this;
        } as any,
        { find: mockFind, countDocuments: mockCountDocuments },
    ),
}));

mock.module('../utils/logger.ts', () => ({ logger: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} } }));

import { activityLogService } from './activity-log-service.ts';

describe('ActivityLogService', () => {
    beforeEach(() => {
        mockSave.mockClear();
        mockFind.mockClear();
        mockCountDocuments.mockClear();
    });

    describe('log', () => {
        it('should save an activity log entry with pid', async () => {
            mockSave.mockResolvedValue({});
            await activityLogService.log('PID123', 'project_created', 'user@test.com', 'project', 'PID123', 'Project created');
            expect(mockSave).toHaveBeenCalledTimes(1);
        });

        it('should save with empty actor when no auth', async () => {
            mockSave.mockResolvedValue({});
            await activityLogService.log('PID123', 'project_created', '', 'project', 'PID123', 'Project created');
            expect(mockSave).toHaveBeenCalledTimes(1);
        });

        it('should not throw on save failure', async () => {
            mockSave.mockRejectedValue(new Error('DB error'));
            await activityLogService.log('PID123', 'project_created', '', 'project', 'PID123', 'Test');
        });
    });

    describe('getLogsByPid', () => {
        it('should return logs filtered by pid with default pagination', async () => {
            const mockLogs = [{ pid: 'PID123', action: 'project_created', actor: 'user@test.com' }];
            const mockLean = mock(() => Promise.resolve(mockLogs));
            const mockLimit = mock(() => ({ lean: mockLean }));
            const mockSkip = mock(() => ({ limit: mockLimit }));
            const mockSort = mock(() => ({ skip: mockSkip }));
            mockFind.mockReturnValue({ sort: mockSort } as any);
            mockCountDocuments.mockResolvedValue(1);

            const result = await activityLogService.getLogsByPid('PID123');

            expect(mockFind).toHaveBeenCalledWith({ pid: 'PID123' });
            expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
            expect(mockSkip).toHaveBeenCalledWith(0);
            expect(mockLimit).toHaveBeenCalledWith(50);
            expect(result.logs).toEqual(mockLogs);
            expect(result.total).toBe(1);
        });

        it('should respect page and limit parameters', async () => {
            const mockLean = mock(() => Promise.resolve([]));
            const mockLimit = mock(() => ({ lean: mockLean }));
            const mockSkip = mock(() => ({ limit: mockLimit }));
            const mockSort = mock(() => ({ skip: mockSkip }));
            mockFind.mockReturnValue({ sort: mockSort } as any);
            mockCountDocuments.mockResolvedValue(0);

            await activityLogService.getLogsByPid('PID123', 3, 20);

            expect(mockFind).toHaveBeenCalledWith({ pid: 'PID123' });
            expect(mockSkip).toHaveBeenCalledWith(40);
            expect(mockLimit).toHaveBeenCalledWith(20);
        });
    });
});
