# Kouma Engine (Go)

Go rewrite of the Kouma screenshot comparison engine, replacing the original Node.js implementation for improved performance through native concurrency.

## Architecture

```
go-engine/
├── cmd/engine/         # Application entry point
├── config/             # Environment configuration
├── models/             # MongoDB data models (Build, Case, Project, Ignoring)
├── routes/             # HTTP routing and handlers
├── services/           # Business logic services
└── utils/              # Utilities (auth, file ops, image comparison, DB)
```

## API Endpoints

The Go engine maintains identical API contracts with the original Node.js engine:

| Endpoint                           | Method | Auth      | Description                                 |
| ---------------------------------- | ------ | --------- | ------------------------------------------- |
| `/echo`                            | GET    | No        | Health check                                |
| `/slave/build/initialize`          | POST   | x-api-key | Initialize a new build and start comparison |
| `/slave/images/project-tests/:pid` | POST   | x-api-key | Upload test screenshots                     |

## Key Improvements over Node.js

- **Concurrent image comparison** using goroutines and worker pools
- **No child process forking** — async comparisons run as goroutines
- **Lower memory footprint** — no V8 overhead or GC pauses
- **Static typing** — compile-time error detection
- **Single binary deployment** — no `node_modules` dependency

## Environment Variables

| Variable               | Description                            | Default                 |
|------------------------| -------------------------------------- | ----------------------- |
| `KOUMA_ENV`            | Environment mode (`docker` or default) | default                 |
| `KOUMA_FS_HOST_URL`    | File server host URL                   | `http://localhost:8123` |
| `KOUMA_DB_USERNAME`    | MongoDB username                       | —                       |
| `KOUMA_DB_PASSWORD`    | MongoDB password                       | —                       |
| `PORT`                 | HTTP server port                       | `3002`                  |

## Running Locally

```bash
cd go-engine
go run ./cmd/engine
```

## Running Tests

```bash
cd go-engine
go test ./... -v
```

## Building

```bash
cd go-engine
go build -o kouma-engine ./cmd/engine
```

## Docker

```bash
cd go-engine
docker build -t kouma-engine .
docker run -p 3002:3002 kouma-engine
```
