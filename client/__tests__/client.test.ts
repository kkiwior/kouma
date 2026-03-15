import { describe, expect, test, mock, beforeEach, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { KoumaClient } from '../src/client';

const TEST_HOST = 'http://localhost:9999';
const TEST_API_KEY = 'test-api-key';
const TEST_PID = 'test-project-id';
const TEST_BID = 'test-build-id';
const TEST_BUILD_VERSION = 'v1.0.0';

function createClient(): KoumaClient {
    return new KoumaClient({ host: TEST_HOST, apiKey: TEST_API_KEY });
}

describe('KoumaClient', () => {
    describe('constructor', () => {
        test('trims trailing slashes from host', () => {
            const client = new KoumaClient({ host: 'http://example.com///', apiKey: 'key' });
            expect(client).toBeDefined();
        });
    });

    describe('getBuildStats', () => {
        test('sends correct request and returns stats', async () => {
            const mockStats = { status: 'completed', result: 'passed' };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
                expect(url).toBe(`${TEST_HOST}/stats/build?bid=${TEST_BID}`);
                expect(init?.headers).toEqual({ 'x-api-key': TEST_API_KEY });
                return new Response(JSON.stringify(mockStats), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.getBuildStats(TEST_BID);
                expect(result).toEqual(mockStats);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('throws on non-OK response', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(async () => {
                return new Response('Not found', { status: 404 });
            }) as typeof fetch;

            try {
                const client = createClient();
                expect(client.getBuildStats(TEST_BID)).rejects.toThrow('Failed to get build stats');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('getLatestBuildStats', () => {
        test('sends correct request and returns stats', async () => {
            const mockStats = { index: 5, bid: TEST_BID, status: 'completed', result: 'passed' };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request) => {
                expect(url).toBe(`${TEST_HOST}/stats/build/latest?pid=${TEST_PID}`);
                return new Response(JSON.stringify(mockStats), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.getLatestBuildStats(TEST_PID);
                expect(result).toEqual(mockStats);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('newBuild', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync('/tmp/kouma-test-');
            fs.writeFileSync(path.join(tmpDir, 'valid-screenshot.png'), 'fake-png-data');
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        test('uploads screenshots and initializes build', async () => {
            const mockBuild = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1 };
            const fetchCalls: string[] = [];
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request) => {
                const urlStr = url.toString();
                fetchCalls.push(urlStr);

                if (urlStr.includes('/slave/images/')) {
                    return new Response(JSON.stringify({ receivedImages: ['valid-screenshot.png'] }), { status: 200 });
                }
                if (urlStr.includes('/slave/build/initialize')) {
                    return new Response(JSON.stringify(mockBuild), { status: 200 });
                }
                return new Response('Not found', { status: 404 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.newBuild({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION, screenshotsDirectory: tmpDir });

                expect(result).toEqual(mockBuild);
                expect(fetchCalls).toHaveLength(2);
                expect(fetchCalls[0]).toContain('/slave/images/project-tests/');
                expect(fetchCalls[1]).toContain('/slave/build/initialize');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('returns undefined when no valid screenshots found', async () => {
            const emptyDir = fs.mkdtempSync('/tmp/kouma-empty-');
            try {
                const client = createClient();
                const result = await client.newBuild({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION, screenshotsDirectory: emptyDir });
                expect(result).toBeUndefined();
            } finally {
                fs.rmSync(emptyDir, { recursive: true, force: true });
            }
        });

        test('skips unsupported file types but accepts supported image formats', async () => {
            fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'not a screenshot');
            fs.writeFileSync(path.join(tmpDir, 'photo.jpg'), 'fake-jpg-data');
            const fetchCalls: string[] = [];
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request) => {
                const urlStr = url.toString();
                fetchCalls.push(urlStr);

                if (urlStr.includes('/slave/images/')) {
                    return new Response(JSON.stringify({ receivedImages: ['uploaded.png'] }), { status: 200 });
                }
                if (urlStr.includes('/slave/build/initialize')) {
                    return new Response(JSON.stringify({ pid: TEST_PID, bid: TEST_BID, buildIndex: 1 }), { status: 200 });
                }
                return new Response('Not found', { status: 404 });
            }) as typeof fetch;

            try {
                const client = createClient();
                await client.newBuild({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION, screenshotsDirectory: tmpDir });

                const uploadCalls = fetchCalls.filter((u) => u.includes('/slave/images/'));
                // Should upload valid-screenshot.png and photo.jpg, but skip readme.txt
                expect(uploadCalls).toHaveLength(2);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('newBuildSync', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync('/tmp/kouma-test-sync-');
            fs.writeFileSync(path.join(tmpDir, 'screenshot1.png'), 'fake-png-1');
            fs.writeFileSync(path.join(tmpDir, 'screenshot2.png'), 'fake-png-2');
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        test('uploads all screenshots in single request', async () => {
            const mockResult = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1, status: 'completed', result: 'passed' };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                expect(urlStr).toBe(`${TEST_HOST}/slave/build/sync`);
                expect(init?.method).toBe('POST');
                return new Response(JSON.stringify(mockResult), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.newBuildSync({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION, screenshotsDirectory: tmpDir });

                expect(result).toEqual(mockResult);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('returns undefined when no valid screenshots found', async () => {
            const emptyDir = fs.mkdtempSync('/tmp/kouma-empty-sync-');
            try {
                const client = createClient();
                const result = await client.newBuildSync({
                    pid: TEST_PID,
                    buildVersion: TEST_BUILD_VERSION,
                    screenshotsDirectory: emptyDir,
                });
                expect(result).toBeUndefined();
            } finally {
                fs.rmSync(emptyDir, { recursive: true, force: true });
            }
        });
    });

    describe('createBuild', () => {
        test('sends correct request and returns build info', async () => {
            const mockBuild = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1 };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                expect(urlStr).toContain(`${TEST_HOST}/slave/build/create`);
                expect(urlStr).toContain(`pid=${TEST_PID}`);
                expect(urlStr).toContain(`buildVersion=${TEST_BUILD_VERSION}`);
                expect(init?.method).toBe('POST');
                expect(init?.headers).toEqual({ 'x-api-key': TEST_API_KEY });
                return new Response(JSON.stringify(mockBuild), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.createBuild({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION });

                expect(result).toEqual(mockBuild);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('includes metadata in request', async () => {
            const mockBuild = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1 };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request) => {
                const urlStr = url.toString();
                expect(urlStr).toContain('meta_branch=main');
                expect(urlStr).toContain('meta_env=ci');
                return new Response(JSON.stringify(mockBuild), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.createBuild({
                    pid: TEST_PID,
                    buildVersion: TEST_BUILD_VERSION,
                    metadata: { branch: 'main', env: 'ci' },
                });

                expect(result).toEqual(mockBuild);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('throws on non-OK response', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(async () => {
                return new Response('Server error', { status: 500 });
            }) as typeof fetch;

            try {
                const client = createClient();
                expect(client.createBuild({ pid: TEST_PID, buildVersion: TEST_BUILD_VERSION })).rejects.toThrow('Build creation failed');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('uploadBuildScreenshot', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync('/tmp/kouma-test-upload-');
            fs.writeFileSync(path.join(tmpDir, 'test.png'), 'fake-png-data');
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        test('uploads screenshot to build-specific endpoint', async () => {
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                expect(urlStr).toBe(`${TEST_HOST}/slave/images/build/${TEST_BID}`);
                expect(init?.method).toBe('POST');
                expect(init?.headers).toEqual({ 'x-api-key': TEST_API_KEY });
                return new Response(JSON.stringify({ receivedImages: ['test.png'] }), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.uploadBuildScreenshot(TEST_BID, path.join(tmpDir, 'test.png'));

                expect(result).toEqual({ receivedImages: ['test.png'] });
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('throws on non-OK response', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(async () => {
                return new Response('Bad request', { status: 400 });
            }) as typeof fetch;

            try {
                const client = createClient();
                expect(client.uploadBuildScreenshot(TEST_BID, path.join(tmpDir, 'test.png'))).rejects.toThrow('Upload failed');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('finalizeBuild', () => {
        test('sends correct request and returns build info', async () => {
            const mockBuild = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1 };
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
                const urlStr = url.toString();
                expect(urlStr).toBe(`${TEST_HOST}/slave/build/finalize?bid=${TEST_BID}`);
                expect(init?.method).toBe('POST');
                expect(init?.headers).toEqual({ 'x-api-key': TEST_API_KEY });
                return new Response(JSON.stringify(mockBuild), { status: 200 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.finalizeBuild(TEST_BID);

                expect(result).toEqual(mockBuild);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('throws on non-OK response', async () => {
            const originalFetch = globalThis.fetch;
            globalThis.fetch = mock(async () => {
                return new Response('Not found', { status: 404 });
            }) as typeof fetch;

            try {
                const client = createClient();
                expect(client.finalizeBuild(TEST_BID)).rejects.toThrow('Build finalize failed');
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });

    describe('newBuildStaged', () => {
        let tmpDir: string;

        beforeEach(() => {
            tmpDir = fs.mkdtempSync('/tmp/kouma-test-staged-');
            fs.writeFileSync(path.join(tmpDir, 'screenshot1.png'), 'fake-png-1');
            fs.writeFileSync(path.join(tmpDir, 'screenshot2.png'), 'fake-png-2');
        });

        afterEach(() => {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        });

        test('creates build, uploads screenshots, and finalizes', async () => {
            const mockBuild = { pid: TEST_PID, bid: TEST_BID, buildIndex: 1 };
            const fetchCalls: string[] = [];
            const originalFetch = globalThis.fetch;

            globalThis.fetch = mock(async (url: string | URL | Request) => {
                const urlStr = url.toString();
                fetchCalls.push(urlStr);

                if (urlStr.includes('/slave/build/create')) {
                    return new Response(JSON.stringify(mockBuild), { status: 200 });
                }
                if (urlStr.includes('/slave/images/build/')) {
                    return new Response(JSON.stringify({ receivedImages: ['screenshot.png'] }), { status: 200 });
                }
                if (urlStr.includes('/slave/build/finalize')) {
                    return new Response(JSON.stringify(mockBuild), { status: 200 });
                }
                return new Response('Not found', { status: 404 });
            }) as typeof fetch;

            try {
                const client = createClient();
                const result = await client.newBuildStaged({
                    pid: TEST_PID,
                    buildVersion: TEST_BUILD_VERSION,
                    screenshotsDirectory: tmpDir,
                });

                expect(result).toEqual(mockBuild);

                const createCalls = fetchCalls.filter((u) => u.includes('/slave/build/create'));
                const uploadCalls = fetchCalls.filter((u) => u.includes('/slave/images/build/'));
                const finalizeCalls = fetchCalls.filter((u) => u.includes('/slave/build/finalize'));

                expect(createCalls).toHaveLength(1);
                expect(uploadCalls).toHaveLength(2);
                expect(finalizeCalls).toHaveLength(1);

                // Verify order: create → uploads → finalize
                const createIdx = fetchCalls.findIndex((u) => u.includes('/slave/build/create'));
                const firstUploadIdx = fetchCalls.findIndex((u) => u.includes('/slave/images/build/'));
                const finalizeIdx = fetchCalls.findIndex((u) => u.includes('/slave/build/finalize'));
                expect(createIdx).toBeLessThan(firstUploadIdx);
                expect(firstUploadIdx).toBeLessThan(finalizeIdx);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });

        test('returns undefined when no valid screenshots found', async () => {
            const emptyDir = fs.mkdtempSync('/tmp/kouma-empty-staged-');
            try {
                const client = createClient();
                const result = await client.newBuildStaged({
                    pid: TEST_PID,
                    buildVersion: TEST_BUILD_VERSION,
                    screenshotsDirectory: emptyDir,
                });
                expect(result).toBeUndefined();
            } finally {
                fs.rmSync(emptyDir, { recursive: true, force: true });
            }
        });
    });
});
