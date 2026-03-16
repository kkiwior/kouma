# Playwright Integration

Kouma provides a built-in Playwright Test reporter that automatically collects screenshot attachments from test results and uploads them for visual comparison.

## Installation

```bash
npm install kouma-client
```

## Setup

### Configure the reporter

In your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
    reporter: [
        [
            'kouma-client/playwright',
            {
                host: process.env.KOUMA_HOST ?? 'http://localhost:3001',
                apiKey: process.env.KOUMA_API_KEY ?? 'your-api-key',
                pid: process.env.KOUMA_PID ?? 'your-project-id',
                buildVersion: process.env.GIT_SHA ?? 'local',
            },
        ],
    ],
});
```

You can use the reporter alongside other reporters:

```typescript
export default defineConfig({
    reporter: [
        ['html'],
        [
            'kouma-client/playwright',
            {
                host: process.env.KOUMA_HOST ?? 'http://localhost:3001',
                apiKey: process.env.KOUMA_API_KEY ?? 'your-api-key',
                pid: process.env.KOUMA_PID ?? 'your-project-id',
                buildVersion: process.env.GIT_SHA ?? 'local',
            },
        ],
    ],
});
```

### Take screenshots in your tests

Attach screenshots to test results using `testInfo.attach()`:

```typescript
import { test, expect } from '@playwright/test';

test('homepage visual test', async ({ page }, testInfo) => {
    await page.goto('/');
    const screenshot = await page.screenshot();
    await testInfo.attach('homepage', { body: screenshot, contentType: 'image/png' });
});

test('login form visual test', async ({ page }, testInfo) => {
    await page.goto('/login');
    const screenshot = await page.screenshot();
    await testInfo.attach('login-form', { body: screenshot, contentType: 'image/png' });
});
```

You can also save screenshots to disk and attach the file path:

```typescript
test('dashboard visual test', async ({ page }, testInfo) => {
    await page.goto('/dashboard');
    const screenshotPath = testInfo.outputPath('dashboard.png');
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('dashboard', { path: screenshotPath, contentType: 'image/png' });
});
```

The reporter automatically collects screenshot attachments (with `image/*` content types) from each test result and uploads them to Kouma when the suite finishes.

## Options

### Reporter options (required)

| Option         | Description                      |
| -------------- | -------------------------------- |
| `host`         | Kouma server URL                 |
| `apiKey`       | Project API key                  |
| `pid`          | Project ID                       |
| `buildVersion` | Build identifier (e.g., git SHA) |

### Reporter options (optional)

```typescript
[
    'kouma/playwright',
    {
        host: '...',
        apiKey: '...',
        pid: '...',
        buildVersion: '...',
        triggerVisualTesting: true,
        triggerOnAllPassed: true,
        removeScreenshotsAfterUpload: true,
    },
];
```

| Option                          | Default | Description                                       |
| ------------------------------- | ------- | ------------------------------------------------- |
| `triggerVisualTesting`          | `true`  | Enable/disable the visual testing upload          |
| `triggerOnAllPassed`            | `true`  | Only upload when all Playwright tests pass        |
| `removeScreenshotsAfterUpload` | `true`  | Delete local screenshots after successful upload  |

## Environment Variables

The reporter respects the same environment variables as the CLI:

| Variable        | Description      |
| --------------- | ---------------- |
| `KOUMA_HOST`    | Kouma server URL |
| `KOUMA_API_KEY` | Project API key  |
| `KOUMA_PID`     | Project ID       |

## How It Works

1. **During tests** — After each test ends, the reporter scans the test result's attachments for image files (`image/png`, `image/jpeg`, `image/bmp`, `image/webp`, `image/gif`)
2. **Collecting** — Path-based attachments are copied, buffer-based attachments are written to a temporary `kouma-pw-screenshots` folder
3. **After all tests** — The `onEnd` hook fires; the reporter uploads all collected screenshots to Kouma via `newBuildStaged`
4. **Cleanup** — If enabled, the temporary screenshots folder is removed after upload

## CI/CD Example

### GitHub Actions

```yaml
steps:
    - name: Run Playwright tests with Kouma
      env:
          KOUMA_HOST: https://kouma.example.com
          KOUMA_API_KEY: ${{ secrets.KOUMA_API_KEY }}
          KOUMA_PID: ${{ secrets.KOUMA_PID }}
          GIT_SHA: ${{ github.sha }}
      run: npx playwright test
```

### GitLab CI

```yaml
visual-test:
    script:
        - npx playwright install --with-deps
        - KOUMA_HOST=$KOUMA_HOST KOUMA_API_KEY=$KOUMA_API_KEY KOUMA_PID=$KOUMA_PID GIT_SHA=$CI_COMMIT_SHA npx playwright test
```
