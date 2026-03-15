import { activityLogService } from '../services/activity-log-service.ts';
import { buildService } from '../services/build-service.ts';
import { caseService } from '../services/case-service.ts';
import { ignoringService } from '../services/ignoring-service.ts';
import { projectService } from '../services/project-service.ts';
import { jsonResponse, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage, allCasesPassed, passBuild, getHost, getUserFromRequest } from '../utils/server-utils.ts';

export function registerBuildRoutes(router: Router) {
    /**
     * @swagger
     * /api/build/{bid}:
     *   get:
     *     tags: [Build]
     *     description: Get build details
     *     parameters:
     *       - in: path
     *         name: bid
     *         schema:
     *           type: string
     *         required: true
     *         description: Build ID
     *     responses:
     *       200:
     *         description: Build details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 isAllPassed:
     *                   type: boolean
     *                 pid:
     *                   type: string
     *                 bid:
     *                   type: string
     *                 isBaseline:
     *                   type: boolean
     *                 projectName:
     *                   type: string
     *                 buildIndex:
     *                   type: integer
     *                 allCases:
     *                   type: array
     *                   items:
     *                     type: object
     *                 ableToRebase:
     *                   type: boolean
     *                 hostUrl:
     *                   type: string
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Build or project not found
     *       500:
     *         description: Internal Server Error
     */
    router.get('/api/build/:bid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const build = await buildService.getBuildByBid(params.bid);
            if (!build) {
                return notFound({ message: 'Build not found' });
            }
            const project = await projectService.getProjectByPid(build.pid);

            if (!project) {
                return notFound({ code: 404, message: 'Project not found' });
            }

            const cases = await caseService.getBuildCases(build.bid);
            const isAllPassed = allCasesPassed(cases);
            const ableToRebase = !build.isBaseline && isAllPassed;

            return jsonResponse({
                isAllPassed,
                pid: build.pid,
                bid: build.bid,
                isBaseline: build.isBaseline,
                projectName: project.projectName,
                buildIndex: build.buildIndex,
                buildVersion: build.buildVersion,
                metadata: build.metadata,
                allCases: cases,
                ableToRebase,
                hostUrl: `http://${getHost(req)}`,
            });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/build/rebase/{bid}:
     *   post:
     *     tags: [Build]
     *     description: Rebase a build
     *     parameters:
     *       - in: path
     *         name: bid
     *         schema:
     *           type: string
     *         required: true
     *         description: Build ID
     *     responses:
     *       200:
     *         description: Success
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Not found
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/build/rebase/:bid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const build = await buildService.getBuildByBid(params.bid);
            if (!build) {
                return notFound({ code: 404, message: 'Build not found' });
            }
            const project = await projectService.getProjectByPid(build.pid);
            if (!project) {
                return notFound({ code: 404, message: 'Project not found' });
            }
            if (!project.preserveIgnoringOnRebase) {
                await ignoringService.cleanProjectIgnoring(build.pid);
            }
            await buildService.rebase(project.projectName, params.bid);
            logger.info(`rebased build, bid=${params.bid}`);
            await activityLogService.log(
                build.pid,
                'build_rebased',
                getUserFromRequest(req),
                'build',
                params.bid,
                `Build rebased for project "${project.projectName}"`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/build/debase/{bid}:
     *   post:
     *     tags: [Build]
     *     description: Debase a build
     *     parameters:
     *       - in: path
     *         name: bid
     *         schema:
     *           type: string
     *         required: true
     *         description: Build ID
     *     responses:
     *       200:
     *         description: Success
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Not found
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/build/debase/:bid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const build = await buildService.getBuildByBid(params.bid);
            if (!build) {
                return notFound({ code: 404, message: 'Build not found' });
            }
            const project = await projectService.getProjectByPid(build.pid);
            if (!project) {
                return notFound({ code: 404, message: 'Project not found' });
            }
            if (!project.preserveIgnoringOnRebase) {
                await ignoringService.cleanProjectIgnoring(build.pid);
            }
            await buildService.debase(project, build);
            logger.info(`debased build, bid=${params.bid}`);
            await activityLogService.log(
                build.pid,
                'build_debased',
                getUserFromRequest(req),
                'build',
                params.bid,
                `Build debased for project "${project.projectName}"`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/build/pass/{bid}:
     *   post:
     *     tags: [Build]
     *     description: Pass a build
     *     parameters:
     *       - in: path
     *         name: bid
     *         schema:
     *           type: string
     *         required: true
     *         description: Build ID
     *     responses:
     *       200:
     *         description: Success
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Not found
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/build/pass/:bid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const build = await buildService.getBuildByBid(params.bid);
            if (!build) {
                return notFound({ code: 404, message: 'Build not found' });
            }
            const caseCount = await caseService.countBuildCases(build.bid);
            await caseService.passAllBuildCases(build.bid);
            await passBuild(build.pid, build.bid, caseCount);
            logger.info(`pass build, bid=${params.bid}`);
            await activityLogService.log(
                build.pid,
                'build_passed',
                getUserFromRequest(req),
                'build',
                params.bid,
                `All cases marked as passed in build`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
