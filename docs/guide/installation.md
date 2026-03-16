# Installation

Kouma can be deployed using Docker Compose for local development or Kubernetes with Helm for production environments.

## Docker Images

Kouma publishes Docker images to the GitHub Container Registry (GHCR):

| Image | Pull Address |
| --- | --- |
| **Dashboard** | `ghcr.io/kkiwior/kouma/dashboard` |
| **Engine** | `ghcr.io/kkiwior/kouma/engine` |

Each release publishes both a version-tagged image (e.g., `:1.2.3`) and a `:latest` tag.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and [Docker Compose](https://docs.docker.com/compose/install/)

## Docker Compose

The quickest way to get started is with Docker Compose.

### 1. Clone the repository

```bash
git clone https://github.com/kkiwior/kouma.git
cd kouma
```

### 2. Start the services

```bash
docker-compose up
```

This starts three services:

| Service       | Port    | Description                      |
| ------------- | ------- | -------------------------------- |
| **Dashboard** | `3001`  | Web application                  |
| **Engine**    | `3002`  | Comparison engine                |
| **MongoDB**   | `27017` | Database                         |

### 3. Access Kouma

Open [http://localhost:3001](http://localhost:3001) in your browser to access the dashboard.

### 4. Create a project

In the dashboard, create a new project. Note the **Project ID** and **API Key** — you'll need these to upload screenshots.

## Kubernetes with Helm

For production deployments, use the Kouma Helm chart. The chart is published as an OCI artifact to the GitHub Container Registry.

### Install from OCI registry

```bash
helm install kouma oci://ghcr.io/kkiwior/charts/kouma --version <version>
```

To install the latest version:

```bash
helm install kouma oci://ghcr.io/kkiwior/charts/kouma
```

### Install from source

Alternatively, install directly from the repository:

```bash
git clone https://github.com/kkiwior/kouma.git
helm install kouma ./kouma/charts/kouma
```

### Customize values

Create a `values.yaml` file to override defaults:

```yaml
ingress:
    enabled: true
    className: nginx
    hosts:
        - host: kouma.example.com
    tls:
        - secretName: kouma-tls
          hosts:
              - kouma.example.com

dashboard:
    auth:
        mode: microsoft
        microsoft:
            clientId: your-client-id
            clientSecret: your-client-secret
            tenantId: your-tenant-id
```

```bash
helm install kouma oci://ghcr.io/kkiwior/charts/kouma -f values.yaml
```

### Using an external MongoDB

To connect to an external MongoDB instance instead of the bundled one:

```yaml
mongodb:
    enabled: false

externalMongodb:
    uri: mongodb+srv://user:pass@cluster.mongodb.net/kouma
```

Or reference an existing Kubernetes secret:

```yaml
mongodb:
    enabled: false

externalMongodb:
    existingSecret: my-mongodb-secret
    existingSecretKey: mongodb-uri
```

### Helm chart configuration

See the [Helm Chart Reference](/reference/helm-chart) for all available values.

## Services Overview

### Dashboard

The web application serves the REST API (`/api/`), the Vue.js frontend, and proxies engine requests:

- `/` → Dashboard UI
- `/engine/` → Proxies to Engine API
- `/images/` → Serves screenshot file storage

### Engine

The Go comparison engine handles screenshot uploads and pixel-based comparison.

### MongoDB

Default credentials for local development:

| Setting        | Value            |
| -------------- | ---------------- |
| Admin user     | `mgadmin`        |
| Admin password | `Password1`      |
| App user       | `kouma-user`     |
| App password   | `kouma-password` |
| Database       | `kouma`          |

::: warning Change the default credentials for any non-local deployment. :::

## Next Steps

- [Client Library](/guide/client-library) — upload screenshots from your CI pipeline
- [Configuration Reference](/reference/configuration) — all environment variables
- [Authentication](/guide/authentication) — configure authentication
