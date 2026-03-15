import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
    moveFiles,
    clearBaselineFilesAccordingToLatestFiles,
    isLinkedLatestAndBaseline,
    clearDirectory,
    listFiles,
    listFilesNoPath,
    createDirectory,
    toCaseName,
    toCaseBaseName,
    toDiffFilename,
    toDiffFileWithPercentage,
    percentageFromDiffFile,
    removePercentageToDiffFile,
    isProjectExist,
    emptyDirectory,
    deleteDirectory,
    deleteFile,
} from './file-utils';

const TEST_DIR = '/tmp/micoo-file-utils-test';

function setupTestDir() {
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(TEST_DIR, { recursive: true });
}

function teardownTestDir() {
    rmSync(TEST_DIR, { recursive: true, force: true });
}

describe('file-utils', () => {
    beforeEach(() => {
        setupTestDir();
    });

    afterEach(() => {
        teardownTestDir();
    });

    describe('isLinkedLatestAndBaseline', () => {
        it('should return true for matching latest and baseline files', () => {
            expect(isLinkedLatestAndBaseline('screenshot.latest.png', 'screenshot.baseline.png')).toBe(true);
        });

        it('should return false for non-matching files', () => {
            expect(isLinkedLatestAndBaseline('foo.latest.png', 'bar.baseline.png')).toBe(false);
        });

        it('should handle paths with directories', () => {
            expect(isLinkedLatestAndBaseline('/a/b/img.latest.png', '/c/d/img.baseline.png')).toBe(true);
        });
    });

    describe('toCaseName', () => {
        it('should extract case name from baseline filename', () => {
            expect(toCaseName('screenshot.baseline.png')).toBe('screenshot.png');
        });

        it('should extract case name from latest filename', () => {
            expect(toCaseName('screenshot.latest.png')).toBe('screenshot.png');
        });

        it('should handle path with directory', () => {
            expect(toCaseName('/path/to/screenshot.baseline.png')).toBe('screenshot.png');
        });
    });

    describe('toCaseBaseName', () => {
        it('should extract base name from baseline filename', () => {
            expect(toCaseBaseName('screenshot.baseline.png')).toBe('screenshot');
        });

        it('should extract base name from a path', () => {
            expect(toCaseBaseName('/path/to/image.latest.png')).toBe('image');
        });
    });

    describe('toDiffFilename', () => {
        it('should convert a filename to diff filename', () => {
            expect(toDiffFilename('screenshot.baseline.png')).toBe('screenshot.diff.png');
        });

        it('should handle filenames with path', () => {
            expect(toDiffFilename('image.png')).toBe('image.diff.png');
        });
    });

    describe('toDiffFileWithPercentage', () => {
        it('should insert percentage into diff filename', () => {
            const result = toDiffFileWithPercentage('screenshot.diff.png', 0.05);
            expect(result).toContain('.diff.png');
            expect(result).toContain('screenshot');
            expect(result).toBe('screenshot.5000000.diff.png');
        });

        it('should handle zero percentage', () => {
            const result = toDiffFileWithPercentage('img.diff.png', 0);
            expect(result).toBe('img.0.diff.png');
        });

        it('should handle full percentage', () => {
            const result = toDiffFileWithPercentage('img.diff.png', 1);
            expect(result).toBe('img.100000000.diff.png');
        });
    });

    describe('percentageFromDiffFile', () => {
        it('should extract percentage from diff filename', () => {
            const result = percentageFromDiffFile('screenshot.5000000.diff.png');
            expect(result).toBeCloseTo(0.05, 8);
        });

        it('should return 0 for zero percentage', () => {
            expect(percentageFromDiffFile('img.0.diff.png')).toBe(0);
        });

        it('should handle 100% diff', () => {
            const result = percentageFromDiffFile('img.100000000.diff.png');
            expect(result).toBeCloseTo(1, 8);
        });
    });

    describe('removePercentageToDiffFile', () => {
        it('should remove percentage from diff filename', () => {
            const result = removePercentageToDiffFile('screenshot.5000000.diff.png');
            expect(result).toBe('screenshot.diff.png');
        });

        it('should return filename as-is if no percentage part (less than 4 parts)', () => {
            expect(removePercentageToDiffFile('img.diff.png')).toBe('img.diff.png');
        });
    });

    describe('createDirectory', () => {
        it('should create a directory recursively', () => {
            const dir = path.join(TEST_DIR, 'a', 'b', 'c');
            createDirectory(dir);
            expect(existsSync(dir)).toBe(true);
        });

        it('should not throw if directory already exists', () => {
            const dir = path.join(TEST_DIR, 'existing');
            mkdirSync(dir);
            expect(() => createDirectory(dir)).not.toThrow();
        });
    });

    describe('isProjectExist', () => {
        it('should return true if directory exists', () => {
            const dir = path.join(TEST_DIR, 'project');
            mkdirSync(dir);
            expect(isProjectExist(dir)).toBe(true);
        });

        it('should return false if directory does not exist', () => {
            expect(isProjectExist(path.join(TEST_DIR, 'nonexistent'))).toBe(false);
        });
    });

    describe('listFiles', () => {
        it('should list files with full path', () => {
            writeFileSync(path.join(TEST_DIR, 'a.txt'), 'a');
            writeFileSync(path.join(TEST_DIR, 'b.txt'), 'b');
            const files = listFiles(TEST_DIR);
            expect(files.length).toBe(2);
            expect(files[0]).toContain(TEST_DIR);
        });
    });

    describe('listFilesNoPath', () => {
        it('should list files without path', () => {
            writeFileSync(path.join(TEST_DIR, 'x.txt'), 'x');
            const files = listFilesNoPath(TEST_DIR);
            expect(files).toContain('x.txt');
        });
    });

    describe('deleteFile', () => {
        it('should delete a file', () => {
            const fp = path.join(TEST_DIR, 'todelete.txt');
            writeFileSync(fp, 'data');
            expect(existsSync(fp)).toBe(true);
            deleteFile(fp);
            expect(existsSync(fp)).toBe(false);
        });

        it('should not throw if file does not exist', () => {
            expect(() => deleteFile(path.join(TEST_DIR, 'nonexistent.txt'))).not.toThrow();
        });
    });

    describe('clearDirectory', () => {
        it('should remove all files from a directory', () => {
            writeFileSync(path.join(TEST_DIR, 'f1.txt'), '1');
            writeFileSync(path.join(TEST_DIR, 'f2.txt'), '2');
            clearDirectory(TEST_DIR);
            expect(readdirSync(TEST_DIR).length).toBe(0);
        });
    });

    describe('deleteDirectory', () => {
        it('should remove a directory recursively', () => {
            const dir = path.join(TEST_DIR, 'todelete');
            mkdirSync(dir);
            writeFileSync(path.join(dir, 'file.txt'), 'x');
            deleteDirectory(dir);
            expect(existsSync(dir)).toBe(false);
        });
    });

    describe('emptyDirectory', () => {
        it('should remove files and subdirectories', () => {
            const subDir = path.join(TEST_DIR, 'sub');
            mkdirSync(subDir);
            writeFileSync(path.join(TEST_DIR, 'f.txt'), 'data');
            writeFileSync(path.join(subDir, 'g.txt'), 'data');
            emptyDirectory(TEST_DIR);
            expect(readdirSync(TEST_DIR).length).toBe(0);
        });
    });

    describe('moveFiles', () => {
        it('should copy files with testToLatest direction', async () => {
            const src = path.join(TEST_DIR, 'src');
            const dest = path.join(TEST_DIR, 'dest');
            mkdirSync(src);
            mkdirSync(dest);
            writeFileSync(path.join(src, 'screenshot.png'), 'image-data');

            await moveFiles(src, dest, 'testToLatest');

            expect(existsSync(path.join(dest, 'screenshot.latest.png'))).toBe(true);
        });

        it('should copy only .latest files with latestToBaseline direction', async () => {
            const src = path.join(TEST_DIR, 'src2');
            const dest = path.join(TEST_DIR, 'dest2');
            mkdirSync(src);
            mkdirSync(dest);
            writeFileSync(path.join(src, 'img.latest.png'), 'latest-data');
            writeFileSync(path.join(src, 'img.diff.png'), 'diff-data');

            await moveFiles(src, dest, 'latestToBaseline');

            expect(existsSync(path.join(dest, 'img.baseline.png'))).toBe(true);
            expect(existsSync(path.join(dest, 'img.diff.png'))).toBe(false);
        });

        it('should copy files as-is with default direction', async () => {
            const src = path.join(TEST_DIR, 'src3');
            const dest = path.join(TEST_DIR, 'dest3');
            mkdirSync(src);
            mkdirSync(dest);
            writeFileSync(path.join(src, 'file.txt'), 'content');

            await moveFiles(src, dest, 'default');

            expect(existsSync(path.join(dest, 'file.txt'))).toBe(true);
        });
    });

    describe('clearBaselineFilesAccordingToLatestFiles', () => {
        it('should remove baseline files that match latest files', () => {
            const baselineDir = path.join(TEST_DIR, 'baseline');
            const latestDir = path.join(TEST_DIR, 'latest');
            mkdirSync(baselineDir);
            mkdirSync(latestDir);

            writeFileSync(path.join(baselineDir, 'img1.baseline.png'), 'base1');
            writeFileSync(path.join(baselineDir, 'img2.baseline.png'), 'base2');
            writeFileSync(path.join(latestDir, 'img1.latest.png'), 'latest1');

            clearBaselineFilesAccordingToLatestFiles(baselineDir, latestDir);

            expect(existsSync(path.join(baselineDir, 'img1.baseline.png'))).toBe(false);
            expect(existsSync(path.join(baselineDir, 'img2.baseline.png'))).toBe(true);
        });

        it('should skip diff files in latest directory', () => {
            const baselineDir = path.join(TEST_DIR, 'baseline2');
            const latestDir = path.join(TEST_DIR, 'latest2');
            mkdirSync(baselineDir);
            mkdirSync(latestDir);

            writeFileSync(path.join(baselineDir, 'img.baseline.png'), 'base');
            writeFileSync(path.join(latestDir, 'img.5000.diff.png'), 'diff');

            clearBaselineFilesAccordingToLatestFiles(baselineDir, latestDir);

            expect(existsSync(path.join(baselineDir, 'img.baseline.png'))).toBe(true);
        });
    });
});
