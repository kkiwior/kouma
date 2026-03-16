import { ProjectConfig } from '../../frontend/src/types';
import { defaultProjectBgImage, projectImagePath, projectImageUrl, projectRootPath } from '../config/env.config.ts';
import { activityLogService } from '../services/activity-log-service.ts';
import { buildService } from '../services/build-service.ts';
import { caseService } from '../services/case-service.ts';
import { fileService } from '../services/file-service.ts';
import { ignoringService } from '../services/ignoring-service.ts';
import { projectService } from '../services/project-service.ts';
import { webhookService } from '../services/webhook-service.ts';
import { parseJsonBody, parseMultipartFiles, jsonResponse, badRequest, notFound, internalServerError } from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { getEnv } from '../utils/env-utils.js';
import { logger } from '../utils/logger.ts';
import { requireApiAuth, safeErrorMessage, validateProjectName, getUserFromRequest } from '../utils/server-utils.ts';
import { projectImageValidator } from '../utils/validator-utils.ts';

export function registerAdminRoutes(router: Router) {
    /**
     * @swagger
     * /api/admin/env:
     *   get:
     *     tags: [Admin]
     *     description: Get environment variables
     *     responses:
     *       200:
     *         description: Environment data
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 serviceEnv:
     *                   type: string
     *                 serviceHostUrl:
     *                   type: string
     */
    router.get('/api/admin/env', async () => {
        return jsonResponse({ serviceEnv: getEnv('ENV'), serviceHostUrl: getEnv('FS_HOST_URL') });
    });

    /**
     * @swagger
     * /api/admin/project/create:
     *   post:
     *     tags: [Admin]
     *     description: Create a project
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               projectName:
     *                 type: string
     *               labels:
     *                 type: array
     *                 items:
     *                   type: string
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
     *                 pid:
     *                   type: string
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     */
    router.post('/api/admin/project/create', async (req) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const body = await parseJsonBody(req);
            const projectNameRaw = body.projectName as string;
            const valError = validateProjectName(projectNameRaw);
            if (valError) {
                return badRequest({ errors: [{ msg: valError }] });
            }

            const projectDisplayName = projectNameRaw;
            const projectName = projectNameRaw.toLowerCase().replace(/\s/g, '_');

            if (await projectService.isProjectNameExist(projectName)) {
                return badRequest({ message: `Project name '${projectNameRaw}' already exists` });
            }

            const folders = fileService.createNewProjectFolders(projectName);
            logger.info('FBI --> Info: created new project folders: ', folders);

            let labels: string[] = [];
            if (body.labels) {
                if (Array.isArray(body.labels)) {
                    labels = body.labels.map(String);
                } else if (typeof body.labels === 'string') {
                    labels = body.labels
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean);
                }
            }

            const project = await projectService.createProject(
                projectName,
                projectDisplayName,
                defaultProjectBgImage,
                projectRootPath(projectName),
                labels,
            );
            logger.info(`project created, PID: ${project.pid}`);
            await activityLogService.log(
                project.pid,
                'project_created',
                getUserFromRequest(req),
                'project',
                project.pid,
                `Project "${projectDisplayName}" created`,
            );
            return jsonResponse({ success: true, pid: project.pid });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/admin/project/config/{pid}:
     *   post:
     *     tags: [Admin]
     *     description: Configure a project
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
     *             properties:
     *               projectColorThreshold:
     *                 type: number
     *               projectDetectAntialiasing:
     *                 type: boolean
     *               projectIgnoringCluster:
     *                 type: boolean
     *               projectIgnoringClusterSize:
     *                 type: number
     *               preserveIgnoringOnRebase:
     *                 type: boolean
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
     */
    router.post('/api/admin/project/config/:pid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            const body = await parseJsonBody(req);

            const updates: Partial<ProjectConfig> = {};
            const projectColorThreshold = Number(body.projectColorThreshold);
            if (projectColorThreshold >= 0 && projectColorThreshold <= 1) {
                updates.projectColorThreshold = projectColorThreshold;
            }
            updates.projectDetectAntialiasing = !!body.projectDetectAntialiasing;
            updates.projectIgnoringCluster = !!body.projectIgnoringCluster;

            const projectIgnoringClusterSize = Number(body.projectIgnoringClusterSize);
            if (projectIgnoringClusterSize >= 1 && projectIgnoringClusterSize <= 5000) {
                updates.projectIgnoringClusterSize = projectIgnoringClusterSize;
            }
            updates.preserveIgnoringOnRebase = !!body.preserveIgnoringOnRebase;

            await projectService.updateProjectConfig(project.pid, updates);
            await activityLogService.log(
                project.pid,
                'project_configured',
                getUserFromRequest(req),
                'project',
                project.pid,
                `Project "${project.projectName}" configuration updated`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/admin/project/image/{pid}:
     *   post:
     *     tags: [Admin]
     *     description: Upload a project image
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
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               projectImage:
     *                 type: string
     *                 format: binary
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
     *       400:
     *         description: Bad request
     *       401:
     *         description: Unauthorized
     *       404:
     *         description: Not found
     */
    router.post('/api/admin/project/image/:pid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        if (!params.pid) return badRequest({ message: 'Missing PID' });
        try {
            const files = await parseMultipartFiles(req);
            if (Object.keys(files).length === 0) {
                return badRequest({ message: 'No image content' });
            }
            if (!files.projectImage) {
                return badRequest({ message: 'Missing projectImage' });
            }

            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }

            const valResult = projectImageValidator(files.projectImage.name);
            if (valResult !== true) {
                return badRequest({ message: valResult });
            }

            const imageFilePath = projectImagePath(project.projectName);
            await files.projectImage.mv(imageFilePath);

            await projectService.updateProjectImageUrl(project.pid, projectImageUrl(project.projectName));
            logger.info(`FBI --> Info: updated card image for project ${project.projectName}`);
            await activityLogService.log(
                project.pid,
                'project_image_updated',
                getUserFromRequest(req),
                'project',
                project.pid,
                `Project "${project.projectName}" image updated`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/admin/project/clean/{pid}:
     *   post:
     *     tags: [Admin]
     *     description: Clean a project
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
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
     */
    router.post('/api/admin/project/clean/:pid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            await caseService.deleteByPid(project.pid);
            await buildService.deleteByPid(project.pid);
            await ignoringService.cleanProjectIgnoring(project.pid);
            fileService.clearProjectArtifacts(project.projectName);
            logger.info(`cleaned project pid=${project.pid}`);
            await activityLogService.log(
                project.pid,
                'project_cleaned',
                getUserFromRequest(req),
                'project',
                project.pid,
                `Project "${project.projectName}" cleaned`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/admin/project/delete/{pid}:
     *   post:
     *     tags: [Admin]
     *     description: Delete a project
     *     parameters:
     *       - in: path
     *         name: pid
     *         schema:
     *           type: string
     *         required: true
     *         description: Project ID
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
     */
    router.post('/api/admin/project/delete/:pid', async (req, params) => {
        const authErr = requireApiAuth(req);
        if (authErr) return authErr;
        try {
            const project = await projectService.getProjectByPid(params.pid);
            if (!project) {
                return notFound({ message: 'Project not found' });
            }
            await caseService.deleteByPid(project.pid);
            await buildService.deleteByPid(project.pid);
            await projectService.deleteProject(project.pid);
            await ignoringService.cleanProjectIgnoring(project.pid);
            await webhookService.deleteWebhooksByPid(project.pid);
            fileService.deleteProjectDirectory(project.projectName);
            fileService.deleteProjectImage(project.projectName);
            logger.info(`deleted project pid=${project.pid}`);
            await activityLogService.log(
                project.pid,
                'project_deleted',
                getUserFromRequest(req),
                'project',
                project.pid,
                `Project "${project.projectName}" deleted`,
            );
            return jsonResponse({ success: true });
        } catch (error) {
            logger.error(error);
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });
}
