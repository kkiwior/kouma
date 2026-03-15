/**
 * Configuration for the Kouma API client.
 *
 * @example
 * ```ts
 * const config: KoumaClientConfig = {
 *   host: "https://kouma.example.com",
 *   apiKey: "your-api-key-here",
 * };
 * ```
 */
export interface KoumaClientConfig {
    /**
     * Base URL of the Kouma service.
     *
     * @example "https://kouma.example.com"
     * @example "http://localhost:3000"
     */
    host: string;

    /**
     * API key for authenticating requests.
     * Sent as the `x-api-key` header on every request.
     */
    apiKey: string;
}

/**
 * Options for creating a new build.
 *
 * @example
 * ```ts
 * const options: NewBuildOptions = {
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   buildVersion: "abc1234",
 *   screenshotsDirectory: "./screenshots",
 * };
 * ```
 */
export interface NewBuildOptions {
    /**
     * Project ID — identifies which Kouma project this build belongs to.
     *
     * @example "64a1b2c3d4e5f6a7b8c9d0e1"
     */
    pid: string;

    /**
     * Build version identifier, typically a git commit SHA or a release tag.
     *
     * @example "abc1234"
     * @example "v2.1.0"
     */
    buildVersion: string;

    /**
     * Absolute or relative path to the directory containing screenshot image files.
     * Supported formats: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp`, `.gif`.
     *
     * @example "./screenshots"
     * @example "/home/ci/artifacts/screenshots"
     */
    screenshotsDirectory: string;

    /**
     * Optional metadata for the build.
     * Keys will be automatically prefixed with `meta_` when sent to the server.
     *
     * @example { branch: "main", commit: "abc1234" }
     */
    metadata?: Record<string, string>;
}

/**
 * Result returned after initializing a new build.
 *
 * @example
 * ```ts
 * const build: InitializedBuild = {
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   bid: "64a1b2c3d4e5f6a7b8c9d0e2",
 *   buildIndex: 42,
 * };
 * ```
 */
export interface InitializedBuild {
    /** Project ID. */
    pid: string;
    /** Build ID — unique identifier for the newly created build. */
    bid: string;
    /** Sequential build index number within the project. */
    buildIndex: number;
}

/**
 * Result of a synchronous build that combines upload, initialization,
 * and comparison into a single request.
 *
 * @example
 * ```ts
 * const result: SyncBuildResult = {
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   bid: "64a1b2c3d4e5f6a7b8c9d0e2",
 *   buildIndex: 42,
 *   status: "completed",
 *   result: "passed",
 * };
 * ```
 */
export interface SyncBuildResult {
    /** Project ID. */
    pid: string;
    /** Build ID. */
    bid: string;
    /** Sequential build index number. */
    buildIndex: number;
    /** Build status (e.g. `"completed"`, `"processing"`). */
    status: string;
    /** Build result (e.g. `"passed"`, `"failed"`). */
    result: string;
}

/**
 * Build statistics for a specific build, retrieved via build ID.
 *
 * @example
 * ```ts
 * const stats: BuildStats = { status: "completed", result: "passed" };
 * ```
 */
export interface BuildStats {
    /** Build status (e.g. `"completed"`, `"processing"`). */
    status: string;
    /** Build result (e.g. `"passed"`, `"failed"`). */
    result: string;
}

/**
 * Latest build statistics for a project, retrieved via project ID.
 *
 * @example
 * ```ts
 * const latest: LatestBuildStats = {
 *   index: 42,
 *   bid: "64a1b2c3d4e5f6a7b8c9d0e2",
 *   status: "completed",
 *   result: "passed",
 * };
 * ```
 */
export interface LatestBuildStats {
    /** Sequential build index number. */
    index: number;
    /** Build ID. */
    bid: string;
    /** Build status. */
    status: string;
    /** Build result. */
    result: string;
}

/**
 * Options for the Cypress plugin integration.
 *
 * All options default to `true` when not specified.
 *
 * @example
 * ```ts
 * const options: CypressPluginOptions = {
 *   triggerVisualTesting: true,
 *   triggerOnAllPassed: true,
 *   removeScreenshotsAfterUpload: false, // keep screenshots for debugging
 * };
 * ```
 */
export interface CypressPluginOptions {
    /**
     * Whether to trigger visual testing after the test run completes.
     * @defaultValue `true`
     */
    triggerVisualTesting?: boolean;

    /**
     * Only trigger visual testing if every test in the suite passed.
     * @defaultValue `true`
     */
    triggerOnAllPassed?: boolean;

    /**
     * Remove the temporary screenshots folder after uploading.
     * @defaultValue `true`
     */
    removeScreenshotsAfterUpload?: boolean;
}

/**
 * Options for the Playwright reporter integration.
 *
 * All boolean options default to `true` when not specified.
 *
 * @example
 * ```ts
 * // playwright.config.ts
 * import { defineConfig } from "@playwright/test";
 *
 * export default defineConfig({
 *   reporter: [
 *     ["kouma/playwright", {
 *       host: "https://kouma.example.com",
 *       apiKey: "your-api-key",
 *       pid: "your-project-id",
 *       buildVersion: process.env.GIT_SHA ?? "local",
 *     }],
 *   ],
 * });
 * ```
 */
export interface PlaywrightReporterOptions {
    /**
     * Base URL of the Kouma service.
     *
     * @example "https://kouma.example.com"
     */
    host: string;

    /**
     * API key for authenticating requests.
     */
    apiKey: string;

    /**
     * Project ID — identifies which Kouma project this build belongs to.
     */
    pid: string;

    /**
     * Build version identifier, typically a git commit SHA or a release tag.
     *
     * @example "abc1234"
     */
    buildVersion: string;

    /**
     * Whether to trigger visual testing after the test run completes.
     * @defaultValue `true`
     */
    triggerVisualTesting?: boolean;

    /**
     * Only trigger visual testing if every test in the suite passed.
     * @defaultValue `true`
     */
    triggerOnAllPassed?: boolean;

    /**
     * Remove the temporary screenshots folder after uploading.
     * @defaultValue `true`
     */
    removeScreenshotsAfterUpload?: boolean;
}

/**
 * Server response after uploading a screenshot image.
 *
 * @example
 * ```ts
 * const upload: UploadResult = { receivedImages: ["login.png"] };
 * ```
 */
export interface UploadResult {
    /** Filenames of images the server received. */
    receivedImages: string[];
}

/**
 * Options for creating a new build (without screenshots directory).
 * Used with the staged build flow: {@link KoumaClient.createBuild}.
 *
 * @example
 * ```ts
 * const options: CreateBuildOptions = {
 *   pid: "64a1b2c3d4e5f6a7b8c9d0e1",
 *   buildVersion: "abc1234",
 *   metadata: { branch: "main" },
 * };
 * ```
 */
export interface CreateBuildOptions {
    /**
     * Project ID — identifies which Kouma project this build belongs to.
     *
     * @example "64a1b2c3d4e5f6a7b8c9d0e1"
     */
    pid: string;

    /**
     * Build version identifier, typically a git commit SHA or a release tag.
     *
     * @example "abc1234"
     * @example "v2.1.0"
     */
    buildVersion: string;

    /**
     * Optional metadata for the build.
     * Keys will be automatically prefixed with `meta_` when sent to the server.
     *
     * @example { branch: "main", commit: "abc1234" }
     */
    metadata?: Record<string, string>;
}
