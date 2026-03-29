# Introduction

Kouma is a **pixel-based screenshot comparison solution** for visual regression testing. It helps you catch unintended visual changes in
your application by comparing screenshots against a known baseline.

## What Kouma Does

- **Web Dashboard** — inspect test results, review visual mismatches, and maintain baseline builds
- **Engine Service** — compare the latest screenshots against baseline screenshots using pixel-level difference analysis
- **Webhooks** -push build results to external systems through HTTP callbacks, enabling integrations with CI/CD pipelines, chat tools, or
  custom automation workflows.
- **Client Library & CLI** — upload screenshots and trigger comparisons from your CI/CD pipeline or test framework
- **Cypress Integration** — built-in plugin for automatic screenshot collection and upload
- **Playwright Integration** — built-in reporter for automatic screenshot collection and upload
- **Docker & Kubernetes** — quick local setup with Docker Compose and production-ready Helm charts

## How It Works

1. **Take screenshots** in your tests using any framework (Cypress, Playwright, Selenium, etc.)
2. **Upload screenshots** to Kouma using the CLI, client library, Cypress plugin, or Playwright reporter
3. **Kouma compares** each screenshot against the baseline pixel-by-pixel
4. **Review results** in the web dashboard — approve changes or flag regressions
5. **Maintain baselines** by rebasing builds when visual changes are intentional

## Architecture Overview

Kouma consists of three main services:

| Service       | Technology  | Purpose               |
| ------------- | ----------- | --------------------- |
| **Dashboard** | Bun + Vue 3 | Web UI and REST API   |
| **Engine**    | Go          | Screenshot comparison |
| **MongoDB**   | MongoDB     | Data storage          |

All services run as Docker containers and communicate through an internal network.

## Next Steps

- [Installation](/guide/installation) — set up Kouma locally or on a server
- [Client Library](/guide/client-library) — integrate Kouma into your workflow
- [Dashboard](/guide/dashboard) — learn about the web interface
