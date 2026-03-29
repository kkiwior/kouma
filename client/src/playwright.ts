import * as fs from 'node:fs';
import * as path from 'node:path';
import { KoumaClient } from './client.js';
import type { PlaywrightReporterOptions } from './types.js';

/** @internal Shape of a Playwright test attachment. */
interface PlaywrightAttachment {
    name: string;
    contentType: string;
    path?: string;
    body?: Buffer;
}

/** @internal Subset of Playwright's TestResult used by the reporter. */
interface PlaywrightTestResult {
    status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted';
    attachments: PlaywrightAttachment[];
}

/** @internal Subset of Playwright's FullResult used by the reporter. */
interface PlaywrightFullResult {
    status: 'passed' | 'failed' | 'timedout' | 'interrupted';
}

/** @internal Subset of Playwright's TestCase used by the reporter. */
interface PlaywrightTestCase {
    title: string;
}

const KOUMA_SCREENSHOTS_FOLDER = './kouma-pw-screenshots';

const IMAGE_CONTENT_TYPES = new Set(['image/png', 'image/jpeg', 'image/bmp', 'image/webp', 'image/gif']);

/** @internal */
function removeScreenshotsFolder(): void {
    fs.rmSync(KOUMA_SCREENSHOTS_FOLDER, { recursive: true, force: true });
}

/** @internal */
function cleanScreenshotsFolder(): void {
    for (const file of fs.readdirSync(KOUMA_SCREENSHOTS_FOLDER)) {
        fs.unlinkSync(path.join(KOUMA_SCREENSHOTS_FOLDER, file));
    }
}

/** @internal */
function prepareScreenshotsFolder(): void {
    if (!fs.existsSync(KOUMA_SCREENSHOTS_FOLDER)) {
        fs.mkdirSync(KOUMA_SCREENSHOTS_FOLDER);
    } else {
        cleanScreenshotsFolder();
    }
}

/**
 * Playwright Test reporter that integrates Kouma visual regression testing.
 *
 * Collects screenshot attachments from test results and uploads them to Kouma
 * after the test suite completes.
 *
 * @example Configuration in `playwright.config.ts`
 * ```ts
 * import { defineConfig } from "@playwright/test";
 *
 * export default defineConfig({
 *   reporter: [
 *     ["kouma/playwright", {
 *       host: "https://kouma.example.com",
 *       apiKey: "your-api-key",
 *       pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *       buildVersion: process.env.GIT_SHA ?? "local",
 *     }],
 *   ],
 * });
 * ```
 *
 * @example Attach screenshots in tests
 * ```ts
 * import { test, expect } from "@playwright/test";
 *
 * test("homepage visual test", async ({ page }, testInfo) => {
 *   await page.goto("/");
 *   const screenshot = await page.screenshot();
 *   await testInfo.attach("homepage", { body: screenshot, contentType: "image/png" });
 * });
 * ```
 */
class KoumaPlaywrightReporter {
    private readonly options: PlaywrightReporterOptions;
    private readonly triggerVisualTesting: boolean;
    private readonly triggerOnAllPassed: boolean;
    private readonly removeScreenshotsAfterUpload: boolean;
    private totalTests = 0;
    private passedTests = 0;

    constructor(options: PlaywrightReporterOptions) {
        this.options = options;
        this.triggerVisualTesting = options.triggerVisualTesting ?? true;
        this.triggerOnAllPassed = options.triggerOnAllPassed ?? true;
        this.removeScreenshotsAfterUpload = options.removeScreenshotsAfterUpload ?? true;

        prepareScreenshotsFolder();
    }

    onTestEnd(_test: PlaywrightTestCase, result: PlaywrightTestResult): void {
        this.totalTests++;
        if (result.status === 'passed') {
            this.passedTests++;
        }

        for (const attachment of result.attachments) {
            if (!IMAGE_CONTENT_TYPES.has(attachment.contentType)) continue;

            const ext = attachment.contentType === 'image/jpeg' ? '.jpeg' : `.${attachment.contentType.split('/')[1]}`;

            if (attachment.path) {
                const dest = path.join(KOUMA_SCREENSHOTS_FOLDER, path.basename(attachment.path));
                fs.copyFileSync(attachment.path, dest);
            } else if (attachment.body) {
                const filename = `${attachment.name}${ext}`;
                const dest = path.join(KOUMA_SCREENSHOTS_FOLDER, filename);
                fs.writeFileSync(dest, attachment.body);
            }
        }
    }

    async onEnd(_result: PlaywrightFullResult): Promise<void> {
        if (!this.triggerVisualTesting) return;

        if (this.triggerOnAllPassed && this.totalTests !== this.passedTests) {
            console.log('Kouma: some tests failed, skipping visual testing trigger');
            return;
        }

        console.log('Start uploading screenshots to Kouma ...');
        const client = new KoumaClient({ host: this.options.host, apiKey: this.options.apiKey });
        const build = await client.newBuildStaged({
            pid: this.options.pid,
            buildVersion: this.options.buildVersion,
            screenshotsDirectory: KOUMA_SCREENSHOTS_FOLDER,
        });
        console.log('Kouma visual regression testing triggered.');
        if (build) {
            console.log(`Kouma build URL: ${this.options.host.replace(/\/+$/, '')}/build/${build.bid}`);
        }

        if (this.removeScreenshotsAfterUpload) {
            removeScreenshotsFolder();
        }
    }
}

export default KoumaPlaywrightReporter;
