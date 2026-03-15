import { describe, expect, test, mock, afterEach } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { createCypressPlugin } from '../src/cypress';

const KOUMA_SCREENSHOTS_FOLDER = './kouma-screenshots';

describe('createCypressPlugin', () => {
    afterEach(() => {
        if (fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)) {
            fs.rmSync(KOUMA_SCREENSHOTS_FOLDER, { recursive: true, force: true });
        }
    });

    test('registers after:screenshot and after:run event handlers', () => {
        const events: string[] = [];
        const onMock = mock((event: string) => {
            events.push(event);
        });

        createCypressPlugin(onMock, { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        expect(events).toContain('after:screenshot');
        expect(events).toContain('after:run');
        expect(onMock).toHaveBeenCalledTimes(2);
    });

    test('prepares screenshots folder on initialization', () => {
        const onMock = mock(() => {});

        createCypressPlugin(onMock, { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        expect(fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)).toBe(true);
    });

    test('cleans existing screenshots folder on initialization', () => {
        fs.mkdirSync(KOUMA_SCREENSHOTS_FOLDER, { recursive: true });
        fs.writeFileSync(path.join(KOUMA_SCREENSHOTS_FOLDER, 'old.png'), 'data');

        const onMock = mock(() => {});
        createCypressPlugin(onMock, { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        const files = fs.readdirSync(KOUMA_SCREENSHOTS_FOLDER);
        expect(files).toHaveLength(0);
    });

    test('after:screenshot handler copies screenshot to folder', () => {
        const handlers: Record<string, (...args: unknown[]) => unknown> = {};
        const onMock = mock((event: string, cb: (...args: unknown[]) => unknown) => {
            handlers[event] = cb;
        });

        createCypressPlugin(onMock, { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' });

        const tmpFile = '/tmp/kouma-cypress-test-screenshot.png';
        fs.writeFileSync(tmpFile, 'screenshot-data');

        try {
            handlers['after:screenshot']({ path: tmpFile });
            const copied = path.join(KOUMA_SCREENSHOTS_FOLDER, 'kouma-cypress-test-screenshot.png');
            expect(fs.existsSync(copied)).toBe(true);
            expect(fs.readFileSync(copied, 'utf-8')).toBe('screenshot-data');
        } finally {
            fs.unlinkSync(tmpFile);
        }
    });

    test('does not trigger visual testing when triggerVisualTesting is false', async () => {
        const handlers: Record<string, (...args: unknown[]) => unknown> = {};
        const onMock = mock((event: string, cb: (...args: unknown[]) => unknown) => {
            handlers[event] = cb;
        });
        const originalFetch = globalThis.fetch;
        const fetchMock = mock(async () => new Response('', { status: 200 }));
        globalThis.fetch = fetchMock as typeof fetch;

        try {
            createCypressPlugin(
                onMock,
                { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' },
                { triggerVisualTesting: false },
            );

            await handlers['after:run']({ totalTests: 5, totalPassed: 5 });
            expect(fetchMock).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('does not trigger when triggerOnAllPassed is true and some tests failed', async () => {
        const handlers: Record<string, (...args: unknown[]) => unknown> = {};
        const onMock = mock((event: string, cb: (...args: unknown[]) => unknown) => {
            handlers[event] = cb;
        });
        const originalFetch = globalThis.fetch;
        const fetchMock = mock(async () => new Response('', { status: 200 }));
        globalThis.fetch = fetchMock as typeof fetch;

        try {
            createCypressPlugin(
                onMock,
                { host: 'http://localhost', apiKey: 'key', pid: 'pid', buildVersion: 'v1' },
                { triggerOnAllPassed: true },
            );

            await handlers['after:run']({ totalTests: 5, totalPassed: 3 });
            expect(fetchMock).not.toHaveBeenCalled();
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
