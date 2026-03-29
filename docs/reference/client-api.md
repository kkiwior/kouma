# Client API Reference

Complete API reference for the `KoumaClient` class.

## KoumaClient

### Constructor

```typescript
import { KoumaClient } from "kouma";

const client = new KoumaClient(config: KoumaClientConfig);
```

#### KoumaClientConfig

| Property | Type     | Description                                            |
| -------- | -------- | ------------------------------------------------------ |
| `host`   | `string` | Kouma server URL (e.g., `"https://kouma.example.com"`) |
| `apiKey` | `string` | Project API key, sent as `x-api-key` header            |

---

### newBuildStaged(options)

Create a build, upload screenshots to a build-specific staging area, and finalize. This is the **recommended method** — safe for parallel
builds.

```typescript
const result = await client.newBuildStaged(options: NewBuildOptions): Promise<InitializedBuild | undefined>;
```

Internally executes: `createBuild` → `uploadBuildScreenshot` (per file) → `finalizeBuild`.

---

### createBuild(options)

Create a new build record without triggering analysis. First step of the staged build flow.

```typescript
const result = await client.createBuild(options: CreateBuildOptions): Promise<InitializedBuild>;
```

#### CreateBuildOptions

| Property       | Type                     | Required | Description                                  |
| -------------- | ------------------------ | -------- | -------------------------------------------- |
| `pid`          | `string`                 | Yes      | Project ID                                   |
| `buildVersion` | `string`                 | Yes      | Build version identifier (e.g., git SHA)     |
| `metadata`     | `Record<string, string>` | No       | Custom metadata (keys prefixed with `meta_`) |

---

### uploadBuildScreenshot(bid, filePath)

Upload a single screenshot to a build-specific staging area.

```typescript
const result = await client.uploadBuildScreenshot(bid: string, filePath: string): Promise<UploadResult>;
```

#### UploadResult

| Property         | Type       | Description                             |
| ---------------- | ---------- | --------------------------------------- |
| `receivedImages` | `string[]` | Filenames of images the server received |

---

### finalizeBuild(bid)

Trigger analysis for a previously created build. Call after all screenshots have been uploaded.

```typescript
const result = await client.finalizeBuild(bid: string): Promise<InitializedBuild>;
```

---

### newBuild(options) <Badge type="warning" text="deprecated" />

Upload screenshots sequentially and initialize a build.

```typescript
const result = await client.newBuild(options: NewBuildOptions): Promise<InitializedBuild | undefined>;
```

---

### newBuildSync(options) <Badge type="warning" text="deprecated" />

Upload all screenshots and trigger comparison in a single request.

```typescript
const result = await client.newBuildSync(options: NewBuildOptions): Promise<SyncBuildResult | undefined>;
```

---

### getBuildStats(bid)

Get statistics for a specific build.

```typescript
const stats = await client.getBuildStats(bid: string): Promise<BuildStats>;
```

---

### getLatestBuildStats(pid)

Get the latest build statistics for a project.

```typescript
const stats = await client.getLatestBuildStats(pid: string): Promise<LatestBuildStats>;
```

---

## Types

### NewBuildOptions

| Property               | Type                     | Required | Description                                    |
| ---------------------- | ------------------------ | -------- | ---------------------------------------------- |
| `pid`                  | `string`                 | Yes      | Project ID                                     |
| `buildVersion`         | `string`                 | Yes      | Build version identifier (e.g., git SHA)       |
| `screenshotsDirectory` | `string`                 | Yes      | Path to directory containing screenshot images |
| `metadata`             | `Record<string, string>` | No       | Custom metadata (keys prefixed with `meta_`)   |

### InitializedBuild

| Property     | Type     | Description             |
| ------------ | -------- | ----------------------- |
| `pid`        | `string` | Project ID              |
| `bid`        | `string` | Created build ID        |
| `buildIndex` | `number` | Sequential build number |

### SyncBuildResult

| Property     | Type     | Description                                 |
| ------------ | -------- | ------------------------------------------- |
| `pid`        | `string` | Project ID                                  |
| `bid`        | `string` | Build ID                                    |
| `buildIndex` | `number` | Sequential build number                     |
| `status`     | `string` | Build status (e.g., `"completed"`)          |
| `result`     | `string` | Build result (e.g., `"passed"`, `"failed"`) |

### BuildStats

| Property | Type     | Description  |
| -------- | -------- | ------------ |
| `status` | `string` | Build status |
| `result` | `string` | Build result |

### LatestBuildStats

| Property | Type     | Description  |
| -------- | -------- | ------------ |
| `index`  | `number` | Build index  |
| `bid`    | `string` | Build ID     |
| `status` | `string` | Build status |
| `result` | `string` | Build result |

---

## Cypress Plugin

### createCypressPlugin

```typescript
import { createCypressPlugin } from "kouma/cypress";

createCypressPlugin(
    on: Cypress.PluginEvents,
    clientOptions: KoumaClientConfig & { pid: string; buildVersion: string },
    pluginOptions?: CypressPluginOptions
);
```

#### CypressPluginOptions

| Property                       | Type      | Default | Description                           |
| ------------------------------ | --------- | ------- | ------------------------------------- |
| `triggerVisualTesting`         | `boolean` | `true`  | Enable visual testing upload          |
| `triggerOnAllPassed`           | `boolean` | `true`  | Only upload when all tests pass       |
| `removeScreenshotsAfterUpload` | `boolean` | `true`  | Remove local screenshots after upload |

See the [Cypress Integration](/guide/cypress) guide for usage.

---

## Playwright Reporter

### KoumaPlaywrightReporter

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({ reporter: [['kouma/playwright', reporterOptions]] });
```

#### PlaywrightReporterOptions

| Property                       | Type      | Required | Default | Description                           |
| ------------------------------ | --------- | -------- | ------- | ------------------------------------- |
| `host`                         | `string`  | Yes      | —       | Kouma server URL                      |
| `apiKey`                       | `string`  | Yes      | —       | Project API key                       |
| `pid`                          | `string`  | Yes      | —       | Project ID                            |
| `buildVersion`                 | `string`  | Yes      | —       | Build version identifier              |
| `triggerVisualTesting`         | `boolean` | No       | `true`  | Enable visual testing upload          |
| `triggerOnAllPassed`           | `boolean` | No       | `true`  | Only upload when all tests pass       |
| `removeScreenshotsAfterUpload` | `boolean` | No       | `true`  | Remove local screenshots after upload |

See the [Playwright Integration](/guide/playwright) guide for usage.

---

## Exports

All types are exported from the main package:

```typescript
import type {
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
} from 'kouma';
```
