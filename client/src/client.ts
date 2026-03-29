import * as fs from 'node:fs';
import * as path from 'node:path';
import { validateScreenshotFilename } from './validation.js';
import type {
    KoumaClientConfig,
    NewBuildOptions,
    CreateBuildOptions,
    InitializedBuild,
    SyncBuildResult,
    BuildStats,
    LatestBuildStats,
    UploadResult,
} from './types.js';

/**
 * Unified Kouma API client for visual regression testing.
 *
 * Provides methods to upload screenshots, trigger builds, and query build statistics
 * against an Kouma engine and dashboard instance.
 *
 * Can be used as a library import in Node.js / Bun projects, or via the `kouma` CLI.
 *
 * @example Creating a client and triggering a build
 * ```ts
 * import { KoumaClient } from "kouma";
 *
 * const client = new KoumaClient({
 *   host: "https://kouma.example.com",
 *   apiKey: "your-api-key",
 * });
 *
 * // Upload screenshots one-by-one, then initialize the build
 * const build = await client.newBuild({
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   buildVersion: "abc1234",
 *   screenshotsDirectory: "./screenshots",
 * });
 *
 * if (build) {
 *   console.log(`Build ${build.bid} created (index: ${build.buildIndex})`);
 * }
 * ```
 *
 * @example Querying build statistics
 * ```ts
 * const stats = await client.getBuildStats("64a1b2c3d4e5f6a7b8c9d0e2");
 * console.log(stats.status, stats.result); // "completed" "passed"
 *
 * const latest = await client.getLatestBuildStats("64a1b2c3d4e5f6a7b8c9d0e1");
 * console.log(`Latest build #${latest.index}: ${latest.result}`);
 * ```
 *
 * @example Using the synchronous build endpoint
 * ```ts
 * // Upload all screenshots + initialize + compare in a single request
 * const result = await client.newBuildSync({
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   buildVersion: "abc1234",
 *   screenshotsDirectory: "./screenshots",
 * });
 *
 * if (result) {
 *   console.log(`Build ${result.bid}: ${result.status} — ${result.result}`);
 * }
 * ```
 */
export class KoumaClient {
    private readonly host: string;
    private readonly apiKey: string;

    /**
     * Creates a new Kouma API client instance.
     *
     * @param config - Connection configuration with host URL and API key.
     *
     * @example
     * ```ts
     * const client = new KoumaClient({
     *   host: "https://kouma.example.com",
     *   apiKey: "your-api-key",
     * });
     * ```
     */
    constructor(config: KoumaClientConfig) {
        this.host = config.host.replace(/\/+$/, '');
        this.apiKey = config.apiKey;
    }

    /**
     * Collects valid screenshot image files from a directory.
     * Validates each filename using the Kouma engine's rules.
     * Supported formats: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp`, `.gif`.
     *
     * @param screenshotsDirectory - Path to the directory to scan.
     * @returns Array of absolute file paths for valid screenshots.
     *
     * @internal
     */
    private collectScreenshots(screenshotsDirectory: string): string[] {
        const files: string[] = [];
        for (const entry of fs.readdirSync(screenshotsDirectory)) {
            const filePath = path.join(screenshotsDirectory, entry);
            const stats = fs.lstatSync(filePath);
            if (!stats.isFile()) continue;

            const error = validateScreenshotFilename(path.basename(filePath));
            if (error) {
                console.log(`Skipping file: ${error}`);
                continue;
            }
            files.push(filePath);
        }
        return files;
    }

    /**
     * Uploads a single screenshot to the Kouma engine.
     *
     * @param pid - Project ID to upload the screenshot to.
     * @param filePath - Local path to the image file.
     * @returns Upload result containing the list of received image filenames.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @internal
     */
    private async uploadScreenshot(pid: string, filePath: string): Promise<UploadResult> {
        const url = `${this.host}/slave/images/project-tests/${pid}`;
        const form = new FormData();
        const fileContent = fs.readFileSync(filePath);
        form.append('image', new Blob([fileContent]), path.basename(filePath));

        const response = await fetch(url, { method: 'POST', body: form, headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upload failed for ${path.basename(filePath)}: ${text}`);
        }

        return (await response.json()) as UploadResult;
    }

    /**
     * Initializes a new build on the Kouma engine.
     * Call this after screenshots have been uploaded via {@link uploadScreenshot}.
     *
     * @param pid - Project ID.
     * @param buildVersion - Build version identifier.
     * @returns The initialized build information.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @internal
     */
    private async initializeBuild(pid: string, buildVersion: string, metadata?: Record<string, string>): Promise<InitializedBuild> {
        let url = `${this.host}/slave/build/initialize?pid=${encodeURIComponent(pid)}&buildVersion=${encodeURIComponent(buildVersion)}`;

        if (metadata) {
            for (const [key, value] of Object.entries(metadata)) {
                url += `&meta_${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        }

        const response = await fetch(url, { method: 'POST', headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Build initialization failed: ${text}`);
        }

        const data = (await response.json()) as InitializedBuild;
        return { pid: data.pid, bid: data.bid, buildIndex: data.buildIndex };
    }

    /**
     * Creates a new build by uploading screenshots one-by-one, then initializing the build.
     *
     * Screenshots are uploaded sequentially to avoid overwhelming the server
     * when there are many files (150+). After all uploads complete, the build
     * is initialized which triggers asynchronous comparison on the server.
     *
     * @deprecated Use {@link newBuildStaged} instead. This method uploads screenshots
     * to a shared directory which can cause race conditions in parallel builds.
     *
     * @param options - Build options including project ID, version, and screenshots directory.
     * @returns The initialized build information, or `undefined` if no valid screenshots were found.
     *
     * @example
     * ```ts
     * const build = await client.newBuild({
     *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
     *   buildVersion: "abc1234",
     *   screenshotsDirectory: "./screenshots",
     * });
     *
     * if (build) {
     *   console.log(`Build ${build.bid} created (index: ${build.buildIndex})`);
     * }
     * ```
     */
    async newBuild(options: NewBuildOptions): Promise<InitializedBuild | undefined> {
        const files = this.collectScreenshots(options.screenshotsDirectory);
        if (files.length === 0) {
            console.log('No valid screenshots found to upload.');
            return undefined;
        }

        for (const filePath of files) {
            const result = await this.uploadScreenshot(options.pid, filePath);
            if (result?.receivedImages?.[0]) {
                console.log(`Uploaded screenshot: ${result.receivedImages[0]}`);
            }
        }

        return this.initializeBuild(options.pid, options.buildVersion, options.metadata);
    }

    /**
     * Creates a new build by uploading all screenshots in a single multipart request.
     *
     * Uses the `/slave/build/sync` endpoint which combines upload, initialization,
     * and visual comparison into one synchronous operation. This is simpler but the
     * request may be large when many screenshots are involved.
     *
     * @deprecated Use {@link newBuildStaged} instead. This method uploads screenshots
     * to a shared directory which can cause race conditions in parallel builds.
     *
     * @param options - Build options including project ID, version, and screenshots directory.
     * @returns The build result with status and result, or `undefined` if no valid screenshots were found.
     *
     * @example
     * ```ts
     * const result = await client.newBuildSync({
     *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
     *   buildVersion: "abc1234",
     *   screenshotsDirectory: "./screenshots",
     * });
     *
     * if (result) {
     *   console.log(`Build: ${result.status} — ${result.result}`);
     * }
     * ```
     */
    async newBuildSync(options: NewBuildOptions): Promise<SyncBuildResult | undefined> {
        const files = this.collectScreenshots(options.screenshotsDirectory);
        if (files.length === 0) {
            console.log('No valid screenshots found to upload.');
            return undefined;
        }

        const url = `${this.host}/slave/build/sync`;
        const form = new FormData();
        form.append('pid', options.pid);
        form.append('buildVersion', options.buildVersion);

        if (options.metadata) {
            for (const [key, value] of Object.entries(options.metadata)) {
                form.append(`meta_${key}`, value);
            }
        }

        for (const filePath of files) {
            const fileContent = fs.readFileSync(filePath);
            form.append('image', new Blob([fileContent]), path.basename(filePath));
        }

        const response = await fetch(url, { method: 'POST', body: form, headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Sync build failed: ${text}`);
        }

        const data = (await response.json()) as SyncBuildResult;
        return { pid: data.pid, bid: data.bid, buildIndex: data.buildIndex, status: data.status, result: data.result };
    }

    /**
     * Retrieves build statistics for a specific build by its ID.
     *
     * @param bid - The build ID to query.
     * @returns Build status and result.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @example
     * ```ts
     * const stats = await client.getBuildStats("64a1b2c3d4e5f6a7b8c9d0e2");
     * console.log(stats.status); // "completed"
     * console.log(stats.result); // "passed"
     * ```
     */
    async getBuildStats(bid: string): Promise<BuildStats> {
        const url = `${this.host}/stats/build?bid=${encodeURIComponent(bid)}`;

        const response = await fetch(url, { headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to get build stats: ${text}`);
        }

        return (await response.json()) as BuildStats;
    }

    /**
     * Retrieves the latest build statistics for a project.
     *
     * @param pid - The project ID to query.
     * @returns Latest build information including index, ID, status, and result.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @example
     * ```ts
     * const latest = await client.getLatestBuildStats("64a1b2c3d4e5f6a7b8c9d0e1");
     * console.log(`Build #${latest.index} (${latest.bid}): ${latest.result}`);
     * ```
     */
    async getLatestBuildStats(pid: string): Promise<LatestBuildStats> {
        const url = `${this.host}/stats/build/latest?pid=${encodeURIComponent(pid)}`;

        const response = await fetch(url, { headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Failed to get latest build stats: ${text}`);
        }

        return (await response.json()) as LatestBuildStats;
    }

    /**
     * Creates a new build record on the server without triggering analysis.
     *
     * This is the first step in the staged build flow, which is safe for parallel builds.
     * After creating the build, upload screenshots via {@link uploadBuildScreenshot},
     * then trigger analysis via {@link finalizeBuild}.
     *
     * @param options - Build creation options (project ID, version, optional metadata).
     * @returns The created build information including the build ID.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @example
     * ```ts
     * const build = await client.createBuild({
     *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
     *   buildVersion: "abc1234",
     * });
     * console.log(`Build ${build.bid} created`);
     * ```
     */
    async createBuild(options: CreateBuildOptions): Promise<InitializedBuild> {
        let url = `${this.host}/slave/build/create?pid=${encodeURIComponent(options.pid)}&buildVersion=${encodeURIComponent(options.buildVersion)}`;

        if (options.metadata) {
            for (const [key, value] of Object.entries(options.metadata)) {
                url += `&meta_${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
            }
        }

        const response = await fetch(url, { method: 'POST', headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Build creation failed: ${text}`);
        }

        const data = (await response.json()) as InitializedBuild;
        return { pid: data.pid, bid: data.bid, buildIndex: data.buildIndex };
    }

    /**
     * Uploads a single screenshot to a specific build's staging area.
     *
     * Screenshots uploaded this way are isolated per build, making it safe
     * for parallel builds. Use after {@link createBuild} and before {@link finalizeBuild}.
     *
     * @param bid - Build ID to upload the screenshot to.
     * @param filePath - Local path to the image file.
     * @returns Upload result containing the list of received image filenames.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @example
     * ```ts
     * const result = await client.uploadBuildScreenshot(build.bid, "./screenshots/login.png");
     * console.log(`Uploaded: ${result.receivedImages[0]}`);
     * ```
     */
    async uploadBuildScreenshot(bid: string, filePath: string): Promise<UploadResult> {
        const url = `${this.host}/slave/images/build/${encodeURIComponent(bid)}`;
        const form = new FormData();
        const fileContent = fs.readFileSync(filePath);
        form.append('image', new Blob([fileContent]), path.basename(filePath));

        const response = await fetch(url, { method: 'POST', body: form, headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Upload failed for ${path.basename(filePath)}: ${text}`);
        }

        return (await response.json()) as UploadResult;
    }

    /**
     * Triggers analysis for a previously created build.
     *
     * All screenshots should be uploaded via {@link uploadBuildScreenshot} before
     * calling this method. The comparison runs asynchronously on the server.
     * Use {@link getBuildStats} to poll for completion.
     *
     * @param bid - Build ID to finalize.
     * @returns The build information.
     * @throws {Error} If the server responds with a non-OK status.
     *
     * @example
     * ```ts
     * const result = await client.finalizeBuild(build.bid);
     * console.log(`Analysis started for build ${result.bid}`);
     * ```
     */
    async finalizeBuild(bid: string): Promise<InitializedBuild> {
        const url = `${this.host}/slave/build/finalize?bid=${encodeURIComponent(bid)}`;

        const response = await fetch(url, { method: 'POST', headers: { 'x-api-key': this.apiKey } });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Build finalize failed: ${text}`);
        }

        const data = (await response.json()) as InitializedBuild;
        return { pid: data.pid, bid: data.bid, buildIndex: data.buildIndex };
    }

    /**
     * Creates a new build using the staged flow: create → upload → finalize.
     *
     * This is the recommended replacement for {@link newBuild}. Screenshots are
     * uploaded to a build-specific staging area, making it safe for parallel builds.
     * After all uploads complete, analysis is triggered asynchronously.
     *
     * @param options - Build options including project ID, version, and screenshots directory.
     * @returns The build information, or `undefined` if no valid screenshots were found.
     *
     * @example
     * ```ts
     * const build = await client.newBuildStaged({
     *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
     *   buildVersion: "abc1234",
     *   screenshotsDirectory: "./screenshots",
     * });
     *
     * if (build) {
     *   console.log(`Build ${build.bid} created (index: ${build.buildIndex})`);
     * }
     * ```
     */
    async newBuildStaged(options: NewBuildOptions): Promise<InitializedBuild | undefined> {
        const files = this.collectScreenshots(options.screenshotsDirectory);
        if (files.length === 0) {
            console.log('No valid screenshots found to upload.');
            return undefined;
        }

        const build = await this.createBuild({ pid: options.pid, buildVersion: options.buildVersion, metadata: options.metadata });

        for (const filePath of files) {
            const result = await this.uploadBuildScreenshot(build.bid, filePath);
            if (result?.receivedImages?.[0]) {
                console.log(`Uploaded screenshot: ${result.receivedImages[0]}`);
            }
        }

        return this.finalizeBuild(build.bid);
    }
}
