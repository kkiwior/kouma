# kouma

TypeScript client and CLI for [Kouma](https://github.com/nicholasgasior/Micoo) visual regression testing.

Upload screenshots, trigger builds, and query build results — as a library or from the command line.

## Install

```bash
npm install kouma-client
```

## Library Usage

```ts
import { KoumaClient } from "kouma";

const client = new KoumaClient({
  host: "https://kouma.example.com",
  apiKey: "your-api-key",
});
```

### Upload screenshots and create a build (async)

Screenshots are uploaded one-by-one, then the build is initialized and comparison runs asynchronously on the server.

```ts
const build = await client.newBuild({
  pid: "project-id",
  buildVersion: "abc1234",
  screenshotsDirectory: "./screenshots",
  metadata: { branch: "main", env: "ci" },
});

if (build) {
  console.log(`Build ${build.bid} created (index: ${build.buildIndex})`);
}
```

### Upload and build in a single request (sync)

All screenshots are sent in one multipart request. The server uploads, initializes, and compares synchronously.

```ts
const result = await client.newBuildSync({
  pid: "project-id",
  buildVersion: "abc1234",
  screenshotsDirectory: "./screenshots",
});

if (result) {
  console.log(`${result.status} — ${result.result}`); // "completed — passed"
}
```

### Query build statistics

```ts
// By build ID
const stats = await client.getBuildStats("build-id");
console.log(stats.status, stats.result);

// Latest build for a project
const latest = await client.getLatestBuildStats("project-id");
console.log(`Build #${latest.index}: ${latest.result}`);
```

## CLI Usage

The `kouma` binary is available after installation.

```bash
# Upload screenshots and trigger a build (async)
kouma new-build \
  --host https://kouma.example.com \
  --api-key abc123 \
  --pid project-id \
  --build-version v1.0 \
  --screenshots-dir ./screenshots \
  --meta branch=main --meta env=ci

# Upload and build in a single request (sync)
kouma new-build-sync \
  --host https://kouma.example.com \
  --api-key abc123 \
  --pid project-id \
  --build-version v1.0 \
  --screenshots-dir ./screenshots

# Get build statistics
kouma build-stats --host https://kouma.example.com --api-key abc123 --bid build-id

# Get latest build statistics for a project
kouma latest-build-stats --host https://kouma.example.com --api-key abc123 --pid project-id
```

### Environment Variables

| Variable | Description |
| --- | --- |
| `KOUMA_HOST` | Default for `--host` |
| `KOUMA_API_KEY` | Default for `--api-key` |
| `KOUMA_PID` | Default for `--pid` |

## Cypress Plugin

```ts
// cypress.config.ts
import { createCypressPlugin } from "kouma/cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on) {
      createCypressPlugin(on, {
        host: "https://kouma.example.com",
        apiKey: "your-api-key",
        pid: "project-id",
        buildVersion: process.env.GIT_SHA ?? "local",
      });
    },
  },
});
```

### Plugin Options

| Option | Default | Description |
| --- | --- | --- |
| `triggerVisualTesting` | `true` | Trigger visual testing after the run |
| `triggerOnAllPassed` | `true` | Only trigger if all tests passed |
| `removeScreenshotsAfterUpload` | `true` | Clean up screenshots after upload |

## Supported Image Formats

The client accepts screenshots in any format supported by the Kouma engine:

`.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp`, `.gif`

## Filename Validation

Screenshot filenames are validated client-side before upload:

- Must have a supported image extension
- Maximum 255 characters (including extension)
- Cannot contain: `< > : " / \ | ? *` or null bytes

## License

MIT
