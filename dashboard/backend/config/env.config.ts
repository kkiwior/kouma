import { getEnv, getDatabaseName, getExchangeRootDir } from '../utils/env-utils.js';

let fileServerHost: string, exchangeRootDir: string, mongodbUrl: string;

const env = getEnv('ENV');
const dbUser = getEnv('DB_USERNAME');
const dbPass = getEnv('DB_PASSWORD');
const dbHost = getEnv('DB_HOST', 'localhost');
const dbName = getDatabaseName();

exchangeRootDir = getExchangeRootDir();

if (env === 'docker') {
    fileServerHost = getEnv('FS_HOST_URL', 'http://micoo-file-server:8123');
    const mongoHost = getEnv('DB_HOST', 'micoo-mongodb');
    mongodbUrl = `mongodb://${dbUser}:${dbPass}@${mongoHost}:27017/${dbName}`;
} else {
    fileServerHost = getEnv('FS_HOST_URL', 'http://localhost:8123');
    mongodbUrl = `mongodb://${dbUser}:${dbPass}@${dbHost}:27017/${dbName}`;
}

export const screenshotsPathToUrl = (screenshotsPath: string) => {
    return screenshotsPath.replace(exchangeRootDir, fileServerHost);
};

export const errorImage = '/public/image/kouma-error.webp';
export const defaultProjectBgImage = '/public/image/kouma-bg.webp';

export const projectRootPath = (projectName: string) => {
    return exchangeRootDir + `/file-server/projects/${projectName}`;
};

export const projectInitializeFolders = (projectName: string) => {
    return {
        baselineFolder: `/file-server/projects/${projectName}/baseline`,
        buildsFolder: `/file-server/projects/${projectName}/builds`,
        latestFolder: `/file-server/projects/${projectName}/latest`,
    };
};

const projectImageRelativeLocation = (projectName: string) => {
    return `/file-server/assets/project-team-image/team-${projectName}.348x225.webp`;
};

export const projectImagePath = (projectName: string) => {
    return exchangeRootDir + projectImageRelativeLocation(projectName);
};

export const projectImageUrl = (projectName: string) => {
    return projectImageRelativeLocation(projectName);
};

export const localTestScreenshotsLatestPath = 'screenshots/latest';
export const localTestScreenshotsBaselinePath = 'screenshots/baseline';

export const engineUrl = getEnv('ENGINE_URL', '');

export { mongodbUrl, exchangeRootDir };
