import { describe, expect, it, mock, beforeEach } from 'bun:test';
import path from 'path';
import { fileService } from './file-service';

mock.module('check-disk-space', () => {
    return {
        default: mock(async () => {
            return { free: 1024 * 1024 * 50, size: 1024 * 1024 * 100 };
        }),
    };
});

mock.module('../config/env.config', () => {
    return {
        exchangeRootDir: '/mock/exchange',
        projectInitializeFolders: mock((projectName: string) => {
            return {
                baselineFolder: `/file-server/projects/${projectName}/baseline`,
                buildsFolder: `/file-server/projects/${projectName}/builds`,
                latestFolder: `/file-server/projects/${projectName}/latest`,
            };
        }),
        projectRootPath: mock((projectName: string) => {
            return `/mock/exchange/file-server/projects/${projectName}`;
        }),
        projectImagePath: mock((projectName: string) => {
            return `/mock/exchange/file-server/assets/project-team-image/team-${projectName}.348x225.webp`;
        }),
    };
});

const mockCreateDirectory = mock(() => {});
const mockProjectExists = mock(() => true);
const mockEmptyDirectory = mock(() => {});
const mockDeleteDirectory = mock(() => {});
const mockDeleteFile = mock(() => {});

mock.module('../utils/file-utils', () => {
    return {
        createDirectory: mockCreateDirectory,
        isProjectExist: mockProjectExists,
        emptyDirectory: mockEmptyDirectory,
        deleteDirectory: mockDeleteDirectory,
        deleteFile: mockDeleteFile,
    };
});

import { projectInitializeFolders, projectRootPath, projectImagePath } from '../config/env.config';

describe('FileService', () => {
    beforeEach(() => {
        mockCreateDirectory.mockClear();
        mockProjectExists.mockClear();
        mockEmptyDirectory.mockClear();
        mockDeleteDirectory.mockClear();
        mockDeleteFile.mockClear();
    });

    describe('createNewProjectFolders', () => {
        it('should create folders and return paths', async () => {
            const result = await fileService.createNewProjectFolders('testProj');
            const subFolders = projectInitializeFolders('testProj');

            const expectedBaseline = path.join('/mock/exchange', subFolders.baselineFolder);
            const expectedBuilds = path.join('/mock/exchange', subFolders.buildsFolder);
            const expectedLatest = path.join('/mock/exchange', subFolders.latestFolder);

            expect(mockCreateDirectory).toHaveBeenCalledTimes(3);
            expect(mockCreateDirectory).toHaveBeenNthCalledWith(1, expectedBaseline);
            expect(mockCreateDirectory).toHaveBeenNthCalledWith(2, expectedBuilds);
            expect(mockCreateDirectory).toHaveBeenNthCalledWith(3, expectedLatest);

            expect(result).toEqual({ baselineFolder: expectedBaseline, buildsFolder: expectedBuilds, latestFolder: expectedLatest });
        });
    });

    describe('isProjectExist', () => {
        it('should return true if latest folder exists', async () => {
            mockProjectExists.mockReturnValueOnce(true);
            const result = await fileService.isProjectExist('testProj');
            const expectedPath = path.join('/mock/exchange', projectInitializeFolders('testProj').latestFolder);

            expect(mockProjectExists).toHaveBeenCalledTimes(1);
            expect(mockProjectExists).toHaveBeenCalledWith(expectedPath);
            expect(result).toBe(true);
        });

        it('should return false if latest folder does not exist', async () => {
            mockProjectExists.mockReturnValueOnce(false);
            const result = await fileService.isProjectExist('testProj');
            const expectedPath = path.join('/mock/exchange', projectInitializeFolders('testProj').latestFolder);

            expect(mockProjectExists).toHaveBeenCalledTimes(1);
            expect(mockProjectExists).toHaveBeenCalledWith(expectedPath);
            expect(result).toBe(false);
        });
    });

    describe('clearProjectArtifacts', () => {
        it('should empty baseline, builds, and latest directories', () => {
            fileService.clearProjectArtifacts('testProj');
            const subFolders = projectInitializeFolders('testProj');

            expect(mockEmptyDirectory).toHaveBeenCalledTimes(3);
            expect(mockEmptyDirectory).toHaveBeenNthCalledWith(1, path.join('/mock/exchange', subFolders.baselineFolder));
            expect(mockEmptyDirectory).toHaveBeenNthCalledWith(2, path.join('/mock/exchange', subFolders.buildsFolder));
            expect(mockEmptyDirectory).toHaveBeenNthCalledWith(3, path.join('/mock/exchange', subFolders.latestFolder));
        });
    });

    describe('deleteProjectDirectory', () => {
        it('should delete the project root directory', () => {
            fileService.deleteProjectDirectory('testProj');
            expect(mockDeleteDirectory).toHaveBeenCalledTimes(1);
            expect(mockDeleteDirectory).toHaveBeenCalledWith(projectRootPath('testProj'));
        });
    });

    describe('getDiskSpace', () => {
        it('should return formatted disk space info', async () => {
            const result = await fileService.getDiskSpace();

            expect(result.path).toBe('/mock/exchange');
            expect(result.free).toBe('50.00M');
            expect(result.size).toBe('100.00M');
        });
    });

    describe('deleteProjectImage', () => {
        it('should delete the project image file', () => {
            fileService.deleteProjectImage('testProj');
            expect(mockDeleteFile).toHaveBeenCalledTimes(1);
            expect(mockDeleteFile).toHaveBeenCalledWith(projectImagePath('testProj'));
        });
    });
});
