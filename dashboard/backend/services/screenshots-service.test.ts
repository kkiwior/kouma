import { describe, it, expect, mock, beforeEach } from 'bun:test';
import path from 'path';

mock.module('./project-service', () => ({ projectService: { getSharedProjectRootPath: mock(() => Promise.resolve(null)) } }));

mock.module('../utils/file-utils', () => ({
    moveFiles: mock(() => Promise.resolve()),
    clearDirectory: mock(() => {}),
    clearBaselineFilesAccordingToLatestFiles: mock(() => {}),
}));

import * as fileUtils from '../utils/file-utils';
import { projectService } from './project-service';
import { screenshotService } from './screenshots-service';

describe('ScreenshotsService', () => {
    beforeEach(() => {
        (projectService.getSharedProjectRootPath as any).mockClear();
        (fileUtils.moveFiles as any).mockClear();
        (fileUtils.clearDirectory as any).mockClear();
        (fileUtils.clearBaselineFilesAccordingToLatestFiles as any).mockClear();
    });

    describe('buildDirectory', () => {
        it('should return correct build directory string', () => {
            expect(screenshotService.buildDirectory(123)).toBe('build_123');
            expect(screenshotService.buildDirectory('abc')).toBe('build_abc');
        });
    });

    describe('projectSharedPaths', () => {
        it('should return baseline, builds, and latest paths if project root exists', async () => {
            (projectService.getSharedProjectRootPath as any).mockResolvedValue('/mock/root');

            const paths = await screenshotService.projectSharedPaths('my-project');

            expect(projectService.getSharedProjectRootPath).toHaveBeenCalledWith('my-project');
            expect(paths).toEqual({
                baselinePath: path.join('/mock/root', 'baseline'),
                buildsPath: path.join('/mock/root', 'builds'),
                latestPath: path.join('/mock/root', 'latest'),
            });
        });

        it('should throw an error if project root does not exist', async () => {
            (projectService.getSharedProjectRootPath as any).mockResolvedValue(null);

            await expect(screenshotService.projectSharedPaths('my-project')).rejects.toThrow(
                'FBI --> Error: can\'t find sharedProjectRootPath to project "my-project"',
            );
        });
    });

    describe('rebase', () => {
        it('should call moveFiles with correct paths', async () => {
            (projectService.getSharedProjectRootPath as any).mockResolvedValue('/mock/root');

            await screenshotService.rebase('my-project', 123);

            expect(fileUtils.moveFiles).toHaveBeenCalledWith(
                path.join('/mock/root', 'builds', 'build_123'),
                path.join('/mock/root', 'baseline'),
                'latestToBaseline',
            );
        });
    });

    describe('clearBaselineScreenshots', () => {
        it('should call clearDirectory with baseline path', async () => {
            (projectService.getSharedProjectRootPath as any).mockResolvedValue('/mock/root');

            await screenshotService.clearBaselineScreenshots('my-project');

            expect(fileUtils.clearDirectory).toHaveBeenCalledWith(path.join('/mock/root', 'baseline'));
        });
    });

    describe('clearBaselineScreenshotsAccordingToBuildLatestScreenshots', () => {
        it('should call clearBaselineFilesAccordingToLatestFiles with correct paths', async () => {
            (projectService.getSharedProjectRootPath as any).mockResolvedValue('/mock/root');

            await screenshotService.clearBaselineScreenshotsAccordingToBuildLatestScreenshots('my-project', 123);

            expect(fileUtils.clearBaselineFilesAccordingToLatestFiles).toHaveBeenCalledWith(
                path.join('/mock/root', 'baseline'),
                path.join('/mock/root', 'builds', 'build_123'),
            );
        });
    });
});
