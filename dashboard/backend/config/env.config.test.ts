import { describe, it, expect } from 'bun:test';
import {
    screenshotsPathToUrl,
    errorImage,
    defaultProjectBgImage,
    projectRootPath,
    projectInitializeFolders,
    projectImagePath,
    projectImageUrl,
    localTestScreenshotsLatestPath,
    localTestScreenshotsBaselinePath,
    exchangeRootDir,
} from './env.config';

describe('env.config', () => {
    describe('constants', () => {
        it('should export errorImage path', () => {
            expect(errorImage).toBe('/public/image/kouma-error.webp');
        });

        it('should export defaultProjectBgImage path', () => {
            expect(defaultProjectBgImage).toBe('/public/image/kouma-bg.webp');
        });

        it('should export localTestScreenshotsLatestPath', () => {
            expect(localTestScreenshotsLatestPath).toBe('screenshots/latest');
        });

        it('should export localTestScreenshotsBaselinePath', () => {
            expect(localTestScreenshotsBaselinePath).toBe('screenshots/baseline');
        });

        it('should export exchangeRootDir as a string', () => {
            expect(typeof exchangeRootDir).toBe('string');
        });
    });

    describe('projectRootPath', () => {
        it('should return path with project name', () => {
            const result = projectRootPath('my-project');
            expect(result).toContain('my-project');
            expect(result).toContain('file-server/projects');
        });
    });

    describe('projectInitializeFolders', () => {
        it('should return baseline, builds, and latest folder paths', () => {
            const folders = projectInitializeFolders('test-proj');
            expect(folders.baselineFolder).toContain('test-proj/baseline');
            expect(folders.buildsFolder).toContain('test-proj/builds');
            expect(folders.latestFolder).toContain('test-proj/latest');
        });

        it('should return paths starting with /file-server/projects/', () => {
            const folders = projectInitializeFolders('proj');
            expect(folders.baselineFolder.startsWith('/file-server/projects/')).toBe(true);
            expect(folders.buildsFolder.startsWith('/file-server/projects/')).toBe(true);
            expect(folders.latestFolder.startsWith('/file-server/projects/')).toBe(true);
        });
    });

    describe('projectImagePath', () => {
        it('should contain project name in the path', () => {
            const result = projectImagePath('my-project');
            expect(result).toContain('my-project');
            expect(result).toContain('.webp');
        });
    });

    describe('projectImageUrl', () => {
        it('should contain project name in the URL', () => {
            const result = projectImageUrl('test');
            expect(result).toContain('test');
            expect(result).toContain('.webp');
        });
    });

    describe('screenshotsPathToUrl', () => {
        it('should replace exchange root dir with file server host', () => {
            const result = screenshotsPathToUrl(exchangeRootDir + '/some/path');
            expect(result).toContain('/some/path');
            expect(result).not.toContain(exchangeRootDir);
        });
    });
});
