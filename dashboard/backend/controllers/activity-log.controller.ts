import { activityLogService } from '../services/activity-log-service.ts';
import { projectService } from '../services/project-service.ts';
import { jsonResponse, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { requireApiAuth, safeErrorMessage } from '../utils/server-utils.ts';

export function registerActivityLogRoutes(router: Router) {
    /**
     * @swagger
     * /api/project/{pid}/activity-logs:
     *   get:
     *     tags: [ActivityLog]
     *     description: Get activity logs for a project with pagination
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *         description: Page number
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 50
     *         description: Items per page (max 100)
     *     responses:
     *       200:
     *         description: Activity logs
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 logs:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       pid:
     *                         type: string
     *                       action:
     *                         type: string
     *                       actor:
     *                         type: string
     *                       entityType:
     *                         type: string
     *                       entityId:
     *                         type: string
     *                       details:
     *                         type: string
     *                       createdAt:
     *                         type: string
     *                         format: date-time
     *                 total:
     *                   type: integer
     *                 page:
     *                   type: integer
     *                 limit:
     *                   type: integer
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Project not found
     */
    router.get('/api/project/:pid/activity-logs', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            const url = new URL(req.url);
            const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
            const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 50));
            const { logs, total } = await activityLogService.getLogsByPid(params.pid, page, limit);
            return jsonResponse({ logs, total, page, limit });
        } catch (error) {
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
