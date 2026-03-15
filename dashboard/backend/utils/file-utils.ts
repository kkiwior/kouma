import { readdirSync, unlinkSync, mkdirSync, existsSync, statSync, rmSync } from 'node:fs';
import path from 'node:path';
import { logger } from './logger.ts';

export type Direction = 'testToLatest' | 'latestToBaseline' | 'default';

export async function moveFiles(sourceDirectory: string, destDirectory: string, direction: Direction): Promise<void> {
    const files = readdirSync(sourceDirectory);

    for (const eachFile of files) {
        if (direction === 'latestToBaseline' && !eachFile.includes('.latest.')) {
            continue;
        }

        let destinationFile: string;
        switch (direction) {
            case 'testToLatest':
                const ext1 = path.extname(eachFile);
                destinationFile = eachFile.replace(ext1, '.latest' + ext1);
                break;
            case 'latestToBaseline':
                const ext2 = path.extname(eachFile);
                destinationFile = eachFile.replace('.latest' + ext2, '.baseline' + ext2);
                break;
            default:
                destinationFile = eachFile;
                break;
        }

        const fullPathSourceFile = path.join(sourceDirectory, eachFile);
        const fullPathDestinationFile = path.join(destDirectory, destinationFile);

        const sourceFile = Bun.file(fullPathSourceFile);
        await Bun.write(fullPathDestinationFile, sourceFile);

        logger.debug(`copied file: ${fullPathSourceFile} -> ${fullPathDestinationFile}`);
    }
}

export function clearBaselineFilesAccordingToLatestFiles(baselineDirectory: string, latestDirectory: string): void {
    const baselineFilesMap = new Map<string, string>();
    readdirSync(baselineDirectory).forEach((file) => {
        if (file.includes('.baseline.')) {
            const base = path.basename(file, '.baseline' + path.extname(file));
            baselineFilesMap.set(base, file);
        }
    });

    const latestFiles = readdirSync(latestDirectory);

    for (const latestFile of latestFiles) {
        if (!latestFile.includes('.diff.')) {
            const latestFileBasename = path.basename(latestFile, '.latest' + path.extname(latestFile));

            if (baselineFilesMap.has(latestFileBasename)) {
                const actualBaselineFile = baselineFilesMap.get(latestFileBasename)!;
                const baselineFileToRemove = path.join(baselineDirectory, actualBaselineFile);

                deleteFile(baselineFileToRemove);
                logger.debug(`removed baseline file: ${baselineFileToRemove}`);
            }
        }
    }
}

export function isLinkedLatestAndBaseline(latestFilename: string, baselineFilename: string): boolean {
    const latestExt = path.extname(latestFilename);
    const baselineExt = path.extname(baselineFilename);
    const latestBase = path.basename(latestFilename).replace('.latest' + latestExt, '');
    const baselineBase = path.basename(baselineFilename).replace('.baseline' + baselineExt, '');
    return latestBase === baselineBase;
}

export function clearDirectory(directory: string): void {
    const files = readdirSync(directory);
    for (const file of files) {
        const filePath = path.join(directory, file);
        deleteFile(filePath);
    }
}

export function listFiles(directory: string): string[] {
    return readdirSync(directory).map((file) => path.join(directory, file));
}

export function listFilesNoPath(directory: string): string[] {
    return readdirSync(directory);
}

export function createDirectory(directory: string): string | undefined {
    return mkdirSync(directory, { recursive: true });
}

export function toCaseName(baselineOrLatestFilename: string): string {
    return path.basename(baselineOrLatestFilename).split('.')[0] + path.extname(baselineOrLatestFilename);
}

export function toCaseBaseName(baselineOrLatestFilename: string): string {
    return path.basename(baselineOrLatestFilename).split('.')[0];
}

export function toDiffFilename(baselineOrLatestFilename: string): string {
    return baselineOrLatestFilename.split('.')[0] + '.diff.png';
}

export function toDiffFileWithPercentage(filename: string, percentage: number): string {
    const diffSuffer = Math.round(percentage * Math.pow(10, 8));
    return filename.replace('.diff.png', `.${diffSuffer}.diff.png`);
}

export function percentageFromDiffFile(filename: string): number {
    const parts = filename.split('.').reverse();
    const percentagePart = parts[2];
    return Number(percentagePart) / Math.pow(10, 8);
}

export function removePercentageToDiffFile(filename: string): string {
    const parts = filename.split('.');
    if (parts.length >= 4) {
        const percentagePart = parts[parts.length - 3];
        return filename.replace(`.${percentagePart}.`, '.');
    }
    return filename;
}

export function isProjectExist(projectRelatedFolder: string): boolean {
    return existsSync(projectRelatedFolder);
}

export function emptyDirectory(directoryPath: string): void {
    const entities = readdirSync(directoryPath);
    for (const entity of entities) {
        const fullPath = path.join(directoryPath, entity);
        if (statSync(fullPath).isDirectory()) {
            deleteDirectory(fullPath);
        } else {
            deleteFile(fullPath);
        }
    }
    logger.debug(`emptied directory -> ${directoryPath}`);
}

export function deleteDirectory(directoryPath: string): void {
    rmSync(directoryPath, { recursive: true, force: true });
    logger.debug(`delete directory -> ${directoryPath}`);
}

export function deleteFile(filePath: string): void {
    try {
        unlinkSync(filePath);
    } catch (e) {
        logger.error(`Failed to delete file at ${filePath}: `, e);
    }
}
