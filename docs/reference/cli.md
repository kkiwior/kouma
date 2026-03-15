# CLI Reference

The `kouma` CLI provides commands for uploading screenshots and querying build results from the command line.

## Installation

```bash
npm install -g @kouma/client
```

Or use with `npx`:

```bash
npx kouma <command> [options]
```

## Environment Variables

All commands accept options via flags or environment variables:

| Variable        | Flag        | Description      |
| --------------- | ----------- | ---------------- |
| `KOUMA_HOST`    | `--host`    | Kouma server URL |
| `KOUMA_API_KEY` | `--api-key` | Project API key  |
| `KOUMA_PID`     | `--pid`     | Project ID       |

Environment variables are used as defaults when flags are not provided.

## Commands

### `new-build-staged` (recommended)

Create a build, upload screenshots to a build-specific staging area, and trigger analysis. Safe for parallel builds.

```bash
kouma new-build-staged \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --pid your-project-id \
    --build-version v1.0.0 \
    --screenshots-dir ./screenshots
```

| Option              | Required | Description                                    |
| ------------------- | -------- | ---------------------------------------------- |
| `--host`            | Yes      | Kouma server URL                               |
| `--api-key`         | Yes      | Project API key                                |
| `--pid`             | Yes      | Project ID                                     |
| `--build-version`   | Yes      | Build identifier (e.g., git commit SHA)        |
| `--screenshots-dir` | Yes      | Path to directory containing screenshot images |
| `--meta`            | No       | Custom metadata as `key=value` (repeatable)    |

### `create-build`

Create a new build record without triggering analysis. Use with `upload-screenshot` and `finalize-build` for full control.

```bash
kouma create-build \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --pid your-project-id \
    --build-version v1.0.0
```

| Option            | Required | Description                                 |
| ----------------- | -------- | ------------------------------------------- |
| `--host`          | Yes      | Kouma server URL                            |
| `--api-key`       | Yes      | Project API key                             |
| `--pid`           | Yes      | Project ID                                  |
| `--build-version` | Yes      | Build identifier                            |
| `--meta`          | No       | Custom metadata as `key=value` (repeatable) |

### `upload-screenshot`

Upload a single screenshot to a specific build's staging area.

```bash
kouma upload-screenshot \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --bid build-id \
    --file ./screenshots/login.png
```

| Option      | Required | Description                    |
| ----------- | -------- | ------------------------------ |
| `--host`    | Yes      | Kouma server URL               |
| `--api-key` | Yes      | Project API key                |
| `--bid`     | Yes      | Build ID (from `create-build`) |
| `--file`    | Yes      | Path to screenshot file        |

### `finalize-build`

Trigger analysis for a previously created build. Call after all screenshots have been uploaded.

```bash
kouma finalize-build \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --bid build-id
```

| Option      | Required | Description                    |
| ----------- | -------- | ------------------------------ |
| `--host`    | Yes      | Kouma server URL               |
| `--api-key` | Yes      | Project API key                |
| `--bid`     | Yes      | Build ID (from `create-build`) |

### `new-build` <Badge type="warning" text="deprecated" />

Upload screenshots sequentially and trigger comparison.

```bash
kouma new-build \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --pid your-project-id \
    --build-version v1.0.0 \
    --screenshots-dir ./screenshots
```

| Option              | Required | Description                                    |
| ------------------- | -------- | ---------------------------------------------- |
| `--host`            | Yes      | Kouma server URL                               |
| `--api-key`         | Yes      | Project API key                                |
| `--pid`             | Yes      | Project ID                                     |
| `--build-version`   | Yes      | Build identifier (e.g., git commit SHA)        |
| `--screenshots-dir` | Yes      | Path to directory containing screenshot images |

Screenshots are uploaded one at a time, then the build is initialized.

### `new-build-sync` <Badge type="warning" text="deprecated" />

Upload all screenshots and trigger comparison in a single request.

```bash
kouma new-build-sync \
    --host https://kouma.example.com \
    --api-key your-api-key \
    --pid your-project-id \
    --build-version v1.0.0 \
    --screenshots-dir ./screenshots
```

Same options as `new-build`.

### `build-stats`

Get the status and result of a specific build.

```bash
kouma build-stats --bid build-id
```

| Option  | Required | Description |
| ------- | -------- | ----------- |
| `--bid` | Yes      | Build ID    |

### `latest-build-stats`

Get the status and result of the latest build for a project.

```bash
kouma latest-build-stats --pid your-project-id
```

| Option  | Required | Description |
| ------- | -------- | ----------- |
| `--pid` | Yes      | Project ID  |

## CI/CD Examples

### GitHub Actions

```yaml
steps:
    - name: Upload screenshots to Kouma
      run: |
          npx kouma new-build-staged \
              --host ${{ secrets.KOUMA_HOST }} \
              --api-key ${{ secrets.KOUMA_API_KEY }} \
              --pid ${{ secrets.KOUMA_PID }} \
              --build-version ${{ github.sha }} \
              --screenshots-dir ./screenshots

    - name: Check build result
      run: |
          npx kouma latest-build-stats \
              --pid ${{ secrets.KOUMA_PID }}
```

### GitLab CI

```yaml
visual-test:
    script:
        - npx kouma new-build-staged --host $KOUMA_HOST --api-key $KOUMA_API_KEY --pid $KOUMA_PID --build-version $CI_COMMIT_SHA
          --screenshots-dir ./screenshots
```
