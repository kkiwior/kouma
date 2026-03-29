# Client Library

The `kouma-client` npm package provides a TypeScript/JavaScript client for interacting with the Kouma API. It includes a programmatic API, a
CLI, a Cypress plugin, and a Playwright reporter — all with zero runtime dependencies.

## Installation

```bash
npm install kouma-client
```

## Quick Start

```typescript
import { KoumaClient } from 'kouma-client';

const client = new KoumaClient({ host: 'https://kouma.example.com', apiKey: 'your-api-key' });

// Upload screenshots and trigger comparison (recommended — parallel-safe)
const build = await client.newBuildStaged({ pid: 'your-project-id', buildVersion: 'abc1234', screenshotsDirectory: './screenshots' });

console.log(`Build ${build.bid} — index: ${build.buildIndex}`);
```

## KoumaClient

### Constructor

```typescript
const client = new KoumaClient({
    host: string;    // Kouma server URL (e.g., "https://kouma.example.com")
    apiKey: string;  // Project API key (sent as x-api-key header)
});
```

### `newBuildStaged(options)` (recommended)

Create a build, upload screenshots to a build-specific staging area, and finalize — safe for parallel builds.

```typescript
const build = await client.newBuildStaged({
    pid: 'project-id',
    buildVersion: 'v1.0.0',
    screenshotsDirectory: './screenshots',
    metadata: { branch: 'main', commit: 'abc1234' }, // optional
});
// Returns: { pid, bid, buildIndex }
```

This is a **three-step process**: create build → upload screenshots → finalize. Each build gets its own staging directory on the server, so
multiple builds can run in parallel without conflicts.

### `newBuild(options)` (deprecated)

Upload screenshots one-by-one, then initialize the build and trigger comparison.

```typescript
const build = await client.newBuild({ pid: 'project-id', buildVersion: 'v1.0.0', screenshotsDirectory: './screenshots' });
// Returns: { pid, bid, buildIndex }
```

::: warning This method uploads to a shared directory and may cause race conditions in parallel builds. Use `newBuildStaged` instead. :::

### `newBuildSync(options)` (deprecated)

Upload all screenshots and trigger comparison in a single request.

```typescript
const build = await client.newBuildSync({ pid: 'project-id', buildVersion: 'v1.0.0', screenshotsDirectory: './screenshots' });
// Returns: { pid, bid, buildIndex, status, result }
```

::: warning This method uploads to a shared directory and may cause race conditions in parallel builds. Use `newBuildStaged` instead. :::

### Staged Build Flow (low-level)

For full control, use the staged build methods individually:

```typescript
// Step 1: Create a build record
const build = await client.createBuild({ pid: 'project-id', buildVersion: 'v1.0.0', metadata: { branch: 'main' } });

// Step 2: Upload screenshots one-by-one
await client.uploadBuildScreenshot(build.bid, './screenshots/login.png');
await client.uploadBuildScreenshot(build.bid, './screenshots/dashboard.png');

// Step 3: Trigger analysis
const result = await client.finalizeBuild(build.bid);
```

### `getBuildStats(bid)`

Get statistics for a specific build.

```typescript
const stats = await client.getBuildStats('build-id');
// Returns: { status, result }
```

### `getLatestBuildStats(pid)`

Get the latest build statistics for a project.

```typescript
const latest = await client.getLatestBuildStats('project-id');
// Returns: { index, bid, status, result }
```

## Metadata

All build methods support an optional `metadata` field. Keys are automatically prefixed with `meta_` when sent to the server.

```typescript
await client.newBuildStaged({
    pid: 'project-id',
    buildVersion: 'v1.0.0',
    screenshotsDirectory: './screenshots',
    metadata: { branch: 'feature/login', commit: 'abc1234', pr: '42' },
});
```

## Framework Integrations

### Cypress Plugin

```typescript
import { createCypressPlugin } from 'kouma-client/cypress';
```

See the [Cypress Integration](/guide/cypress) guide for details.

### Playwright Reporter

```typescript
// playwright.config.ts
reporter: [['kouma-client/playwright', { host, apiKey, pid, buildVersion }]];
```

See the [Playwright Integration](/guide/playwright) guide for details.

## Screenshot Requirements

- **Format**: Supported formats: PNG, JPG, JPEG, BMP, WEBP, GIF
- **Max filename length**: 255 characters
- **Forbidden characters in filenames**: `<>:"/\|?*`
- **Directory**: The `screenshotsDirectory` is scanned for supported image files
- The filename (without extension) becomes the test case name in Kouma

## Node.js Compatibility

The client uses native `fetch` and `FormData` APIs, requiring **Node.js 18+**. It works with Bun, Deno, and any modern runtime out of the
box.
