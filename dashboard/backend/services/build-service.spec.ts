import { describe, it, expect, mock, beforeEach, spyOn } from 'bun:test';

mock.module('../models/build', () => ({
    Build: {
        findOne: mock(() => Promise.resolve(null)),
        find: mock(() => Promise.resolve([])),
        paginate: mock(() => Promise.resolve({ docs: [] })),
        countDocuments: mock(() => Promise.resolve(0)),
        deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })),
    },
}));

mock.module('./screenshots-service', () => ({
    screenshotService: {
        rebase: mock(() => Promise.resolve()),
        clearBaselineScreenshots: mock(() => Promise.resolve()),
        clearBaselineScreenshotsAccordingToBuildLatestScreenshots: mock(() => Promise.resolve()),
    },
}));

import { appConfig } from '../config/app.config';
import { Build } from '../models/build';
import { buildService } from './build-service';
import { screenshotService } from './screenshots-service';

describe('buildService', () => {
    beforeEach(() => {
        (Build.findOne as any).mockClear();
        (Build.find as any).mockClear();
        (Build.paginate as any).mockClear();
        (Build.countDocuments as any).mockClear();
        (Build.deleteMany as any).mockClear();
        (screenshotService.rebase as any).mockClear();
        (screenshotService.clearBaselineScreenshots as any).mockClear();
        (screenshotService.clearBaselineScreenshotsAccordingToBuildLatestScreenshots as any).mockClear();
    });

    describe('updateBuildResult', () => {
        it('should find build and set result if build exists', async () => {
            const mockBuild = { setBuildResult: mock(() => Promise.resolve()) };
            (Build.findOne as any).mockResolvedValue(mockBuild);

            await buildService.updateBuildResult('bid123', 'passed');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
            expect(mockBuild.setBuildResult).toHaveBeenCalledWith('passed');
        });

        it('should do nothing if build does not exist', async () => {
            (Build.findOne as any).mockResolvedValue(null);

            await buildService.updateBuildResult('bid123', 'passed');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
        });
    });

    describe('getBuildByBid', () => {
        it('should return build by bid', async () => {
            const mockBuild = { bid: 'bid123' };
            (Build.findOne as any).mockReturnValue({ lean: () => mockBuild });

            const result = await buildService.getBuildByBid('bid123');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
            expect(result).toEqual(mockBuild as any);
        });
    });

    describe('getProjectBuilds', () => {
        it('should return all project builds sorted by _id desc', async () => {
            const mockBuilds = [{ bid: 'bid1' }, { bid: 'bid2' }];
            (Build.find as any).mockReturnValue({ lean: () => mockBuilds });

            const result = await buildService.getProjectBuilds('pid123');

            expect(Build.find).toHaveBeenCalledWith({ pid: 'pid123' }, {}, { sort: { _id: -1 } });
            expect(result).toEqual(mockBuilds as any);
        });
    });

    describe('getProjectPaginatedBuilds', () => {
        it('should return paginated builds', async () => {
            const mockResult = { docs: [], totalPages: 1 };
            (Build.paginate as any).mockResolvedValue(mockResult);

            const result = await buildService.getProjectPaginatedBuilds('pid123', 2);

            expect(Build.paginate).toHaveBeenCalledWith({ pid: 'pid123' }, { sort: { _id: -1 }, page: 2, limit: appConfig.buildsPerPage });
            expect(result).toEqual(mockResult);
        });
    });

    describe('getProjectBuildsCountAndLatestBuild', () => {
        it('should return builds count and latest build', async () => {
            const mockBuild = { bid: 'latest' };
            (Build.countDocuments as any).mockResolvedValue(10);
            (Build.findOne as any).mockResolvedValue(mockBuild);

            const result = await buildService.getProjectBuildsCountAndLatestBuild('pid123');

            expect(Build.countDocuments).toHaveBeenCalledWith({ pid: 'pid123' });
            expect(result).toEqual({ buildsCount: 10, latestBuild: mockBuild } as any);
        });
    });

    describe('rebase', () => {
        it('should update baseline and rebase screenshots', async () => {
            const mockBuild = { bid: 'bid123', buildIndex: 5, rebase: mock(() => Promise.resolve()) };
            (Build.findOne as any).mockResolvedValue(mockBuild);

            await buildService.rebase('proj1', 'bid123');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
            expect(screenshotService.rebase).toHaveBeenCalledWith('proj1', 5);
            expect(mockBuild.rebase).toHaveBeenCalled();
        });

        it('should do nothing if build does not exist', async () => {
            (Build.findOne as any).mockResolvedValue(null);

            await buildService.rebase('proj1', 'bid123');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
            expect(screenshotService.rebase).not.toHaveBeenCalled();
        });
    });

    describe('debase', () => {
        it('should debase screenshots and build if build is baseline', async () => {
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { pid: 'pid123', bid: 'bid1', isBaseline: true, buildIndex: 1, debase: mock(() => Promise.resolve()) };

            (Build.find as any).mockResolvedValue([{ bid: 'bid1', buildIndex: 1 }]);

            await buildService.debase(mockProject, mockBuild);

            expect(Build.find).toHaveBeenCalledWith({ pid: 'pid123', isBaseline: true }, {}, { sort: { _id: -1 } });
            expect(screenshotService.clearBaselineScreenshots).toHaveBeenCalledWith('proj1');
            expect(mockBuild.debase).toHaveBeenCalled();
        });

        it('should do nothing if build is not baseline', async () => {
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { isBaseline: false, debase: mock(() => Promise.resolve()) };

            await buildService.debase(mockProject, mockBuild);

            expect(mockBuild.debase).not.toHaveBeenCalled();
        });
    });

    describe('debaseScreenshots', () => {
        it('should clear all baseline screenshots when only 1 baseline build exists', async () => {
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { pid: 'pid123', bid: 'bid1', isBaseline: true, buildIndex: 1 };

            (Build.find as any).mockResolvedValue([{ bid: 'bid1', buildIndex: 1 }]);

            await buildService.debaseScreenshots(mockProject, mockBuild);

            expect(screenshotService.clearBaselineScreenshots).toHaveBeenCalledWith('proj1');
        });

        it('should clear latest baseline and rebase to previous when multiple baseline builds exist and current is the latest', async () => {
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { pid: 'pid123', bid: 'bid1', isBaseline: true, buildIndex: 5 };

            (Build.find as any).mockResolvedValue([
                { bid: 'bid1', buildIndex: 5 },
                { bid: 'bid2', buildIndex: 3 },
            ]);

            await buildService.debaseScreenshots(mockProject, mockBuild);

            expect(screenshotService.clearBaselineScreenshotsAccordingToBuildLatestScreenshots).toHaveBeenCalledWith('proj1', 5);
            expect(screenshotService.rebase).toHaveBeenCalledWith('proj1', 3);
        });

        it('should log warning when no baseline build found', async () => {
            const consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { pid: 'pid123', bid: 'bid1', isBaseline: true, buildIndex: 5 };

            (Build.find as any).mockResolvedValue([]);

            await buildService.debaseScreenshots(mockProject, mockBuild);

            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });

        it('should log warning when current build is not the latest baseline', async () => {
            const consoleWarnSpy = spyOn(console, 'warn').mockImplementation(() => {});
            const mockProject = { projectName: 'proj1' };
            const mockBuild = { pid: 'pid123', bid: 'bid2', isBaseline: true, buildIndex: 3 };

            (Build.find as any).mockResolvedValue([
                { bid: 'bid1', buildIndex: 5 },
                { bid: 'bid2', buildIndex: 3 },
            ]);

            await buildService.debaseScreenshots(mockProject, mockBuild);

            expect(consoleWarnSpy).toHaveBeenCalled();
            consoleWarnSpy.mockRestore();
        });
    });

    describe('deleteByPid', () => {
        it('should delete builds by pid', async () => {
            const mockResult = { deletedCount: 5 };
            (Build.deleteMany as any).mockResolvedValue(mockResult);

            const result = await buildService.deleteByPid('pid123');

            expect(Build.deleteMany).toHaveBeenCalledWith({ pid: 'pid123' });
            expect(result).toEqual(mockResult as any);
        });
    });

    describe('stats', () => {
        it('should return stats if build exists', async () => {
            const mockBuild = { buildStatus: 'completed', buildResult: 'passed' };
            (Build.findOne as any).mockResolvedValue(mockBuild);

            const result = await buildService.stats('bid123');

            expect(Build.findOne).toHaveBeenCalledWith({ bid: 'bid123' });
            expect(result).toEqual({ status: 'completed', result: 'passed' });
        });

        it('should return falsy if build does not exist', async () => {
            (Build.findOne as any).mockResolvedValue(null);

            const result = await buildService.stats('bid123');

            expect(result).toBeNull();
        });
    });

    describe('latestStats', () => {
        it('should return latest stats if build exists', async () => {
            const mockBuild = { bid: 'bid1', buildIndex: 1, buildStatus: 'completed', buildResult: 'passed' };
            (Build.findOne as any).mockResolvedValue(mockBuild);

            const result = await buildService.latestStats('pid123');

            expect(Build.findOne).toHaveBeenCalledWith({ pid: 'pid123' }, {}, { sort: { createdAt: -1 } });
            expect(result).toEqual({ bid: 'bid1', index: 1, status: 'completed', result: 'passed' });
        });

        it('should return falsy if build does not exist', async () => {
            (Build.findOne as any).mockResolvedValue(null);

            const result = await buildService.latestStats('pid123');

            expect(result).toBeNull();
        });
    });

    describe('updateTestCaseCount', () => {
        it('should update case count if build exists', async () => {
            const mockBuild = { setCaseCount: mock(() => Promise.resolve()) };
            (Build.findOne as any).mockResolvedValue(mockBuild);
            const caseCount = { caseFailedCount: 1, casePassedCount: 2, caseUndeterminedCount: 3, casePassedByIgnoringRectanglesCount: 4 };

            await buildService.updateTestCaseCount('pid123', 'bid123', caseCount);

            expect(Build.findOne).toHaveBeenCalledWith({ pid: 'pid123', bid: 'bid123' });
            expect(mockBuild.setCaseCount).toHaveBeenCalledWith(caseCount);
        });

        it('should do nothing if build does not exist', async () => {
            (Build.findOne as any).mockResolvedValue(null);
            const caseCount = { caseFailedCount: 1, casePassedCount: 2, caseUndeterminedCount: 3, casePassedByIgnoringRectanglesCount: 4 };

            await buildService.updateTestCaseCount('pid123', 'bid123', caseCount);

            expect(Build.findOne).toHaveBeenCalledWith({ pid: 'pid123', bid: 'bid123' });
        });
    });
});
