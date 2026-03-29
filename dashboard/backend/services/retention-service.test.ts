import { describe, it, expect, mock, beforeEach } from 'bun:test';

mock.module('../models/build', () => ({
    Build: {
        findOne: mock(() => ({ lean: () => Promise.resolve(null) })),
        find: mock(() => ({ lean: () => Promise.resolve([]) })),
        deleteOne: mock(() => Promise.resolve({ deletedCount: 1 })),
        deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })),
    },
}));

mock.module('../models/case', () => ({ Case: { deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })) } }));

mock.module('./project-service', () => ({ projectService: { getAllProjects: mock(() => Promise.resolve([])) } }));

mock.module('../utils/file-utils', () => ({ deleteDirectory: mock(() => {}) }));

mock.module('../utils/logger', () => ({
    logger: { info: mock(() => {}), debug: mock(() => {}), warn: mock(() => {}), error: mock(() => {}) },
}));

const mockExistsSync = mock(() => false);
mock.module('node:fs', () => ({
    existsSync: mockExistsSync,
    readdirSync: mock(() => []),
    unlinkSync: mock(() => {}),
    mkdirSync: mock(() => undefined),
    statSync: mock(() => ({ isDirectory: () => false })),
    rmSync: mock(() => {}),
}));

import { Build } from '../models/build';
import { Case } from '../models/case';
import { deleteDirectory } from '../utils/file-utils';
import { projectService } from './project-service';
import { retentionService } from './retention-service';

describe('retentionService', () => {
    beforeEach(() => {
        (Build.findOne as any).mockClear();
        (Build.find as any).mockClear();
        (Build.deleteOne as any).mockClear();
        (Build.deleteMany as any).mockClear();
        (Case.deleteMany as any).mockClear();
        (projectService.getAllProjects as any).mockClear();
        (deleteDirectory as any).mockClear();
        mockExistsSync.mockClear();
    });

    describe('applyRetentionForAllProjects', () => {
        it('should iterate all projects and apply retention', async () => {
            const projects = [
                {
                    pid: 'p1',
                    projectName: 'proj1',
                    sharedProjectRootPath: '/data/proj1',
                    retentionPolicyType: 'none',
                    retentionPolicyValue: 0,
                },
                {
                    pid: 'p2',
                    projectName: 'proj2',
                    sharedProjectRootPath: '/data/proj2',
                    retentionPolicyType: 'builds',
                    retentionPolicyValue: 5,
                },
            ];
            (projectService.getAllProjects as any).mockResolvedValue(projects);
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve([]) });
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });

            await retentionService.applyRetentionForAllProjects();

            expect(projectService.getAllProjects).toHaveBeenCalled();
        });

        it('should continue processing other projects if one fails', async () => {
            const projects = [
                {
                    pid: 'p1',
                    projectName: 'proj1',
                    sharedProjectRootPath: '/data/proj1',
                    retentionPolicyType: 'builds',
                    retentionPolicyValue: 1,
                },
                {
                    pid: 'p2',
                    projectName: 'proj2',
                    sharedProjectRootPath: '/data/proj2',
                    retentionPolicyType: 'none',
                    retentionPolicyValue: 0,
                },
            ];
            (projectService.getAllProjects as any).mockResolvedValue(projects);

            // First project will fail - .lean() rejects
            (Build.findOne as any).mockReturnValueOnce({ lean: () => Promise.reject(new Error('DB error')) });

            // Should not throw
            await retentionService.applyRetentionForAllProjects();

            expect(projectService.getAllProjects).toHaveBeenCalled();
        });
    });

    describe('applyRetention', () => {
        it('should skip when policy is none', async () => {
            await retentionService.applyRetention({
                pid: 'p1',
                projectName: 'proj1',
                sharedProjectRootPath: '/data/proj1',
                retentionPolicyType: 'none',
                retentionPolicyValue: 0,
            });

            expect(Build.find).not.toHaveBeenCalled();
        });

        it('should skip when policy value is 0', async () => {
            await retentionService.applyRetention({
                pid: 'p1',
                projectName: 'proj1',
                sharedProjectRootPath: '/data/proj1',
                retentionPolicyType: 'builds',
                retentionPolicyValue: 0,
            });

            expect(Build.find).not.toHaveBeenCalled();
        });

        it('should skip when retentionPolicyType is undefined (backward compat)', async () => {
            await retentionService.applyRetention({ pid: 'p1', projectName: 'proj1', sharedProjectRootPath: '/data/proj1' });

            expect(Build.find).not.toHaveBeenCalled();
        });
    });

    describe('getBuildsToDelete - builds policy', () => {
        it('should return empty array when total builds <= policy value', async () => {
            const builds = [
                { bid: 'b1', buildIndex: 2, isBaseline: false },
                { bid: 'b2', buildIndex: 1, isBaseline: false },
            ];
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve(builds) });

            const result = await retentionService.getBuildsToDelete('p1', 'builds', 5);

            expect(result).toEqual([]);
        });

        it('should return older builds beyond the retention count', async () => {
            const builds = [
                { bid: 'b5', buildIndex: 5, isBaseline: false },
                { bid: 'b4', buildIndex: 4, isBaseline: false },
                { bid: 'b3', buildIndex: 3, isBaseline: false },
                { bid: 'b2', buildIndex: 2, isBaseline: false },
                { bid: 'b1', buildIndex: 1, isBaseline: false },
            ];
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve(builds) });

            const result = await retentionService.getBuildsToDelete('p1', 'builds', 3);

            expect(result).toHaveLength(2);
            expect(result[0].bid).toBe('b2');
            expect(result[1].bid).toBe('b1');
        });

        it('should never delete the latest baseline even if it is old', async () => {
            const latestBaseline = { bid: 'b1', buildIndex: 1, isBaseline: true };
            const builds = [
                { bid: 'b5', buildIndex: 5, isBaseline: false },
                { bid: 'b4', buildIndex: 4, isBaseline: false },
                { bid: 'b3', buildIndex: 3, isBaseline: false },
                { bid: 'b2', buildIndex: 2, isBaseline: false },
                { bid: 'b1', buildIndex: 1, isBaseline: true },
            ];
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(latestBaseline) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve(builds) });

            const result = await retentionService.getBuildsToDelete('p1', 'builds', 3);

            // b2 and b1 would be candidates, but b1 is the latest baseline so it's excluded
            expect(result).toHaveLength(1);
            expect(result[0].bid).toBe('b2');
        });
    });

    describe('getBuildsToDelete - days policy', () => {
        it('should return builds older than X days', async () => {
            const oldBuilds = [
                { bid: 'b2', buildIndex: 2, isBaseline: false },
                { bid: 'b1', buildIndex: 1, isBaseline: false },
            ];
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve(oldBuilds) });

            const result = await retentionService.getBuildsToDelete('p1', 'days', 30);

            expect(result).toHaveLength(2);
        });

        it('should exclude the latest baseline from deletion in days policy', async () => {
            const latestBaseline = { bid: 'b1', buildIndex: 1, isBaseline: true };
            const oldBuilds = [
                { bid: 'b2', buildIndex: 2, isBaseline: false },
                { bid: 'b1', buildIndex: 1, isBaseline: true },
            ];
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(latestBaseline) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve(oldBuilds) });

            const result = await retentionService.getBuildsToDelete('p1', 'days', 30);

            expect(result).toHaveLength(1);
            expect(result[0].bid).toBe('b2');
        });

        it('should return empty array when no builds are older than X days', async () => {
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });
            (Build.find as any).mockReturnValue({ lean: () => Promise.resolve([]) });

            const result = await retentionService.getBuildsToDelete('p1', 'days', 30);

            expect(result).toEqual([]);
        });
    });

    describe('getBuildsToDelete - unknown policy', () => {
        it('should return empty array for unknown policy type', async () => {
            (Build.findOne as any).mockReturnValue({ lean: () => Promise.resolve(null) });

            const result = await retentionService.getBuildsToDelete('p1', 'unknown', 5);

            expect(result).toEqual([]);
        });
    });

    describe('deleteBuildArtifacts', () => {
        it('should delete build directory if it exists', async () => {
            mockExistsSync.mockReturnValue(true);

            await retentionService.deleteBuildArtifacts({ pid: 'p1', sharedProjectRootPath: '/data/proj1' }, { bid: 'b1', buildIndex: 3 });

            expect(deleteDirectory).toHaveBeenCalled();
            expect(Case.deleteMany).toHaveBeenCalledWith({ bid: 'b1' });
            expect(Build.deleteOne).toHaveBeenCalledWith({ bid: 'b1' });
        });

        it('should skip directory deletion if build dir does not exist', async () => {
            mockExistsSync.mockReturnValue(false);

            await retentionService.deleteBuildArtifacts({ pid: 'p1', sharedProjectRootPath: '/data/proj1' }, { bid: 'b1', buildIndex: 3 });

            expect(deleteDirectory).not.toHaveBeenCalled();
            expect(Case.deleteMany).toHaveBeenCalledWith({ bid: 'b1' });
            expect(Build.deleteOne).toHaveBeenCalledWith({ bid: 'b1' });
        });
    });
});
