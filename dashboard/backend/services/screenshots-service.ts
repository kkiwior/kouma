import path from 'path';
import * as fileUtils from '../utils/file-utils';
import { projectService } from './project-service';

class ScreenshotsService {
    buildDirectory(buildIndex: number | string) {
        return `build_${buildIndex}`;
    }

    async projectSharedPaths(projectName: string) {
        const sharedProjectRootPath = await projectService.getSharedProjectRootPath(projectName);

        if (!sharedProjectRootPath) {
            throw Error(`FBI --> Error: can't find sharedProjectRootPath to project "${projectName}"`);
        }

        const baselinePath = path.join(sharedProjectRootPath, 'baseline');
        const buildsPath = path.join(sharedProjectRootPath, 'builds');
        const latestPath = path.join(sharedProjectRootPath, 'latest');

        return { baselinePath, buildsPath, latestPath };
    }

    async rebase(projectName: string, buildIndex: number | string) {
        const sharedProjectPaths = await this.projectSharedPaths(projectName);
        await fileUtils.moveFiles(
            path.join(sharedProjectPaths.buildsPath, this.buildDirectory(buildIndex)),
            sharedProjectPaths.baselinePath,
            'latestToBaseline',
        );
    }

    async clearBaselineScreenshots(projectName: string) {
        const sharedProjectPaths = await this.projectSharedPaths(projectName);
        fileUtils.clearDirectory(sharedProjectPaths.baselinePath);
    }

    async clearBaselineScreenshotsAccordingToBuildLatestScreenshots(projectName: string, buildIndex: number | string) {
        const sharedProjectPaths = await this.projectSharedPaths(projectName);
        fileUtils.clearBaselineFilesAccordingToLatestFiles(
            sharedProjectPaths.baselinePath,
            path.join(sharedProjectPaths.buildsPath, this.buildDirectory(buildIndex)),
        );
    }
}

export const screenshotService = new ScreenshotsService();
