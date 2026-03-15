import { activityLogService } from '../services/activity-log-service.ts';
import { projectService } from '../services/project-service.ts';
import { webhookService } from '../services/webhook-service.ts';
import { parseJsonBody, jsonResponse, badRequest, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { requireApiAuth, safeErrorMessage, getUserFromRequest } from '../utils/server-utils.ts';

function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

export function registerWebhookRoutes(router: Router) {
    /**
     * @swagger
     * /api/project/{pid}/webhooks:
     *   get:
     *     tags: [Webhook]
     *     description: List webhooks for a project
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *     responses:
     *       200:
     *         description: List of webhooks
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 webhooks:
     *                   type: array
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Project not found
     *       500:
     *         description: Internal Server Error
     */
    router.get('/api/project/:pid/webhooks', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            const webhooks = await webhookService.getWebhooksByPid(params.pid);
            return jsonResponse({
                webhooks: webhooks.map((w) => ({
                    wid: w.wid,
                    pid: w.pid,
                    name: w.name,
                    url: w.url,
                    method: w.method,
                    contentType: w.contentType,
                    condition: w.condition,
                    payloadTemplate: w.payloadTemplate,
                    headers: w.headers instanceof Map ? Object.fromEntries(w.headers) : w.headers,
                    enabled: w.enabled,
                    createdAt: w.createdAt,
                })),
            });
        } catch (error) {
            console.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/project/{pid}/webhooks:
     *   post:
     *     tags: [Webhook]
     *     description: Create a webhook for a project
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - url
     *             properties:
     *               name:
     *                 type: string
     *               url:
     *                 type: string
     *               method:
     *                 type: string
     *                 enum: [GET, POST]
     *               contentType:
     *                 type: string
     *                 enum: [json, query_params]
     *               condition:
     *                 type: string
     *                 enum: [always, success, fail]
     *               payloadTemplate:
     *                 type: string
     *               headers:
     *                 type: object
     *               enabled:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Created webhook
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Project not found
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/project/:pid/webhooks', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }

            const body = await parseJsonBody(req);

            const name = body.name as string;
            if (!name || name.length < 1 || name.length > 100) {
                return badRequest({ message: 'Webhook name is required (max 100 characters)' });
            }

            const url = body.url as string;
            if (!url || !isValidUrl(url)) {
                return badRequest({ message: 'A valid HTTP/HTTPS URL is required' });
            }

            const method = (body.method as string) || 'POST';
            if (method !== 'GET' && method !== 'POST') {
                return badRequest({ message: 'Method must be GET or POST' });
            }

            const contentType = (body.contentType as string) || 'json';
            if (contentType !== 'json' && contentType !== 'query_params') {
                return badRequest({ message: 'Content type must be json or query_params' });
            }

            const condition = (body.condition as string) || 'always';
            if (condition !== 'always' && condition !== 'success' && condition !== 'fail') {
                return badRequest({ message: 'Condition must be always, success, or fail' });
            }

            const webhook = await webhookService.createWebhook({
                pid: params.pid,
                name,
                url,
                method: method as 'GET' | 'POST',
                contentType: contentType as 'json' | 'query_params',
                condition: condition as 'always' | 'success' | 'fail',
                payloadTemplate: (body.payloadTemplate as string) || undefined,
                headers: (body.headers as Record<string, string>) || {},
                enabled: body.enabled !== false,
            });

            await activityLogService.log(
                params.pid,
                'webhook_created',
                getUserFromRequest(req),
                'webhook',
                webhook.wid,
                `Webhook "${name}" created for project ${params.pid}`,
            );
            return jsonResponse({ success: true, webhook: { wid: webhook.wid, pid: webhook.pid, name: webhook.name } });
        } catch (error) {
            console.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/webhook/{wid}:
     *   put:
     *     tags: [Webhook]
     *     description: Update a webhook
     *     parameters:
     *       - in: path
     *         name: wid
     *         schema:
     *           type: string
     *         required: true
     *         description: Webhook ID
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               url:
     *                 type: string
     *               method:
     *                 type: string
     *                 enum: [GET, POST]
     *               contentType:
     *                 type: string
     *                 enum: [json, query_params]
     *               condition:
     *                 type: string
     *                 enum: [always, success, fail]
     *               payloadTemplate:
     *                 type: string
     *               headers:
     *                 type: object
     *               enabled:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Updated webhook
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Webhook not found
     *       500:
     *         description: Internal Server Error
     */
    router.put('/api/webhook/:wid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const webhook = await webhookService.getWebhookByWid(params.wid);
            if (!webhook) {
                return notFound({ message: 'Webhook not found' });
            }

            const body = await parseJsonBody(req);
            const updates: Record<string, unknown> = {};

            if (body.name !== undefined) {
                const name = body.name as string;
                if (name.length < 1 || name.length > 100) {
                    return badRequest({ message: 'Webhook name must be 1-100 characters' });
                }
                updates.name = name;
            }

            if (body.url !== undefined) {
                const url = body.url as string;
                if (!isValidUrl(url)) {
                    return badRequest({ message: 'A valid HTTP/HTTPS URL is required' });
                }
                updates.url = url;
            }

            if (body.method !== undefined) {
                if (body.method !== 'GET' && body.method !== 'POST') {
                    return badRequest({ message: 'Method must be GET or POST' });
                }
                updates.method = body.method;
            }

            if (body.contentType !== undefined) {
                if (body.contentType !== 'json' && body.contentType !== 'query_params') {
                    return badRequest({ message: 'Content type must be json or query_params' });
                }
                updates.contentType = body.contentType;
            }

            if (body.condition !== undefined) {
                if (body.condition !== 'always' && body.condition !== 'success' && body.condition !== 'fail') {
                    return badRequest({ message: 'Condition must be always, success, or fail' });
                }
                updates.condition = body.condition;
            }

            if (body.payloadTemplate !== undefined) updates.payloadTemplate = body.payloadTemplate;
            if (body.headers !== undefined) updates.headers = body.headers;
            if (body.enabled !== undefined) updates.enabled = body.enabled;

            await webhookService.updateWebhook(params.wid, updates);
            await activityLogService.log(
                webhook.pid,
                'webhook_updated',
                getUserFromRequest(req),
                'webhook',
                params.wid,
                `Webhook "${webhook.name}" updated`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            console.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/webhook/{wid}:
     *   delete:
     *     tags: [Webhook]
     *     description: Delete a webhook
     *     parameters:
     *       - in: path
     *         name: wid
     *         schema:
     *           type: string
     *         required: true
     *         description: Webhook ID
     *     responses:
     *       200:
     *         description: Deleted
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Webhook not found
     *       500:
     *         description: Internal Server Error
     */
    router.delete('/api/webhook/:wid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const webhook = await webhookService.getWebhookByWid(params.wid);
            if (!webhook) {
                return notFound({ message: 'Webhook not found' });
            }
            await webhookService.deleteWebhook(params.wid);
            await activityLogService.log(
                webhook.pid,
                'webhook_deleted',
                getUserFromRequest(req),
                'webhook',
                params.wid,
                `Webhook "${webhook.name}" deleted`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            console.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/webhook/{wid}/test:
     *   post:
     *     tags: [Webhook]
     *     description: Test a webhook by sending a sample payload
     *     parameters:
     *       - in: path
     *         name: wid
     *         schema:
     *           type: string
     *         required: true
     *         description: Webhook ID
     *     responses:
     *       200:
     *         description: Test result
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Webhook not found
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/webhook/:wid/test', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const webhook = await webhookService.getWebhookByWid(params.wid);
            if (!webhook) {
                return notFound({ message: 'Webhook not found' });
            }

            const testContext = {
                projectName: 'test-project',
                buildVersion: 'v1.0.0-test',
                buildResult: 'passed',
                buildStatus: 'completed',
                bid: 'test-build-id',
                pid: webhook.pid,
                caseCount: 10,
                casePassedCount: 8,
                caseFailedCount: 1,
                caseUndeterminedCount: 1,
                timestamp: new Date().toISOString(),
                metadata: { branch: 'main', commit: 'abc1234' },
            };

            const result = await webhookService.sendWebhook(webhook, testContext);
            return jsonResponse({ success: result.success, statusCode: result.statusCode, error: result.error });
        } catch (error) {
            console.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
