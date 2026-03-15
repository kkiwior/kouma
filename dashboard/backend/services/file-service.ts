import path from 'path';
import checkDiskSpace from 'check-disk-space';
import { exchangeRootDir, projectImagePath, projectInitializeFolders, projectRootPath } from '../config/env.config';
import { createDirectory, deleteDirectory, deleteFile, emptyDirectory, isProjectExist as projectExists } from '../utils/file-utils';

class FileService {
    async createNewProjectFolders(projectName: string) {
        const subFolders = projectInitializeFolders(projectName);

        const baselineFolder = path.join(exchangeRootDir, subFolders.baselineFolder);
        const buildsFolder = path.join(exchangeRootDir, subFolders.buildsFolder);
        const latestFolder = path.join(exchangeRootDir, subFolders.latestFolder);

        createDirectory(baselineFolder);
        createDirectory(buildsFolder);
        createDirectory(latestFolder);

        return { baselineFolder: baselineFolder, buildsFolder: buildsFolder, latestFolder: latestFolder };
    }

    async isProjectExist(projectName: string) {
        return projectExists(path.join(exchangeRootDir, projectInitializeFolders(projectName).latestFolder));
    }

    clearProjectArtifacts(projectName: string) {
        emptyDirectory(path.join(exchangeRootDir, projectInitializeFolders(projectName).baselineFolder));
        emptyDirectory(path.join(exchangeRootDir, projectInitializeFolders(projectName).buildsFolder));
        emptyDirectory(path.join(exchangeRootDir, projectInitializeFolders(projectName).latestFolder));
    }

    deleteProjectDirectory(projectName: string) {
        deleteDirectory(projectRootPath(projectName));
    }

    async getDiskSpace() {
        const diskSpace = await checkDiskSpace(exchangeRootDir);
        const freeSize = diskSpace.free / 1024 / 1024;
        const totalSize = diskSpace.size / 1024 / 1024;
        return {
            path: exchangeRootDir,
            free: diskSpace ? `${Number.parseFloat(freeSize.toString()).toFixed(2)}M` : 0,
            size: diskSpace ? `${Number.parseFloat(totalSize.toString()).toFixed(2)}M` : 0,
        };
    }

    deleteProjectImage(projectName: string) {
        deleteFile(projectImagePath(projectName));
    }
}

export const fileService = new FileService();
