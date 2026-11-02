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
2. Add a redirect URI: `https://your-kouma-host/api/auth/oauth/callback?provider=microsoft`
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
2. Add a redirect URI: `https://your-kouma-host/api/auth/oauth/callback?provider=google`
3. Copy the Client ID and Client Secret

## Access Restrictions

By default every account that can sign in with the configured OAuth provider gets access to the dashboard. For OAuth modes (Microsoft and
Google) you can restrict access by email domain, by individual email address, or both.

### Allowed Domains

```yaml
KOUMA_OAUTH_ALLOWED_DOMAINS: example.com,*.corp.example.com
```

Entries are comma-separated and case-insensitive:

| Entry           | Matches                                                                |
| --------------- | ---------------------------------------------------------------------- |
| `example.com`   | `alice@example.com` only — subdomains are **not** included             |
| `*.example.com` | `alice@example.com`, `bob@dev.example.com`, `carol@eu.dev.example.com` |

Wildcards only match whole domain labels: `*.example.com` does **not** match lookalike domains such as `notexample.com`.

Invalid entries (for example `localhost` or `user@example.com`) are ignored and reported in the dashboard logs on startup.

### Allowed Emails

```yaml
KOUMA_OAUTH_ALLOWED_EMAILS: contractor@partner.io,auditor@agency.gov
```

Individual addresses that may sign in regardless of `KOUMA_OAUTH_ALLOWED_DOMAINS`. Useful for granting access to external collaborators
without opening the dashboard to their whole organization.

When either `KOUMA_OAUTH_ALLOWED_DOMAINS` or `KOUMA_OAUTH_ALLOWED_EMAILS` is set, a user is allowed in if their email is listed explicitly
**or** its domain matches one of the allowed domains.

### Verified Emails

```yaml
KOUMA_OAUTH_REQUIRE_VERIFIED_EMAIL: true
```

Enabled by default. Google accounts whose email address has not been verified are rejected, since anyone can create a Google account for an
address they do not own. Microsoft Graph does not report a verification status, so this setting has no effect in `microsoft` mode.

### Sign-in Errors

Rejected users are redirected back to the login page, which explains why access was denied:

| Error code           | Reason                                                              |
| -------------------- | ------------------------------------------------------------------- |
| `domain_not_allowed` | The email domain does not match `KOUMA_OAUTH_ALLOWED_DOMAINS`       |
| `email_not_allowed`  | Only `KOUMA_OAUTH_ALLOWED_EMAILS` is set and the email is not on it |
| `email_not_verified` | The provider reported the email address as unverified               |
| `invalid_email`      | The provider returned an address without a domain                   |

Every rejected attempt is also logged as a warning together with the email address and the provider.

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
        - KOUMA_OAUTH_ALLOWED_DOMAINS=*.mycompany.com
        - KOUMA_OAUTH_ALLOWED_EMAILS=contractor@partner.io
```
