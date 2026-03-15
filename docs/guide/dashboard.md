# Dashboard

The Kouma dashboard is a web application for managing projects, reviewing visual test results, and maintaining baselines.

## Features

### Project Management

- Create and manage visual testing projects
- Each project has a unique **Project ID** and **API Key** for automation
- View all builds and their comparison results

### Build Review

- Browse builds sequentially by index number
- See overall build status: **passed**, **failed**, or **unresolved**
- Drill into individual test cases to review differences

### Visual Comparison

When a mismatch is detected, the dashboard provides multiple ways to review the differences:

- **Side-by-side view** — baseline and current screenshot next to each other
- **Diff overlay** — highlighted pixel differences on the screenshot
- **Original images** — view full-resolution baseline and test screenshots

### Baseline Management

- **Rebase builds** — promote a build to become the new baseline
- **Approve individual cases** — accept specific visual changes while flagging others
- **Build history** — track how the UI has changed over time

### Ignoring Rectangles

For dynamic UI elements (timestamps, animations, ads), you can define **ignoring rectangles** on specific test cases. These regions are
excluded from the pixel comparison.

This is useful for:

- Timestamps and dates
- Loading animations
- Dynamic content areas
- Third-party ad placements

### Activity Logging

All user actions are logged for audit purposes:

- Project creation and updates
- Build rebasing
- Case approval/rejection
- Authentication events

## API Documentation

The dashboard exposes a Swagger UI at `/docs` with the full OpenAPI specification for all REST endpoints.

## Tech Stack

| Component    | Technology              |
| ------------ | ----------------------- |
| **Backend**  | Bun, TypeScript         |
| **Frontend** | Vue 3, TypeScript, Vite |
| **Styling**  | Tailwind CSS            |
| **Routing**  | Vue Router 4            |
| **Database** | MongoDB via Mongoose    |
