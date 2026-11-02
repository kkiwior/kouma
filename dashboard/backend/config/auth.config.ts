import { getEnv } from '../utils/env-utils.js';
import { parseAllowedEmails, parseDomainRules, type OAuthAccessPolicy } from '../utils/oauth-access-policy.ts';

export type AuthMode = 'none' | 'passcode' | 'microsoft' | 'google';

const VALID_AUTH_MODES: AuthMode[] = ['none', 'passcode', 'microsoft', 'google'];

function parseAuthMode(): AuthMode {
    const raw = getEnv('AUTH_MODE', 'none').toLowerCase();
    if (VALID_AUTH_MODES.includes(raw as AuthMode)) return raw as AuthMode;
    return 'none';
}

export const authMode: AuthMode = parseAuthMode();

export const microsoftOAuth = {
    clientId: getEnv('MICROSOFT_CLIENT_ID', ''),
    clientSecret: getEnv('MICROSOFT_CLIENT_SECRET', ''),
    tenantId: getEnv('MICROSOFT_TENANT_ID', 'common'),
    get authorizeUrl() {
        return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
    },
    get tokenUrl() {
        return `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
    },
    userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
    scope: 'openid profile email',
};

export const googleOAuth = {
    clientId: getEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
    scope: 'openid profile email',
};

export const oauthAccessPolicy: OAuthAccessPolicy = {
    domains: parseDomainRules(getEnv('OAUTH_ALLOWED_DOMAINS', '')),
    emails: parseAllowedEmails(getEnv('OAUTH_ALLOWED_EMAILS', '')),
    requireVerifiedEmail: getEnv('OAUTH_REQUIRE_VERIFIED_EMAIL', 'true').toLowerCase() !== 'false',
};

export function getOAuthRedirectUri(req: Request, provider: string): string {
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3001';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    return `${proto}://${host}/api/auth/oauth/callback?provider=${provider}`;
}
