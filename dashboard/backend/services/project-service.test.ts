import { describe, it, expect, mock, beforeEach } from 'bun:test';

mock.module('../models/project', () => ({
    Project: Object.assign(
        function () {
            return { create: mock(() => Promise.resolve()), save: mock(() => Promise.resolve()) };
        },
        {
            findOne: mock(() => Promise.resolve(null)),
            find: mock(() => Promise.resolve([])),
            countDocuments: mock(() => Promise.resolve(0)),
            deleteOne: mock(() => Promise.resolve({ deletedCount: 1 })),
        },
    ),
}));

import { Project } from '../models/project.ts';
import { projectService } from './project-service';

describe('ProjectService', () => {
    beforeEach(() => {
        (Project.findOne as any).mockClear();
        (Project.find as any).mockClear();
        (Project.countDocuments as any).mockClear();
        (Project.deleteOne as any).mockClear();
    });

    describe('getProjectByPid', () => {
        it('should call Project.findOne with pid', async () => {
            const mockProject = { pid: 'PID1', projectName: 'test' };
            (Project.findOne as any).mockResolvedValue(mockProject);

            const result = await projectService.getProjectByPid('PID1');

            expect(Project.findOne).toHaveBeenCalledWith({ pid: 'PID1' });
            expect(result).toEqual(mockProject as any);
        });

        it('should return null when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);

            const result = await projectService.getProjectByPid('NONEXISTENT');
            expect(result).toBeNull();
        });
    });

    describe('isProjectNameExist', () => {
        it('should return true when count > 0', async () => {
            (Project.countDocuments as any).mockResolvedValue(1);

            const result = await projectService.isProjectNameExist('existing-project');

            expect(Project.countDocuments).toHaveBeenCalledWith({ projectName: 'existing-project' });
            expect(result).toBe(true);
        });

        it('should return false when count is 0', async () => {
            (Project.countDocuments as any).mockResolvedValue(0);

            const result = await projectService.isProjectNameExist('new-project');
            expect(result).toBe(false);
        });
    });

    describe('getAllProjects', () => {
        it('should return all projects', async () => {
            const projects = [{ pid: 'P1' }, { pid: 'P2' }];
            (Project.find as any).mockReturnValue({ lean: () => projects });

            const result = await projectService.getAllProjects();

            expect(Project.find).toHaveBeenCalledWith({});
            expect(result).toEqual(projects as any);
        });

        it('should return empty array when no projects', async () => {
            (Project.find as any).mockReturnValue({ lean: () => [] });

            const result = await projectService.getAllProjects();
            expect(result).toEqual([]);
        });
    });

    describe('getSharedProjectRootPath', () => {
        it('should return shared root path when project exists', async () => {
            (Project.findOne as any).mockResolvedValue({ projectName: 'test', sharedProjectRootPath: '/shared/path' });

            const result = await projectService.getSharedProjectRootPath('test');
            expect(result).toBe('/shared/path');
        });

        it('should return null/undefined when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);

            const result = await projectService.getSharedProjectRootPath('nonexistent');
            expect(result).toBeFalsy();
        });
    });

    describe('deleteProject', () => {
        it('should call Project.deleteOne with pid', async () => {
            (Project.deleteOne as any).mockResolvedValue({ deletedCount: 1 });

            const result = await projectService.deleteProject('PID1');

            expect(Project.deleteOne).toHaveBeenCalledWith({ pid: 'PID1' });
            expect(result).toEqual({ deletedCount: 1 } as any);
        });
    });

    describe('updateProjectImageUrl', () => {
        it('should update project image url when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updateProjectImageUrl: mockUpdateFn });

            await projectService.updateProjectImageUrl('PID1', '/new-image.webp');

            expect(mockUpdateFn).toHaveBeenCalledWith('/new-image.webp');
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);

            await projectService.updateProjectImageUrl('NONEXISTENT', '/img.webp');
        });
    });

    describe('updateProjectColorThreshold', () => {
        it('should update color threshold when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updateProjectColorThreshold: mockUpdateFn });

            await projectService.updateProjectColorThreshold('PID1', 0.5);

            expect(mockUpdateFn).toHaveBeenCalledWith(0.5);
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);
            await projectService.updateProjectColorThreshold('NONEXISTENT', 0.5);
        });
    });

    describe('updateProjectDetectAntialiasing', () => {
        it('should update detect antialiasing when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updateProjectDetectAntialiasing: mockUpdateFn });

            await projectService.updateProjectDetectAntialiasing('PID1', false);

            expect(mockUpdateFn).toHaveBeenCalledWith(false);
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);
            await projectService.updateProjectDetectAntialiasing('NONEXISTENT', true);
        });
    });

    describe('updateEnableProjectIgnoringCluster', () => {
        it('should update ignoring cluster when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updateProjectIgnoringCluster: mockUpdateFn });

            await projectService.updateEnableProjectIgnoringCluster('PID1', true);

            expect(mockUpdateFn).toHaveBeenCalledWith(true);
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);
            await projectService.updateEnableProjectIgnoringCluster('NONEXISTENT', false);
        });
    });

    describe('updateProjectIgnoringClusterSize', () => {
        it('should update ignoring cluster size when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updateProjectIgnoringClusterSize: mockUpdateFn });

            await projectService.updateProjectIgnoringClusterSize('PID1', 100);

            expect(mockUpdateFn).toHaveBeenCalledWith(100);
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);
            await projectService.updateProjectIgnoringClusterSize('NONEXISTENT', 50);
        });
    });

    describe('updateEnablePreserveIgnoringOnRebase', () => {
        it('should update preserve ignoring on rebase when project exists', async () => {
            const mockUpdateFn = mock(() => Promise.resolve());
            (Project.findOne as any).mockResolvedValue({ pid: 'PID1', updatePreserveIgnoringOnRebase: mockUpdateFn });

            await projectService.updateEnablePreserveIgnoringOnRebase('PID1', true);

            expect(mockUpdateFn).toHaveBeenCalledWith(true);
        });

        it('should do nothing when project not found', async () => {
            (Project.findOne as any).mockResolvedValue(null);
            await projectService.updateEnablePreserveIgnoringOnRebase('NONEXISTENT', false);
        });
    });
});
