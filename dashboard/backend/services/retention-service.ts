import path from 'path';
import { existsSync } from 'node:fs';
import { Build } from '../models/build';
import { Case } from '../models/case';
import { projectService } from './project-service';
import { deleteDirectory } from '../utils/file-utils';
import { logger } from '../utils/logger';

class RetentionService {
    async applyRetentionForAllProjects() {
        const projects = await projectService.getAllProjects();
        for (const project of projects) {
            try {
                await this.applyRetention(project);
            } catch (error) {
                logger.error(`Retention policy error for project "${project.projectName}" (pid=${project.pid}):`, error);
            }
        }
    }

    async applyRetention(project: {
        pid: string;
        projectName: string;
        sharedProjectRootPath: string;
        retentionPolicyType?: string;
        retentionPolicyValue?: number;
    }) {
        const policyType = project.retentionPolicyType || 'none';
        const policyValue = project.retentionPolicyValue || 0;

        if (policyType === 'none' || policyValue <= 0) {
            return;
        }

        const buildsToDelete = await this.getBuildsToDelete(project.pid, policyType, policyValue);

        if (buildsToDelete.length === 0) {
            return;
        }

        logger.info(
            `Retention: removing ${buildsToDelete.length} build(s) from project "${project.projectName}" ` +
                `(policy: ${policyType}, value: ${policyValue})`,
        );

        for (const build of buildsToDelete) {
            await this.deleteBuildArtifacts(project, build);
        }
    }

    async getBuildsToDelete(
        pid: string,
        policyType: string,
        policyValue: number,
    ): Promise<Array<{ bid: string; buildIndex: number; isBaseline: boolean }>> {
        const latestBaseline = await Build.findOne(
            { pid, isBaseline: true },
            { bid: 1, buildIndex: 1, isBaseline: 1 },
            { sort: { _id: -1 } },
        ).lean();

        let candidates: Array<{ bid: string; buildIndex: number; isBaseline: boolean }>;

        if (policyType === 'builds') {
            const allBuilds = await Build.find(
                { pid },
                { bid: 1, buildIndex: 1, isBaseline: 1 },
                { sort: { _id: -1 } },
            ).lean();

            if (allBuilds.length <= policyValue) {
                return [];
            }

            candidates = allBuilds.slice(policyValue);
        } else if (policyType === 'days') {
            const cutoffDate = new Date(Date.now() - policyValue * 24 * 60 * 60 * 1000);

            candidates = await Build.find(
                { pid, createdAt: { $lt: cutoffDate } },
                { bid: 1, buildIndex: 1, isBaseline: 1 },
                { sort: { _id: -1 } },
            ).lean();
        } else {
            return [];
        }

        // Never delete the latest baseline
        if (latestBaseline) {
            candidates = candidates.filter((b) => b.bid !== latestBaseline.bid);
        }

        return candidates;
    }

    async deleteBuildArtifacts(
        project: { pid: string; sharedProjectRootPath: string },
        build: { bid: string; buildIndex: number },
    ) {
        // Delete build directory from disk
        const buildDir = path.join(project.sharedProjectRootPath, 'builds', `build_${build.buildIndex}`);
        if (existsSync(buildDir)) {
            deleteDirectory(buildDir);
            logger.debug(`Retention: deleted build directory ${buildDir}`);
        }

        // Delete cases from database
        await Case.deleteMany({ bid: build.bid });

        // Delete build from database
        await Build.deleteOne({ bid: build.bid });

        logger.debug(`Retention: deleted build bid=${build.bid} (index=${build.buildIndex})`);
    }
}

export const retentionService = new RetentionService();
