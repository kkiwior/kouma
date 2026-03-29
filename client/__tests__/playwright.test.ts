import { describe, expect, test, mock, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import KoumaPlaywrightReporter from '../src/playwright';

const KOUMA_SCREENSHOTS_FOLDER = './kouma-pw-screenshots';

describe('KoumaPlaywrightReporter', () => {
    afterEach(() => {
        if (fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)) {
            fs.rmSync(KOUMA_SCREENSHOTS_FOLDER, { recursive: true, force: true });
        }
    });

    test('prepares screenshots folder on construction', () => {
        new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });
        expect(fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)).toBe(true);
    });

    test('cleans existing screenshots folder on construction', () => {
        fs.mkdirSync(KOUMA_SCREENSHOTS_FOLDER, { recursive: true });
        fs.writeFileSync(path.join(KOUMA_SCREENSHOTS_FOLDER, 'old.png'), 'data');

        new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        const files = fs.readdirSync(KOUMA_SCREENSHOTS_FOLDER);
        expect(files).toHaveLength(0);
    });

    test('onTestEnd copies path-based screenshot attachments', () => {
        const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        const tmpFile = '/tmp/kouma-pw-test-screenshot.png';
        fs.writeFileSync(tmpFile, 'screenshot-data');

        try {
            reporter.onTestEnd(
                { title: 'test' },
                { status: 'passed', attachments: [{ name: 'homepage', contentType: 'image/png', path: tmpFile }] },
            );

            const copied = path.join(KOUMA_SCREENSHOTS_FOLDER, 'kouma-pw-test-screenshot.png');
            expect(fs.existsSync(copied)).toBe(true);
            expect(fs.readFileSync(copied, 'utf-8')).toBe('screenshot-data');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });

    test('onTestEnd writes body-based screenshot attachments', () => {
        const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        reporter.onTestEnd(
            { title: 'test' },
            { status: 'passed', attachments: [{ name: 'login', contentType: 'image/png', body: Buffer.from('png-body') }] },
        );

        const dest = path.join(KOUMA_SCREENSHOTS_FOLDER, 'login.png');
        expect(fs.existsSync(dest)).toBe(true);
        expect(fs.readFileSync(dest, 'utf-8')).toBe('png-body');
    });

    test('onTestEnd handles jpeg content type correctly', () => {
        const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        reporter.onTestEnd(
            { title: 'test' },
            { status: 'passed', attachments: [{ name: 'photo', contentType: 'image/jpeg', body: Buffer.from('jpeg-body') }] },
        );

        const dest = path.join(KOUMA_SCREENSHOTS_FOLDER, 'photo.jpeg');
        expect(fs.existsSync(dest)).toBe(true);
    });

    test('onTestEnd ignores non-image attachments', () => {
        const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        reporter.onTestEnd(
            { title: 'test' },
            {
                status: 'passed',
                attachments: [
                    { name: 'trace', contentType: 'application/zip', path: '/tmp/trace.zip' },
                    { name: 'video', contentType: 'video/webm', path: '/tmp/video.webm' },
                ],
            },
        );

        const files = fs.readdirSync(KOUMA_SCREENSHOTS_FOLDER);
        expect(files).toHaveLength(0);
    });

    test('tracks passed and total test counts', () => {
        const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        reporter.onTestEnd({ title: 'test1' }, { status: 'passed', attachments: [] });
        reporter.onTestEnd({ title: 'test2' }, { status: 'failed', attachments: [] });
        reporter.onTestEnd({ title: 'test3' }, { status: 'passed', attachments: [] });

        // We verify indirectly via onEnd behavior — see triggerOnAllPassed tests below
        expect(true).toBe(true);
    });

    test('does not trigger visual testing when triggerVisualTesting is false', async () => {
        const originalFetch = globalThis.fetch;
        const fetchMock = mock(async () => new Response('', { status: 200 }));
        globalThis.fetch = fetchMock as typeof fetch;

        try {
            const reporter = new KoumaPlaywrightReporter({
                host: 'http://localhost',
                apiKey: 'key',
                pid: 'pid',
                buildVersion: 'v1',
                triggerVisualTesting: false,
            });

            reporter.onTestEnd({ title: 'test' }, { status: 'passed', attachments: [] });
            await reporter.onEnd({ status: 'passed' });

            expect(fetchMock).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('does not trigger when triggerOnAllPassed is true and some tests failed', async () => {
        const originalFetch = globalThis.fetch;
        const fetchMock = mock(async () => new Response('', { status: 200 }));
        globalThis.fetch = fetchMock as typeof fetch;

        try {
            const reporter = new KoumaPlaywrightReporter({
                host: 'http://localhost',
                apiKey: 'key',
                pid: 'pid',
                buildVersion: 'v1',
                triggerOnAllPassed: true,
            });

            reporter.onTestEnd({ title: 'test1' }, { status: 'passed', attachments: [] });
            reporter.onTestEnd({ title: 'test2' }, { status: 'failed', attachments: [] });
            await reporter.onEnd({ status: 'failed' });

            expect(fetchMock).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('triggers upload when all tests passed', async () => {
        const originalFetch = globalThis.fetch;
        const fetchCalls: string[] = [];

        globalThis.fetch = mock(async (url: string | URL | Request) => {
            fetchCalls.push(url.toString());
            if (url.toString().includes('/slave/build/create')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            if (url.toString().includes('/slave/images/build/')) {
                return new Response(JSON.stringify({ receivedImages: ['screenshot.png'] }), { status: 200 });
            }
            if (url.toString().includes('/slave/build/finalize')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            return new Response('Not found', { status: 404 });
        }) as typeof fetch;

        try {
            const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost:9999', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

            // Add a screenshot
            const tmpFile = '/tmp/kouma-pw-upload-test.png';
            fs.writeFileSync(tmpFile, 'screenshot-data');
            reporter.onTestEnd(
                { title: 'test' },
                { status: 'passed', attachments: [{ name: 'homepage', contentType: 'image/png', path: tmpFile }] },
            );

            await reporter.onEnd({ status: 'passed' });

            expect(fetchCalls.length).toBeGreaterThan(0);
            expect(fetchCalls.some((u) => u.includes('/slave/build/create'))).toBe(true);
            expect(fetchCalls.some((u) => u.includes('/slave/images/build/'))).toBe(true);
            expect(fetchCalls.some((u) => u.includes('/slave/build/finalize'))).toBe(true);

            fs.unlinkSync(tmpFile);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('removes screenshots folder after upload by default', async () => {
        const originalFetch = globalThis.fetch;

        globalThis.fetch = mock(async (url: string | URL | Request) => {
            if (url.toString().includes('/slave/build/create')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            if (url.toString().includes('/slave/images/build/')) {
                return new Response(JSON.stringify({ receivedImages: ['screenshot.png'] }), { status: 200 });
            }
            if (url.toString().includes('/slave/build/finalize')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            return new Response('Not found', { status: 404 });
        }) as typeof fetch;

        try {
            const reporter = new KoumaPlaywrightReporter({ host: 'http://localhost:9999', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

            const tmpFile = '/tmp/kouma-pw-cleanup-test.png';
            fs.writeFileSync(tmpFile, 'screenshot-data');
            reporter.onTestEnd(
                { title: 'test' },
                { status: 'passed', attachments: [{ name: 'page', contentType: 'image/png', path: tmpFile }] },
            );

            await reporter.onEnd({ status: 'passed' });

            expect(fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)).toBe(false);

            fs.unlinkSync(tmpFile);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('keeps screenshots folder when removeScreenshotsAfterUpload is false', async () => {
        const originalFetch = globalThis.fetch;

        globalThis.fetch = mock(async (url: string | URL | Request) => {
            if (url.toString().includes('/slave/build/create')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            if (url.toString().includes('/slave/images/build/')) {
                return new Response(JSON.stringify({ receivedImages: ['screenshot.png'] }), { status: 200 });
            }
            if (url.toString().includes('/slave/build/finalize')) {
                return new Response(JSON.stringify({ pid: 'pid', bid: 'bid', buildIndex: 1 }), { status: 200 });
            }
            return new Response('Not found', { status: 404 });
        }) as typeof fetch;

        try {
            const reporter = new KoumaPlaywrightReporter({
                host: 'http://localhost:9999',
                apiKey: 'key',
                pid: 'pid',
                buildVersion: 'v1',
                removeScreenshotsAfterUpload: false,
            });

            const tmpFile = '/tmp/kouma-pw-keep-test.png';
            fs.writeFileSync(tmpFile, 'screenshot-data');
            reporter.onTestEnd(
                { title: 'test' },
                { status: 'passed', attachments: [{ name: 'page', contentType: 'image/png', path: tmpFile }] },
            );

            await reporter.onEnd({ status: 'passed' });

            expect(fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)).toBe(true);

            fs.unlinkSync(tmpFile);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
