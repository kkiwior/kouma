import { describe, it, expect, mock } from 'bun:test';

mock.module('../config/auth.config', () => ({
    authMode: 'none',
    microsoftOAuth: {
        clientId: 'test-ms-client-id',
        clientSecret: 'test-ms-secret',
        tenantId: 'test-tenant',
        authorizeUrl: 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token',
        userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
        scope: 'openid profile email',
    },
    googleOAuth: {
        clientId: 'test-google-client-id',
        clientSecret: 'test-google-secret',
        authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        scope: 'openid profile email',
    },
    oauthAllowedDomains: [],
    getOAuthRedirectUri: (_req: Request, provider: string) => `http://localhost:3001/api/auth/oauth/callback?provider=${provider}`,
}));

mock.module('../services/auth-service', () => ({
    authService: { getPasscode: mock(() => Promise.resolve(null)), initializeAuth: mock(() => Promise.resolve('test-passcode')) },
}));

import { Router } from '../src/router.ts';
import { registerAuthRoutes } from './auth.controller.ts';

function createRouter(): Router {
    const router = new Router();
    registerAuthRoutes(router);
    return router;
}

describe('Auth Controller - None Mode', () => {
    describe('GET /api/auth/config', () => {
        it('should return current auth mode', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/config');
            expect(route).not.toBeNull();

            const req = new Request('http://localhost/api/auth/config');
            const res = await route!.handler(req, {});
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.authMode).toBe('none');
        });
    });

    describe('GET /api/auth/check', () => {
        it('should return success=true when auth mode is none', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/check');

            const req = new Request('http://localhost/api/auth/check');
            const res = await route!.handler(req, {});
            const json = await res.json();
            expect(json.success).toBe(true);
        });
    });

    describe('POST /api/auth/login', () => {
        it('should auto-login when auth mode is none', async () => {
            const router = createRouter();
            const route = router.match('POST', '/api/auth/login');

            const req = new Request('http://localhost/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({}),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await route!.handler(req, {});
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.success).toBe(true);
            expect(json.redirect).toBe('/');

            const setCookie = res.headers.get('set-cookie');
            expect(setCookie).not.toBeNull();
        });
    });

    describe('GET /api/auth/oauth/login', () => {
        it('should return 400 for invalid provider', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/oauth/login');

            const req = new Request('http://localhost/api/auth/oauth/login?provider=invalid');
            const res = await route!.handler(req, {});
            expect(res.status).toBe(400);
        });

        it('should return 400 when provider does not match auth mode', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/oauth/login');

            const req = new Request('http://localhost/api/auth/oauth/login?provider=microsoft');
            const res = await route!.handler(req, {});
            expect(res.status).toBe(400);

            const json = await res.json();
            expect(json.error).toContain('not enabled');
        });
    });

    describe('GET /api/auth/oauth/callback', () => {
        it('should redirect to login with error when OAuth provider returns error', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/oauth/callback');

            const req = new Request(
                'http://localhost/api/auth/oauth/callback?error=access_denied&error_description=User+denied&provider=microsoft',
            );
            const res = await route!.handler(req, {});
            expect(res.status).toBe(302);

            const location = res.headers.get('location');
            expect(location).toContain('/login?error=');
        });

        it('should redirect to login when code is missing', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/oauth/callback');

            const req = new Request('http://localhost/api/auth/oauth/callback?provider=microsoft');
            const res = await route!.handler(req, {});
            expect(res.status).toBe(302);

            const location = res.headers.get('location');
            expect(location).toContain('/login?error=missing_code');
        });

        it('should redirect to login when provider is invalid', async () => {
            const router = createRouter();
            const route = router.match('GET', '/api/auth/oauth/callback');

            const req = new Request('http://localhost/api/auth/oauth/callback?code=abc&provider=invalid');
            const res = await route!.handler(req, {});
            expect(res.status).toBe(302);

            const location = res.headers.get('location');
            expect(location).toContain('/login?error=invalid_provider');
        });
    });

    describe('POST /api/auth/logout', () => {
        it('should clear cookie in none mode without requiring auth', async () => {
            const router = createRouter();
            const route = router.match('POST', '/api/auth/logout');

            const req = new Request('http://localhost/api/auth/logout', { method: 'POST' });
            const res = await route!.handler(req, {});
            expect(res.status).toBe(200);

            const json = await res.json();
            expect(json.success).toBe(true);

            const setCookie = res.headers.get('set-cookie');
            expect(setCookie).toContain('Max-Age=0');
        });
    });

    describe('route registration', () => {
        it('should register all expected auth routes', () => {
            const router = createRouter();

            expect(router.match('GET', '/api/auth/config')).not.toBeNull();
            expect(router.match('GET', '/api/auth/check')).not.toBeNull();
            expect(router.match('POST', '/api/auth/login')).not.toBeNull();
            expect(router.match('GET', '/api/auth/oauth/login')).not.toBeNull();
            expect(router.match('GET', '/api/auth/oauth/callback')).not.toBeNull();
            expect(router.match('POST', '/api/auth/logout')).not.toBeNull();
        });
    });
});
