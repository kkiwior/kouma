# Cypress Integration

Kouma provides a built-in Cypress plugin that automatically collects screenshots after test runs and uploads them for visual comparison.

## Installation

```bash
npm install kouma-client
```

## Setup

### Configure the plugin

In your `cypress.config.ts`:

```typescript
import { defineConfig } from 'cypress';
import { createCypressPlugin } from 'kouma-client/cypress';

export default defineConfig({
    e2e: {
        setupNodeEvents(on) {
            createCypressPlugin(on, {
                host: process.env.KOUMA_HOST ?? 'http://localhost:3001',
                apiKey: process.env.KOUMA_API_KEY ?? 'your-api-key',
                pid: process.env.KOUMA_PID ?? 'your-project-id',
                buildVersion: process.env.GIT_SHA ?? 'local',
            });
        },
    },
});
```

### Take screenshots in your tests

```typescript
describe('Homepage', () => {
    it('should look correct', () => {
        cy.visit('/');
        cy.screenshot('homepage');
    });

    it('should show the login form', () => {
        cy.visit('/login');
        cy.screenshot('login-form');
    });
});
```

The plugin automatically hooks into Cypress `after:screenshot` and `after:run` events to collect and upload screenshots.

## Options

### Client options (required)

| Option         | Description                      |
| -------------- | -------------------------------- |
| `host`         | Kouma server URL                 |
| `apiKey`       | Project API key                  |
| `pid`          | Project ID                       |
| `buildVersion` | Build identifier (e.g., git SHA) |

### Plugin options (optional)

```typescript
createCypressPlugin(on, clientOptions, { triggerVisualTesting: true, triggerOnAllPassed: true, removeScreenshotsAfterUpload: true });
```

| Option                         | Default | Description                                      |
| ------------------------------ | ------- | ------------------------------------------------ |
| `triggerVisualTesting`         | `true`  | Enable/disable the visual testing upload         |
| `triggerOnAllPassed`           | `true`  | Only upload when all Cypress tests pass          |
| `removeScreenshotsAfterUpload` | `true`  | Delete local screenshots after successful upload |

## Environment Variables

The plugin respects the same environment variables as the CLI:

| Variable        | Description      |
| --------------- | ---------------- |
| `KOUMA_HOST`    | Kouma server URL |
| `KOUMA_API_KEY` | Project API key  |
| `KOUMA_PID`     | Project ID       |

## How It Works

1. **During tests** — Cypress triggers `after:screenshot` events; the plugin records each screenshot path
2. **After all tests** — The `after:run` event fires; the plugin collects all recorded screenshots
3. **Upload** — Screenshots are uploaded to Kouma using `newBuildSync`
4. **Cleanup** — If enabled, local screenshot files are removed after upload

## CI/CD Example

```yaml
# GitHub Actions
- name: Run Cypress with Kouma
  env:
      KOUMA_HOST: https://kouma.example.com
      KOUMA_API_KEY: ${{ secrets.KOUMA_API_KEY }}
      KOUMA_PID: ${{ secrets.KOUMA_PID }}
      GIT_SHA: ${{ github.sha }}
  run: npx cypress run
```
