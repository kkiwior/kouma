# Engine

The Kouma engine is the core comparison service written in Go. It receives uploaded screenshots, compares them against the baseline, and
generates diff images.

## Features

### Pixel-Based Comparison

The engine compares screenshots pixel-by-pixel against baseline images. Each pixel's color values are compared to detect visual differences.

### Color Threshold

Configure a **color threshold** to tolerate minor color differences that aren't visually significant. This helps reduce false positives
caused by:

- Anti-aliased font rendering differences
- Sub-pixel rendering across different operating systems
- Minor color profile differences

### Antialiasing Detection

The engine includes optional antialiasing detection that identifies pixels that are likely antialiasing artifacts rather than actual visual
changes. This reduces noise in the comparison results.

### Ignoring Rectangles

Specific regions of a screenshot can be excluded from comparison. This is configured per test case through the dashboard and applied during
comparison.

### Concurrent Processing

The Go engine uses a **worker pool pattern** with goroutines for parallel image comparison. Multiple test cases within a build are compared
simultaneously.

### Build Processing

When a build is initialized:

1. All uploaded screenshots are matched to existing test cases (or new cases are created)
2. Each screenshot is compared against the corresponding baseline screenshot
3. A diff image is generated showing the pixel differences
4. Results are stored in MongoDB
5. The overall build status is determined (passed, failed, unresolved)

## API Endpoints

All endpoints except `/echo` require the `x-api-key` header for authentication.

### Health Check

```http
GET /echo
```

Returns a health check response. No authentication required.

### Upload Screenshots

```http
POST /slave/images/project-tests/:pid
```

Upload screenshots for a project. Files are stored on the shared file system.

### Initialize Build

```http
POST /slave/build/initialize
```

Initialize a new build and trigger comparison. Requires a JSON body with project ID and build version.

### Synchronous Build

```http
POST /slave/build/sync
```

Upload screenshots, initialize a build, and run comparison in a single request. This is the recommended endpoint for CI/CD pipelines.

## Configuration

| Variable               | Default | Description                                   |
| ---------------------- | ------- | --------------------------------------------- |
| `KOUMA_ENV`            | —       | Set to `docker` for containerized deployment  |
| `KOUMA_FS_HOST_URL`    | —       | File server URL for screenshot storage        |
| `KOUMA_DB_HOST`        | —       | MongoDB host                                  |
| `KOUMA_DB_USERNAME`    | —       | MongoDB username                              |
| `KOUMA_DB_PASSWORD`    | —       | MongoDB password                              |
| `PORT`                 | `3002`  | Engine service port                           |
