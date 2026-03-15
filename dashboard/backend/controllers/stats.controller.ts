import { buildService } from '../services/build-service.ts';
import { projectService } from '../services/project-service.ts';
import { jsonResponse, badRequest, unauthorized, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiKey, safeErrorMessage } from '../utils/server-utils.ts';

export function registerStatsRoutes(router: Router) {
    /**
     * @swagger
     * /stats/build:
     *   get:
     *     tags: [Stats]
     *     description: Get specific build stats
     *     parameters:
     *       - in: query
     *         name: bid
     *         schema:
     *           type: string
     *         required: true
     *         description: Build ID
     *       - in: header
     *         name: x-api-key
     *         schema:
     *           type: string
     *         required: true
     *         description: Project API Key
     *     responses:
     *       200:
     *         description: Build stats
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 status:
     *                   type: string
     *                 result:
     *                   type: string
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     */
    router.get('/stats/build', async (req) => {
        const authErr = requireApiKey(req);
        if (authErr) return authErr;
        try {
            const url = new URL(req.url);
            const bid = url.searchParams.get('bid') || '';

            const build = await buildService.getBuildByBid(bid);
            if (!build) {
                return badRequest({ code: 400, message: `buildId=${bid} doesn't exist` });
            }

            const apiKeyInRequest = req.headers.get('x-api-key');
            const project = await projectService.getProjectByPid(build.pid);

            if (!project) {
                return badRequest({ code: 400, message: `pid=${build.pid} doesn't exist` });
            }

            if (project.getAPIKey() !== apiKeyInRequest) {
                return unauthorized({ code: 401, message: `invalid API Key: ${apiKeyInRequest}` });
            }

            const stats = await buildService.stats(bid);
            if (stats) {
                return jsonResponse(stats);
            }
            return badRequest({ code: 400, message: `buildId=${bid} doesn't exist` });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /stats/build/latest:
     *   get:
     *     tags: [Stats]
     *     description: Get latest build stats
     *     parameters:
     *       - in: query
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *       - in: header
     *         name: x-api-key
     *         schema:
     *           type: string
     *         required: true
     *         description: Project API Key
     *     responses:
     *       200:
     *         description: Latest build stats
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 bid:
     *                   type: string
     *                 index:
     *                   type: number
     *                 status:
     *                   type: string
     *                 result:
     *                   type: string
     *       204:
     *         description: No build exist
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     */
    router.get('/stats/build/latest', async (req) => {
        const authErr = requireApiKey(req);
        if (authErr) return authErr;
        try {
            const url = new URL(req.url);
            const pid = url.searchParams.get('pid') || '';

            const project = await projectService.getProjectByPid(pid);
            if (!project) {
                return badRequest({ code: 400, message: `PID '${pid}' doesn't exist` });
            }

            const apiKeyInRequest = req.headers.get('x-api-key');
            if (project.getAPIKey() !== apiKeyInRequest) {
                return unauthorized({ code: 401, message: `invalid API Key: ${apiKeyInRequest}` });
            }

            const stats = await buildService.latestStats(pid);
            if (stats) {
                return jsonResponse(stats);
            }
            return jsonResponse({ code: 204, message: 'no build exist' }, 204);
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
