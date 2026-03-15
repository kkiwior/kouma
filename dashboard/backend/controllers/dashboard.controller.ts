import { appConfig } from '../config/app.config.ts';
import { jsonResponse, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage, retrieveProjectInfo } from '../utils/server-utils.ts';

export function registerDashboardRoutes(router: Router) {
    /**
     * @swagger
     * /api/dashboard:
     *   get:
     *     tags: [Dashboard]
     *     description: Get dashboard projects and content
     *     responses:
     *       200:
     *         description: Dashboard data
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 projects:
     *                   type: array
     *                   items:
     *                     type: object
     *                 dashboardContent:
     *                   type: string
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    router.get('/api/dashboard', async (req) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            return jsonResponse({ projects: await retrieveProjectInfo(), dashboardContent: appConfig.dashboardContent });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
