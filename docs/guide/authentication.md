# Authentication

Kouma supports multiple authentication modes configured via the `KOUMA_AUTH_MODE` environment variable.

## Authentication Modes

### No Authentication (Default)

```yaml
KOUMA_AUTH_MODE: none
```

No login required. Suitable for local development and trusted environments.

### Passcode

```yaml
KOUMA_AUTH_MODE: passcode
KOUMA_PASSCODE: your-secret-passcode
```

Users must enter a shared passcode to access the dashboard. Simple authentication for small teams.

### Microsoft OAuth

```yaml
KOUMA_AUTH_MODE: microsoft
KOUMA_MICROSOFT_CLIENT_ID: your-client-id
KOUMA_MICROSOFT_CLIENT_SECRET: your-client-secret
KOUMA_MICROSOFT_TENANT_ID: your-tenant-id
```

Authenticate via Microsoft Azure AD / Entra ID. Users sign in with their Microsoft account.

**Setup in Azure:**

1. Register a new application in Azure AD
2. Add a redirect URI: `https://your-kouma-host/api/auth/microsoft/callback`
3. Create a client secret
4. Copy the Client ID, Client Secret, and Tenant ID

### Google OAuth

```yaml
KOUMA_AUTH_MODE: google
KOUMA_GOOGLE_CLIENT_ID: your-client-id
KOUMA_GOOGLE_CLIENT_SECRET: your-client-secret
```

Authenticate via Google OAuth 2.0. Users sign in with their Google account.

**Setup in Google Cloud Console:**

1. Create a new OAuth 2.0 Client ID
2. Add a redirect URI: `https://your-kouma-host/api/auth/google/callback`
3. Copy the Client ID and Client Secret

## Domain Restriction

For OAuth modes (Microsoft and Google), you can restrict access to specific email domains:

```yaml
KOUMA_OAUTH_ALLOWED_DOMAINS: example.com,corp.example.com
```

Only users with email addresses matching the allowed domains will be able to sign in.

## API Key Authentication

The engine API uses a separate API key mechanism. Each project has its own API key for programmatic access. The API key is sent as the
`x-api-key` header with every request.

::: tip The dashboard API key and the project API key serve different purposes. The project API key is used for uploading screenshots and
triggering builds via the CLI or client library. :::

## JWT Tokens

After successful authentication, the dashboard issues JWT tokens stored as HTTP-only cookies. The token contains the user's email address
and is used for session management.

## Docker Compose Example

```yaml
kouma-dashboard:
    environment:
        - KOUMA_AUTH_MODE=microsoft
        - KOUMA_MICROSOFT_CLIENT_ID=abc123
        - KOUMA_MICROSOFT_CLIENT_SECRET=secret
        - KOUMA_MICROSOFT_TENANT_ID=tenant-id
        - KOUMA_OAUTH_ALLOWED_DOMAINS=mycompany.com
```
