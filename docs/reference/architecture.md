# Architecture

Overview of Kouma's system architecture and how the services interact.

## System Diagram

```
┌─────────────────────────────────────────────────┐
│                   Nginx (port 8123)              │
│                  Reverse Proxy                   │
│                                                  │
│  /          → Dashboard (port 3001)              │
│  /engine/   → Engine (port 3002)                 │
│  /file-server/ → Screenshot storage              │
└────────┬──────────────┬──────────────┬───────────┘
         │              │              │
    ┌────▼────┐    ┌────▼────┐    ┌───▼────┐
    │Dashboard│    │ Engine  │    │ Files  │
    │ Bun +   │    │   Go    │    │ Volume │
    │ Vue 3   │    │         │    │        │
    └────┬────┘    └────┬────┘    └────────┘
         │              │
         └──────┬───────┘
                │
         ┌──────▼──────┐
         │   MongoDB   │
         │ (port 27017)│
         └─────────────┘
```

## Components

### Nginx

The entry point for all traffic. Routes requests based on URL path:

- **`/`** — Proxies to the Dashboard
- **`/engine/`** — Proxies to the Engine
- **`/file-server/`** — Serves static screenshot files from the shared volume

### Dashboard

**Technology**: Bun + TypeScript (backend), Vue 3 + Vite (frontend)

Responsibilities:

- Serve the web UI for reviewing test results
- REST API for project, build, and case management
- Authentication (passcode, Microsoft OAuth, Google OAuth)
- Swagger/OpenAPI documentation
- Activity logging

### Engine

**Technology**: Go 1.26.0

Responsibilities:

- Receive screenshot uploads
- Store screenshots on the shared file system
- Compare screenshots against baseline images
- Generate diff images highlighting pixel differences
- Update build and case results in MongoDB

### MongoDB

**Technology**: MongoDB 4+

Stores:

- **Projects** — name, API key, configuration
- **Builds** — version, index, status, result
- **Cases** — test case data, baseline and comparison screenshots
- **Ignorings** — rectangle coordinates for excluding regions from comparison
- **Activity Logs** — user action audit trail

### Shared File System

A Docker volume (`kouma-exchange-volume`) shared between Nginx, Dashboard, and Engine:

- Engine writes uploaded and generated screenshots
- Nginx serves them as static files via `/file-server/`
- Dashboard references them in the web UI

## Data Flow

### Upload and Compare

```
1. Client/CLI uploads images    →  Engine /slave/build/sync
2. Engine stores screenshots  →  Shared volume
3. Engine compares each       →  Against baseline from MongoDB
4. Engine generates diffs     →  Saved to shared volume
5. Engine updates results     →  MongoDB (build + cases)
6. Dashboard reads results    →  MongoDB
7. Dashboard shows images     →  Via Nginx /file-server/
```

### Review and Rebase

```
1. User reviews results      →  Dashboard UI
2. User approves changes     →  Dashboard API → MongoDB
3. User rebases build        →  Dashboard API → MongoDB
4. New baseline set          →  For next comparison
```

## Deployment Models

### Docker Compose (Development)

All four services run on a single machine. Best for local development and small teams.

### Kubernetes with Helm (Production)

Each service runs as a separate deployment with:

- Persistent volume claims for MongoDB and file storage
- Configurable resource limits
- Service-based internal networking
- ConfigMap for Nginx configuration
- Optional Ingress resource with TLS support
- Support for external MongoDB connections

The Helm chart is published to `oci://ghcr.io/kkiwior/charts/kouma`. See the [Helm Chart Reference](/reference/helm-chart) for all available configuration options.

## Docker Images

| Image | Address |
| --- | --- |
| **Dashboard** | `ghcr.io/kkiwior/kouma/dashboard` |
| **Engine** | `ghcr.io/kkiwior/kouma/engine` |

Each release publishes both a version-tagged image (e.g., `:1.2.3`) and a `:latest` tag.
