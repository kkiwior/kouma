import { describe, it, expect, mock, beforeEach } from 'bun:test';

mock.module('../models/webhook.ts', () => ({
    Webhook: Object.assign(
        function (this: Record<string, unknown>, data: Record<string, unknown>) {
            Object.assign(this, data);
            this.save = mock(() => Promise.resolve(this));
            return this;
        } as any,
        {
            find: mock(() => Promise.resolve([])),
            findOne: mock(() => Promise.resolve(null)),
            findOneAndUpdate: mock(() => Promise.resolve(null)),
            deleteOne: mock(() => Promise.resolve({ deletedCount: 1 })),
            deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })),
        },
    ),
}));

import { Webhook } from '../models/webhook.ts';
import { webhookService } from './webhook-service.ts';

describe('WebhookService', () => {
    beforeEach(() => {
        (Webhook.find as any).mockClear();
        (Webhook.findOne as any).mockClear();
        (Webhook.findOneAndUpdate as any).mockClear();
        (Webhook.deleteOne as any).mockClear();
        (Webhook.deleteMany as any).mockClear();
    });

    describe('getWebhooksByPid', () => {
        it('should return webhooks for a project', async () => {
            const webhooks = [{ wid: 'w1', pid: 'p1', name: 'Slack' }];
            (Webhook.find as any).mockReturnValue({ lean: () => webhooks });

            const result = await webhookService.getWebhooksByPid('p1');

            expect(Webhook.find).toHaveBeenCalledWith({ pid: 'p1' });
            expect(result).toEqual(webhooks as any);
        });

        it('should return empty array when no webhooks', async () => {
            (Webhook.find as any).mockReturnValue({ lean: () => [] });

            const result = await webhookService.getWebhooksByPid('p1');
            expect(result).toEqual([]);
        });
    });

    describe('getWebhookByWid', () => {
        it('should return a webhook by wid', async () => {
            const webhook = { wid: 'w1', pid: 'p1', name: 'Slack' };
            (Webhook.findOne as any).mockResolvedValue(webhook);

            const result = await webhookService.getWebhookByWid('w1');

            expect(Webhook.findOne).toHaveBeenCalledWith({ wid: 'w1' });
            expect(result).toEqual(webhook as any);
        });

        it('should return null when not found', async () => {
            (Webhook.findOne as any).mockResolvedValue(null);

            const result = await webhookService.getWebhookByWid('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('deleteWebhook', () => {
        it('should delete a webhook by wid', async () => {
            (Webhook.deleteOne as any).mockResolvedValue({ deletedCount: 1 });

            const result = await webhookService.deleteWebhook('w1');

            expect(Webhook.deleteOne).toHaveBeenCalledWith({ wid: 'w1' });
            expect(result).toEqual({ deletedCount: 1 } as any);
        });
    });

    describe('deleteWebhooksByPid', () => {
        it('should delete all webhooks for a project', async () => {
            (Webhook.deleteMany as any).mockResolvedValue({ deletedCount: 3 });

            const result = await webhookService.deleteWebhooksByPid('p1');

            expect(Webhook.deleteMany).toHaveBeenCalledWith({ pid: 'p1' });
            expect(result).toEqual({ deletedCount: 3 } as any);
        });
    });

    describe('updateWebhook', () => {
        it('should update a webhook', async () => {
            const updated = { wid: 'w1', name: 'Updated' };
            (Webhook.findOneAndUpdate as any).mockResolvedValue(updated);

            const result = await webhookService.updateWebhook('w1', { name: 'Updated' });

            expect(Webhook.findOneAndUpdate).toHaveBeenCalledWith({ wid: 'w1' }, { $set: { name: 'Updated' } }, { new: true });
            expect(result).toEqual(updated as any);
        });
    });

    describe('renderTemplate', () => {
        const context = {
            projectName: 'my-project',
            buildVersion: 'v1.0.0',
            buildResult: 'passed',
            buildStatus: 'completed',
            bid: 'bid-123',
            pid: 'pid-456',
            caseCount: 10,
            casePassedCount: 8,
            caseFailedCount: 1,
            caseUndeterminedCount: 1,
            timestamp: '2024-01-01T00:00:00Z',
            metadata: { branch: 'main', commit: 'abc1234' },
        };

        it('should replace all known variables', () => {
            const template = '{{projectName}} {{buildVersion}} {{buildResult}}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('my-project v1.0.0 passed');
        });

        it('should handle numeric variables', () => {
            const template = '{{caseCount}} cases: {{casePassedCount}} passed, {{caseFailedCount}} failed';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('10 cases: 8 passed, 1 failed');
        });

        it('should replace unknown variables with empty string', () => {
            const template = '{{unknown}} text';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe(' text');
        });

        it('should handle template with no variables', () => {
            const result = webhookService.renderTemplate('static text', context);
            expect(result).toBe('static text');
        });

        it('should handle JSON payload template', () => {
            const template = '{"text":"Build {{buildVersion}} for {{projectName}}: {{buildResult}}"}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('{"text":"Build v1.0.0 for my-project: passed"}');
        });

        it('should replace metadata variables with {{meta.KEY}} syntax', () => {
            const template = 'branch: {{meta.branch}}, commit: {{meta.commit}}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('branch: main, commit: abc1234');
        });

        it('should handle metadata in JSON payload', () => {
            const template = '{"text":"Build on {{meta.branch}} ({{meta.commit}}): {{buildResult}}"}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('{"text":"Build on main (abc1234): passed"}');
        });

        it('should preserve unknown metadata key placeholder', () => {
            const template = '{{meta.nonexistent}}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('{{meta.nonexistent}}');
        });

        it('should preserve metadata placeholders when context has no metadata', () => {
            const contextNoMeta = { ...context, metadata: undefined };
            const template = '{{projectName}} {{meta.branch}}';
            const result = webhookService.renderTemplate(template, contextNoMeta);
            expect(result).toBe('my-project {{meta.branch}}');
        });

        it('should handle mixed standard and metadata variables', () => {
            const template = '{{projectName}} @ {{meta.branch}} -> {{buildResult}}';
            const result = webhookService.renderTemplate(template, context);
            expect(result).toBe('my-project @ main -> passed');
        });
    });
});
