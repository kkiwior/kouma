/**
 * Kouma — unified visual regression testing client.
 *
 * @example Library usage
 * ```ts
 * import { KoumaClient } from "kouma";
 *
 * const client = new KoumaClient({
 *   host: "https://kouma.example.com",
 *   apiKey: "your-api-key",
 * });
 *
 * const build = await client.newBuild({
 *   pid: "project-id",
 *   buildVersion: "abc1234",
 *   screenshotsDirectory: "./screenshots",
 * });
 * ```
 *
 * @example Cypress plugin
 * ```ts
 * import { createCypressPlugin } from "kouma/cypress";
 * ```
 *
 * @example Playwright reporter
 * ```ts
 * // playwright.config.ts
 * reporter: [["kouma/playwright", { host, apiKey, pid, buildVersion }]];
 * ```
 *
 * @packageDocumentation
 */

export { KoumaClient } from './client.js';
export { validateScreenshotFilename } from './validation.js';
export type {
    KoumaClientConfig,
    NewBuildOptions,
    CreateBuildOptions,
    InitializedBuild,
    SyncBuildResult,
    BuildStats,
    LatestBuildStats,
    CypressPluginOptions,
    PlaywrightReporterOptions,
    UploadResult,
} from './types.js';
