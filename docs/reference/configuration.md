# Configuration Reference

Complete reference of all environment variables used by Kouma services.

## Dashboard

| Variable            | Default     | Description                                                           |
| ------------------- | ----------- | --------------------------------------------------------------------- |
| `KOUMA_ENV`         | —           | Set to `docker` for containerized deployment                          |
| `KOUMA_FS_HOST_URL` | —           | File server URL for screenshot access (e.g., `http://localhost:3001`) |
| `KOUMA_DB_HOST`     | `localhost` | MongoDB host                                                          |
| `KOUMA_DB_USERNAME` | —           | MongoDB username                                                      |
| `KOUMA_DB_PASSWORD` | —           | MongoDB password                                                      |
| `KOUMA_AUTH_MODE`   | `none`      | Authentication mode: `none`, `passcode`, `microsoft`, `google`        |
| `KOUMA_PASSCODE`    | —           | Passcode for `passcode` auth mode                                     |
| `KOUMA_JWT_SECRET`  | —           | JWT signing secret (auto-generated if not set)                        |
| `PORT`              | `3001`      | Dashboard service port                                                |

### Microsoft OAuth

| Variable                        | Description                        |
| ------------------------------- | ---------------------------------- |
| `KOUMA_MICROSOFT_CLIENT_ID`     | Azure AD application client ID     |
| `KOUMA_MICROSOFT_CLIENT_SECRET` | Azure AD application client secret |
| `KOUMA_MICROSOFT_TENANT_ID`     | Azure AD tenant ID                 |

### Google OAuth

| Variable                     | Description                    |
| ---------------------------- | ------------------------------ |
| `KOUMA_GOOGLE_CLIENT_ID`     | Google OAuth 2.0 client ID     |
| `KOUMA_GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |

### OAuth Common

| Variable                      | Description                                   |
| ----------------------------- | --------------------------------------------- |
| `KOUMA_OAUTH_ALLOWED_DOMAINS` | Comma-separated list of allowed email domains |

## Engine

| Variable            | Default     | Description                                  |
| ------------------- | ----------- | -------------------------------------------- |
| `KOUMA_ENV`         | —           | Set to `docker` for containerized deployment |
| `KOUMA_FS_HOST_URL` | —           | File server URL for screenshot storage       |
| `KOUMA_DB_HOST`     | `localhost` | MongoDB host                                 |
| `KOUMA_DB_USERNAME` | —           | MongoDB username                             |
| `KOUMA_DB_PASSWORD` | —           | MongoDB password                             |
| `PORT`              | `3002`      | Engine service port                          |

## Client / CLI

| Variable        | Description      |
| --------------- | ---------------- |
| `KOUMA_HOST`    | Kouma server URL |
| `KOUMA_API_KEY` | Project API key  |
| `KOUMA_PID`     | Project ID       |

## Docker Compose Example

```yaml
services:
    kouma-dashboard:
        environment:
            - KOUMA_ENV=docker
            - KOUMA_FS_HOST_URL=http://localhost:3001
            - KOUMA_DB_HOST=kouma-mongodb
            - KOUMA_DB_USERNAME=kouma-user
            - KOUMA_DB_PASSWORD=kouma-password
            - KOUMA_AUTH_MODE=none

    kouma-engine:
        environment:
            - KOUMA_ENV=docker
            - KOUMA_FS_HOST_URL=http://localhost:3001
            - KOUMA_DB_HOST=kouma-mongodb
            - KOUMA_DB_USERNAME=kouma-user
            - KOUMA_DB_PASSWORD=kouma-password
```
