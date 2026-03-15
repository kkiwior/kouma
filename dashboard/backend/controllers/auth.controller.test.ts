import { describe, it, expect, mock, spyOn } from 'bun:test';

mock.module('../config/auth.config', () => ({
    authMode: 'passcode',
    microsoftOAuth: { clientId: '', clientSecret: '', tenantId: 'common', authorizeUrl: '', tokenUrl: '', userInfoUrl: '', scope: '' },
    googleOAuth: { clientId: '', clientSecret: '', authorizeUrl: '', tokenUrl: '', userInfoUrl: '', scope: '' },
    oauthAllowedDomains: [],
    getOAuthRedirectUri: () => '',
}));

mock.module('../services/activity-log-service', () => ({ activityLogService: { log: mock(() => Promise.resolve()) } }));

import { authService } from '../services/auth-service.ts';
import { Router } from '../src/router.ts';
import { registerAuthRoutes } from './auth.controller.ts';

describe('Auth Controller', () => {
    it('returns 401 when getPasscode throws an error', async () => {
        const router = new Router();
        registerAuthRoutes(router);

        const mockError = new Error('Invalid encrypted data format or wrong key');
        const getPasscodeSpy = spyOn(authService, 'getPasscode').mockImplementation(() => Promise.reject(mockError));

        const req = new Request('http://localhost/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ passcode: 'test' }),
            headers: { 'Content-Type': 'application/json' },
        });

        const route = router.match('POST', '/api/auth/login');
        if (!route) {
            throw new Error('Route not found');
        }

        const errSpy = spyOn(console, 'error').mockImplementation(() => {});
        const res = await route.handler(req, {});

        expect(res.status).toBe(401);
        const json = await res.json();
        expect(json.success).toBe(false);
        expect(json.error).toBe('Invalid encrypted data format or wrong key');

        errSpy.mockRestore();
        getPasscodeSpy.mockRestore();
    });
});
