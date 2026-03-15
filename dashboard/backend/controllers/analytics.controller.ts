import { buildService } from '../services/build-service.ts';
import { caseService } from '../services/case-service.ts';
import { projectService } from '../services/project-service.ts';
import { jsonResponse, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage } from '../utils/server-utils.ts';

export function registerAnalyticsRoutes(router: Router) {
    /**
     * @swagger
     * /api/project/{pid}/analytics:
     *   get:
     *     tags: [Analytics]
     *     description: Get project analytics and statistics
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *     responses:
     *       200:
     *         description: Project analytics data
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 projectName:
     *                   type: string
     *                 totalBuilds:
     *                   type: number
     *                 totalCases:
     *                   type: number
     *                 buildResultDistribution:
     *                   type: object
     *                 recentBuilds:
     *                   type: array
     *                   items:
     *                     type: object
     *                 topFailingCases:
     *                   type: array
     *                   items:
     *                     type: object
     *                 buildActivity:
     *                   type: array
     *                   items:
     *                     type: object
     *                 passRate:
     *                   type: number
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Project not found
     *       500:
     *         description: Internal Server Error
     */
    router.get('/api/project/:pid/analytics', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }

            const [totalBuilds, totalCases, buildResultDistribution, recentBuilds, topFailingCases, buildActivity] = await Promise.all([
                buildService.getProjectBuildsCountAndLatestBuild(params.pid).then((r) => r.buildsCount),
                caseService.countProjectCases(params.pid),
                buildService.getProjectBuildResultDistribution(params.pid),
                buildService.getRecentBuilds(params.pid, 20),
                caseService.getTopFailingCases(params.pid, 10),
                buildService.getBuildActivityByDay(params.pid, 30),
            ]);

            const totalCompleted = buildResultDistribution.passed + buildResultDistribution.failed + buildResultDistribution.undetermined;
            const passRate = totalCompleted > 0 ? Math.round((buildResultDistribution.passed / totalCompleted) * 1000) / 10 : 0;

            return jsonResponse({
                projectName: project.projectDisplayName || project.projectName,
                totalBuilds,
                totalCases,
                buildResultDistribution,
                recentBuilds: recentBuilds.map((b) => ({
                    bid: b.bid,
                    buildIndex: b.buildIndex,
                    buildResult: b.buildResult,
                    buildStatus: b.buildStatus,
                    caseCount: b.caseCount,
                    passedCount: b.casePassedCount,
                    failedCount: b.caseFailedCount,
                    undeterminedCount: b.caseUndeterminedCount,
                    createdAt: b.createdAt,
                })),
                topFailingCases,
                buildActivity,
                passRate,
            });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
