import { buildService } from '../services/build-service.ts';
import { projectService } from '../services/project-service.ts';
import { jsonResponse, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage } from '../utils/server-utils.ts';

export function registerProjectRoutes(router: Router) {
    /**
     * @swagger
     * /api/project/{pid}/page/{page}:
     *   get:
     *     tags: [Project]
     *     description: Get project details and paginated builds
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
     *       - in: path
     *         name: page
     *         schema:
     *           type: integer
     *         required: true
     *         description: Page number
     *     responses:
     *       200:
     *         description: Project and builds
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 project:
     *                   type: object
     *                   properties:
     *                     pid:
     *                       type: string
     *                     projectName:
     *                       type: string
     *                     apiKey:
     *                       type: string
     *                     projectColorThreshold:
     *                       type: number
     *                     projectDetectAntialiasing:
     *                       type: boolean
     *                     projectIgnoringCluster:
     *                       type: boolean
     *                     projectIgnoringClusterSize:
     *                       type: number
     *                     preserveIgnoringOnRebase:
     *                       type: boolean
     *                 builds:
     *                   type: object
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Project not found
     */
    router.get('/api/project/:pid/page/:page', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            const paginatedBuilds = await buildService.getProjectPaginatedBuilds(params.pid, parseInt(params.page));
            return jsonResponse({
                project: {
                    pid: project.pid,
                    projectName: project.projectName,
                    apiKey: project.getAPIKey(),
                    projectColorThreshold: project.projectColorThreshold,
                    projectDetectAntialiasing: project.projectDetectAntialiasing,
                    projectIgnoringCluster: project.projectIgnoringCluster,
                    projectIgnoringClusterSize: project.projectIgnoringClusterSize,
                    preserveIgnoringOnRebase: project.preserveIgnoringOnRebase,
                },
                builds: paginatedBuilds,
            });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
