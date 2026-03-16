import { IRectangle } from '../models/ignoring.ts';
import { activityLogService } from '../services/activity-log-service.ts';
import { buildService } from '../services/build-service.ts';
import { caseService } from '../services/case-service.ts';
import { ignoringService } from '../services/ignoring-service.ts';
import { projectService } from '../services/project-service.ts';
import { parseJsonBody, jsonResponse, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage, checkAndUpdateBuildResult, getHost, getUserFromRequest, toRelativePath } from '../utils/server-utils.ts';

export function registerCaseRoutes(router: Router) {
    /**
     * @swagger
     * /api/case/{cid}:
     *   get:
     *     tags: [Case]
     *     description: Get case details
     *     parameters:
     *       - in: path
     *         name: cid
     *         schema:
     *           type: string
     *         required: true
     *         description: Case ID
     *     responses:
     *       200:
     *         description: Case details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 pid:
     *                   type: string
     *                 bid:
     *                   type: string
     *                 cid:
     *                   type: string
     *                 prevCase:
     *                   type: string
     *                 nextCase:
     *                   type: string
     *                 buildIndex:
     *                   type: integer
     *                 projectName:
     *                   type: string
     *                 caseName:
     *                   type: string
     *                 caseResult:
     *                   type: string
     *                 diffUrl:
     *                   type: string
     *                 latestUrl:
     *                   type: string
     *                 baselineUrl:
     *                   type: string
     *                 diffPercentage:
     *                   type: number
     *                 view:
     *                   type: integer
     *                 hostUrl:
     *                   type: string
     *                 rectangles:
     *                   type: array
     *                 rectanglesString:
     *                   type: string
     *                 comprehensiveCaseResult:
     *                   type: string
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Not found
     *       500:
     *         description: Internal Server Error
     */
    router.get('/api/case/:cid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const url = new URL(req.url || '', `http://${getHost(req)}`);
            const onlyFails = url.searchParams.get('onlyFails') === 'true';

            const caseNeighbors = await caseService.getCaseWithNeighborsByCid(params.cid, onlyFails);
            if (!caseNeighbors) {
                return notFound({ code: 404, message: 'Project not found' });
            }
            const { testCase } = caseNeighbors;
            const build = await buildService.getBuildByBid(testCase.bid);
            if (!build) {
                return notFound({ code: 404, message: 'Build not found' });
            }
            const project = await projectService.getProjectByPid(testCase.pid);
            if (!project) {
                return notFound({ code: 404, message: 'Project not found' });
            }
            const ignoring = await ignoringService.getPlainIgnoring(project.pid, testCase.caseName);

            const view = testCase.linkBaseline ? (testCase.diffPercentage ? 3 : 2) : 1;

            return jsonResponse({
                pid: build.pid,
                bid: build.bid,
                cid: testCase.cid,
                prevCase: caseNeighbors.prevCase,
                nextCase: caseNeighbors.nextCase,
                buildIndex: build.buildIndex,
                projectName: project.projectName,
                caseName: testCase.caseName,
                caseResult: testCase.caseResult,
                diffUrl: toRelativePath(testCase.linkDiff),
                latestUrl: toRelativePath(testCase.linkLatest),
                baselineUrl: toRelativePath(testCase.linkBaseline),
                diffPercentage: testCase.diffPercentage,
                view,
                hostUrl: `http://${getHost(req)}`,
                rectangles: ignoring ? ignoring.rectangles : [],
                rectanglesString: ignoring && ignoring.rectangles ? JSON.stringify(ignoring.rectangles) : '',
                comprehensiveCaseResult: testCase.comprehensiveCaseResult,
            });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/case/pass/{cid}:
     *   post:
     *     tags: [Case]
     *     description: Pass a case
     *     parameters:
     *       - in: path
     *         name: cid
     *         schema:
     *           type: string
     *         required: true
     *         description: Case ID
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
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/case/pass/:cid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const testCase = await caseService.passCaseAndClean(params.cid);
            if (!testCase) {
                return notFound({ message: 'Case not found' });
            }
            await checkAndUpdateBuildResult(testCase.bid);
            logger.info(`set case passed, cid=${params.cid}`);
            await activityLogService.log(testCase.pid, 'case_passed', getUserFromRequest(req), 'case', params.cid, `Case marked as passed`);
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/case/fail/{cid}:
     *   post:
     *     tags: [Case]
     *     description: Fail a case
     *     parameters:
     *       - in: path
     *         name: cid
     *         schema:
     *           type: string
     *         required: true
     *         description: Case ID
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
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/case/fail/:cid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const testCase = await caseService.failCaseAndClean(params.cid);
            if (!testCase) {
                return notFound({ message: 'Case not found' });
            }
            await checkAndUpdateBuildResult(testCase.bid);
            logger.info(`set case failed, cid=${params.cid}`);
            await activityLogService.log(testCase.pid, 'case_failed', getUserFromRequest(req), 'case', params.cid, `Case marked as failed`);
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/case/ignoring:
     *   post:
     *     tags: [Case]
     *     description: Ignore regions in a case
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               pid:
     *                 type: string
     *               caseName:
     *                 type: string
     *               rectangles:
     *                 type: array
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
     *                 ignoring:
     *                   type: object
     *       401:
     *         description: Unauthorized
     *       500:
     *         description: Internal Server Error
     */
    router.post('/api/case/ignoring', async (req) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const body = await parseJsonBody(req);
            const { pid, caseName, rectangles } = body as { pid: string; caseName: string; rectangles?: IRectangle[] };
            const result = await ignoringService.createOrUpdateIgnoring(pid, caseName, rectangles || []);
            logger.info(`saved ignoring for pid=${pid}, caseName=${caseName}`);
            await activityLogService.log(
                pid,
                'case_ignoring_updated',
                getUserFromRequest(req),
                'case',
                `${pid}/${caseName}`,
                `Ignoring regions updated for case "${caseName}"`,
            );
            return jsonResponse({ success: true, ignoring: result });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
