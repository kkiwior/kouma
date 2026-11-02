import { describe, it, expect, mock, spyOn, beforeEach, afterEach } from 'bun:test';

const accessPolicy = {
    domains: [
        { domain: 'example.com', includeSubdomains: false },
        { domain: 'corp.example.org', includeSubdomains: true },
    ],
    emails: ['contractor@partner.io'],
    requireVerifiedEmail: true,
};

mock.module('../config/auth.config', () => ({
    authMode: 'google',
    microsoftOAuth: { clientId: '', clientSecret: '', tenantId: 'common', authorizeUrl: '', tokenUrl: '', userInfoUrl: '', scope: '' },
    googleOAuth: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-secret',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scope: 'openid profile email',
    },
    oauthAccessPolicy: accessPolicy,
    getOAuthRedirectUri: (_req: Request, provider: string) => `http://localhost:3001/api/auth/oauth/callback?provider=${provider}`,
}));

const activityLog = mock(() => Promise.resolve());
mock.module('../services/activity-log-service', () => ({ activityLogService: { log: activityLog } }));

import { Router } from '../src/router.ts';
import { registerAuthRoutes } from './auth.controller.ts';

const originalFetch = globalThis.fetch;

function mockGoogle(userInfo: Record<string, unknown>, tokenStatus = 200) {
    const fetchMock = mock(async (input: string | URL | Request) => {
        const url = String(input);
        if (url.startsWith('https://oauth2.googleapis.com/token')) {
            if (tokenStatus !== 200) return new Response('invalid_grant', { status: tokenStatus });
            return Response.json({ access_token: 'access-token', token_type: 'Bearer' });
        }
        if (url.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
            return Response.json(userInfo);
        }
        return new Response('not found', { status: 404 });
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    return fetchMock;
}

async function callback(query = 'code=auth-code&provider=google') {
    const router = new Router();
    registerAuthRoutes(router);
    const route = router.match('GET', '/api/auth/oauth/callback');
    return route!.handler(new Request(`http://localhost/api/auth/oauth/callback?${query}`), {});
}

describe('Auth Controller - OAuth access policy', () => {
    let warnSpy: ReturnType<typeof spyOn>;
    let errorSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        activityLog.mockClear();
        warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        globalThis.fetch = originalFetch;
        warnSpy.mockRestore();
        errorSpy.mockRestore();
    });

    it('should sign in a verified user from an allowed domain', async () => {
        const fetchMock = mockGoogle({ email: 'Alice@Example.com', email_verified: true });

        const res = await callback();
        expect(res.status).toBe(302);
        expect(res.headers.get('location')).toBe('/');
        expect(res.headers.get('set-cookie')).toContain('HttpOnly');
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(activityLog).toHaveBeenCalledWith('', 'user_login', 'alice@example.com', 'auth', '', 'User logged in via OAuth (google)');
    });

    it('should sign in a user from a subdomain of a wildcard domain', async () => {
        mockGoogle({ email: 'bob@qa.corp.example.org', email_verified: true });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/');
        expect(res.headers.get('set-cookie')).not.toBeNull();
    });

    it('should sign in an explicitly allowed email', async () => {
        mockGoogle({ email: 'contractor@partner.io', email_verified: 'true' });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/');
    });

    it('should reject a user from a domain that is not allowed', async () => {
        mockGoogle({ email: 'mallory@other.com', email_verified: true });

        const res = await callback();
        expect(res.status).toBe(302);
        expect(res.headers.get('location')).toBe('/login?error=domain_not_allowed');
        expect(res.headers.get('set-cookie')).toBeNull();
        expect(activityLog).not.toHaveBeenCalled();
    });

    it('should reject a user from a lookalike domain of a wildcard domain', async () => {
        mockGoogle({ email: 'mallory@evilcorp.example.org', email_verified: true });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/login?error=domain_not_allowed');
        expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('should reject a user whose email is not verified', async () => {
        mockGoogle({ email: 'alice@example.com', email_verified: false });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/login?error=email_not_verified');
        expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('should treat a missing verification flag as unverified', async () => {
        mockGoogle({ email: 'alice@example.com' });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/login?error=email_not_verified');
    });

    it('should redirect with oauth_failed when the token exchange fails', async () => {
        mockGoogle({ email: 'alice@example.com', email_verified: true }, 400);

        const res = await callback();
        expect(res.headers.get('location')).toBe('/login?error=oauth_failed');
        expect(res.headers.get('set-cookie')).toBeNull();
    });

    it('should redirect with oauth_failed when the provider returns no email', async () => {
        mockGoogle({ email_verified: true });

        const res = await callback();
        expect(res.headers.get('location')).toBe('/login?error=oauth_failed');
    });
});
