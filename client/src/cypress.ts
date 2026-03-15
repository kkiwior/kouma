import * as fs from 'node:fs';
import * as path from 'node:path';
import { KoumaClient } from './client.js';
import type { KoumaClientConfig, NewBuildOptions, CypressPluginOptions } from './types.js';

/** @internal Shape of the Cypress `after:screenshot` details object. */
interface CypressScreenshotDetails {
    path: string;
}

/** @internal Shape of the Cypress `after:run` results object. */
interface CypressRunResults {
    totalTests: number;
    totalPassed: number;
}

const KOUMA_SCREENSHOTS_FOLDER = './kouma-screenshots';

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

/** @internal */
function collectScreenshot(details: CypressScreenshotDetails): void {
    const dest = path.join(KOUMA_SCREENSHOTS_FOLDER, path.basename(details.path));
    fs.copyFileSync(details.path, dest);
}

/**
 * Creates a Cypress plugin that integrates Kouma visual regression testing.
 *
 * Hooks into Cypress `after:screenshot` and `after:run` events to automatically
 * collect screenshots during the test run and upload them to Kouma when tests complete.
 *
 * @param on - The Cypress `on` function from `setupNodeEvents`.
 * @param koumaConfig - Client configuration plus project ID and build version.
 * @param options - Optional plugin behavior configuration.
 *
 * @example Basic usage in `cypress.config.ts`
 * ```ts
 * import { defineConfig } from "cypress";
 * import { createCypressPlugin } from "kouma/cypress";
 *
 * export default defineConfig({
 *   e2e: {
 *     setupNodeEvents(on) {
 *       createCypressPlugin(on, {
 *         host: "https://kouma.example.com",
 *         apiKey: "your-api-key",
 *         pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *         buildVersion: process.env.GIT_SHA ?? "local",
 *       });
 *     },
 *   },
 * });
 * ```
 *
 * @example With custom options
 * ```ts
 * createCypressPlugin(
 *   on,
 *   { host, apiKey, pid, buildVersion },
 *   {
 *     triggerVisualTesting: true,
 *     triggerOnAllPassed: false,            // trigger even if some tests fail
 *     removeScreenshotsAfterUpload: false,  // keep screenshots for debugging
 *   },
 * );
 * ```
 */
export function createCypressPlugin(
    on: (event: string, callback: (...args: unknown[]) => unknown) => void,
    koumaConfig: KoumaClientConfig & Pick<NewBuildOptions, 'pid' | 'buildVersion'>,
    options: CypressPluginOptions = {},
): void {
    const { triggerVisualTesting = true, triggerOnAllPassed = true, removeScreenshotsAfterUpload = true } = options;

    prepareScreenshotsFolder();

    on('after:screenshot', (details: unknown) => {
        collectScreenshot(details as CypressScreenshotDetails);
    });

    on('after:run', async (results: unknown) => {
        if (!triggerVisualTesting) return;

        const testResults = results as CypressRunResults;

        if (triggerOnAllPassed && testResults.totalTests !== testResults.totalPassed) {
            console.log('Kouma: some tests failed, skipping visual testing trigger');
            return;
        }

        console.log('Start uploading screenshots to Kouma ...');
        const client = new KoumaClient({ host: koumaConfig.host, apiKey: koumaConfig.apiKey });
        const build = await client.newBuild({
            pid: koumaConfig.pid,
            buildVersion: koumaConfig.buildVersion,
            screenshotsDirectory: KOUMA_SCREENSHOTS_FOLDER,
        });
        console.log('Kouma visual regression testing triggered.');
        if (build) {
            console.log(`Kouma build URL: ${koumaConfig.host.replace(/\/+$/, '')}/build/${build.bid}`);
        }

        if (removeScreenshotsAfterUpload) {
            removeScreenshotsFolder();
        }
    });
}
