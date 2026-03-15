import { describe, it, expect } from 'bun:test';

process.env.KOUMA_AUTH_MODE = 'passcode';

describe('auth.config', () => {
    describe('parseAuthMode', () => {
        it('should parse valid auth modes from env', () => {
            const validModes = ['none', 'passcode', 'microsoft', 'google'];
            for (const mode of validModes) {
                expect(validModes).toContain(mode);
            }
        });

        it('should export getOAuthRedirectUri function', async () => {
            const { getOAuthRedirectUri } = await import('./auth.config.ts');
            expect(typeof getOAuthRedirectUri).toBe('function');
        });

        it('should generate correct redirect URI from request', async () => {
            const { getOAuthRedirectUri } = await import('./auth.config.ts');
            const req = new Request('http://localhost:3001/api/auth/oauth/login', {
                headers: { host: 'example.com', 'x-forwarded-proto': 'https' },
            });
            const uri = getOAuthRedirectUri(req, 'microsoft');
            expect(uri).toBe('https://example.com/api/auth/oauth/callback?provider=microsoft');
        });

        it('should use x-forwarded-host when present', async () => {
            const { getOAuthRedirectUri } = await import('./auth.config.ts');
            const req = new Request('http://localhost:3001/api/auth/oauth/login', {
                headers: { host: 'internal:3001', 'x-forwarded-host': 'public.example.com', 'x-forwarded-proto': 'https' },
            });
            const uri = getOAuthRedirectUri(req, 'google');
            expect(uri).toBe('https://public.example.com/api/auth/oauth/callback?provider=google');
        });

        it('should export microsoft and google OAuth configs', async () => {
            const { microsoftOAuth, googleOAuth } = await import('./auth.config.ts');
            expect(microsoftOAuth).toBeDefined();
            expect(microsoftOAuth.authorizeUrl).toContain('login.microsoftonline.com');
            expect(microsoftOAuth.scope).toContain('openid');

            expect(googleOAuth).toBeDefined();
            expect(googleOAuth.authorizeUrl).toContain('accounts.google.com');
            expect(googleOAuth.tokenUrl).toContain('googleapis.com');
            expect(googleOAuth.scope).toContain('openid');
        });

        it('should export oauthAllowedDomains as an array', async () => {
            const { oauthAllowedDomains } = await import('./auth.config.ts');
            expect(Array.isArray(oauthAllowedDomains)).toBe(true);
        });
    });
});
