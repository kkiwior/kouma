import jwt from 'jsonwebtoken';
import { authMode, microsoftOAuth, googleOAuth, oauthAccessPolicy, getOAuthRedirectUri } from '../config/auth.config.ts';
import { activityLogService } from '../services/activity-log-service.ts';
import { authService } from '../services/auth-service.ts';
import {
    parseCookies,
    parseJsonBody,
    jsonResponse,
    unauthorized,
    badRequest,
    internalServerError,
    setCookieHeader,
    clearCookieHeader,
    redirectResponse,
} from '../src/helpers.ts';
import { Router } from '../src/router.ts';
import { expireTime, authKey, credential, decryptPasscode } from '../utils/auth-utils';
import { logger } from '../utils/logger.ts';
import { evaluateOAuthAccess, type OAuthProfile } from '../utils/oauth-access-policy.ts';
import { verifyJwt, requireApiAuth, safeErrorMessage, getUserFromRequest } from '../utils/server-utils.ts';

function issueAuthCookie(email?: string): { token: string; cookieHeader: string } {
    const payload: Record<string, string> = { user: 'authenticated' };
    if (email) payload.email = email;
    const token = jwt.sign(payload, credential.accessTokenSecret, { expiresIn: expireTime });
    const cookieHeader = setCookieHeader(authKey as string, token, { httpOnly: true, sameSite: 'Lax' });
    return { token, cookieHeader };
}

export function registerAuthRoutes(router: Router) {
    /**
     * @swagger
     * /api/auth/config:
     *   get:
     *     tags: [Auth]
     *     description: Get authentication configuration (mode, available providers)
     *     responses:
     *       200:
     *         description: Returns auth configuration
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 authMode:
     *                   type: string
     *                   enum: [none, passcode, microsoft, google]
     */
    router.get('/api/auth/config', async () => {
        return jsonResponse({ authMode });
    });

    /**
     * @swagger
     * /api/auth/check:
     *   get:
     *     tags: [Auth]
     *     description: Check authentication status
     *     responses:
     *       200:
     *         description: Returns success status
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     */
    router.get('/api/auth/check', async (req) => {
        if (authMode === 'none') {
            return jsonResponse({ success: true });
        }
        const cookies = parseCookies(req);
        const token = cookies[authKey as string] as string | undefined;
        if (token && verifyJwt(token)) {
            return jsonResponse({ success: true });
        }
        return jsonResponse({ success: false });
    });

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     tags: [Auth]
     *     description: Login to the dashboard with passcode
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               passcode:
     *                 type: string
     *     responses:
     *       200:
     *         description: Login response
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 redirect:
     *                   type: string
     *                 initialized:
     *                   type: boolean
     *                 passcode:
     *                   type: string
     *       401:
     *         description: Unauthorized
     */
    router.post('/api/auth/login', async (req) => {
        if (authMode === 'none') {
            const { cookieHeader } = issueAuthCookie();
            return jsonResponse({ success: true, redirect: '/' }, 200, { 'Set-Cookie': cookieHeader });
        }

        if (authMode !== 'passcode') {
            return badRequest({ success: false, error: `Login via passcode is not available. Auth mode: ${authMode}` });
        }

        try {
            const body = await parseJsonBody(req);
            const passcode = body.passcode as string;
            const storedPasscode = await authService.getPasscode();
            if (!storedPasscode) {
                const newPasscode = await authService.initializeAuth();
                return jsonResponse({ success: false, initialized: false, passcode: newPasscode });
            }

            let isValid = passcode === storedPasscode;

            if (!isValid) {
                try {
                    const decryptedPasscode = decryptPasscode(passcode, storedPasscode);
                    isValid = decryptedPasscode === storedPasscode;
                } catch {
                    isValid = false;
                }
            }

            if (!isValid) {
                return unauthorized({ success: false, error: 'Invalid passcode' });
            }

            const { cookieHeader } = issueAuthCookie();
            await activityLogService.log('', 'user_login', '', 'auth', '', 'User logged in via passcode');
            return jsonResponse({ success: true, redirect: '/' }, 200, { 'Set-Cookie': cookieHeader });
        } catch (error) {
            logger.error(error);
            if (error instanceof Error && error.message === 'Invalid encrypted data format or wrong key') {
                return unauthorized({ success: false, error: 'Invalid encrypted data format or wrong key' });
            }
            return internalServerError({ message: safeErrorMessage(error) });
        }
    });

    /**
     * @swagger
     * /api/auth/oauth/login:
     *   get:
     *     tags: [Auth]
     *     description: Redirect to OAuth provider for login
     *     parameters:
     *       - in: query
     *         name: provider
     *         schema:
     *           type: string
     *           enum: [microsoft, google]
     *     responses:
     *       302:
     *         description: Redirect to OAuth provider
     */
    router.get('/api/auth/oauth/login', async (req) => {
        const url = new URL(req.url);
        const provider = url.searchParams.get('provider') || authMode;

        if (provider !== 'microsoft' && provider !== 'google') {
            return badRequest({ error: 'Invalid OAuth provider' });
        }

        if (authMode !== provider) {
            return badRequest({ error: `OAuth provider '${provider}' is not enabled. Current auth mode: ${authMode}` });
        }

        const redirectUri = getOAuthRedirectUri(req, provider);
        const state = crypto.randomUUID();

        let authorizeUrl: string;

        if (provider === 'microsoft') {
            const params = new URLSearchParams({
                client_id: microsoftOAuth.clientId,
                response_type: 'code',
                redirect_uri: redirectUri,
                scope: microsoftOAuth.scope,
                response_mode: 'query',
                state,
            });
            authorizeUrl = `${microsoftOAuth.authorizeUrl}?${params.toString()}`;
        } else {
            const params = new URLSearchParams({
                client_id: googleOAuth.clientId,
                response_type: 'code',
                redirect_uri: redirectUri,
                scope: googleOAuth.scope,
                access_type: 'offline',
                state,
            });
            authorizeUrl = `${googleOAuth.authorizeUrl}?${params.toString()}`;
        }

        return redirectResponse(authorizeUrl);
    });

    /**
     * @swagger
     * /api/auth/oauth/callback:
     *   get:
     *     tags: [Auth]
     *     description: OAuth callback endpoint
     *     parameters:
     *       - in: query
     *         name: code
     *         schema:
     *           type: string
     *       - in: query
     *         name: provider
     *         schema:
     *           type: string
     *           enum: [microsoft, google]
     *     responses:
     *       302:
     *         description: |
     *           Redirect to dashboard on success. When the account is rejected by the OAuth access policy the user is
     *           redirected to `/login?error=<reason>` where reason is one of `domain_not_allowed`, `email_not_allowed`,
     *           `email_not_verified` or `invalid_email`.
     */
    router.get('/api/auth/oauth/callback', async (req) => {
        const url = new URL(req.url);
        const code = url.searchParams.get('code');
        const provider = url.searchParams.get('provider') || authMode;
        const errorParam = url.searchParams.get('error');

        if (errorParam) {
            const errorDesc = url.searchParams.get('error_description') || errorParam;
            logger.warn(`OAuth error: ${errorDesc}`);
            return redirectResponse(`/login?error=${encodeURIComponent(errorDesc)}`);
        }

        if (!code) {
            return redirectResponse('/login?error=missing_code');
        }

        if (provider !== 'microsoft' && provider !== 'google') {
            return redirectResponse('/login?error=invalid_provider');
        }

        try {
            const redirectUri = getOAuthRedirectUri(req, provider);
            const profile = await fetchOAuthProfile(provider, code, redirectUri);

            const decision = evaluateOAuthAccess(profile, oauthAccessPolicy);
            if (!decision.allowed) {
                logger.warn(`OAuth: sign-in denied for ${profile.email} via ${provider} (${decision.reason})`);
                return redirectResponse(`/login?error=${decision.reason}`);
            }

            const { cookieHeader } = issueAuthCookie(profile.email);
            await activityLogService.log('', 'user_login', profile.email, 'auth', '', `User logged in via OAuth (${provider})`);
            return redirectResponse('/', 302, cookieHeader);
        } catch (error) {
            logger.error('OAuth callback error:', error);
            return redirectResponse('/login?error=oauth_failed');
        }
    });

    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     tags: [Auth]
     *     description: Logout from the dashboard
     *     responses:
     *       200:
     *         description: Logout success
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     */
    router.post('/api/auth/logout', async (req) => {
        if (authMode !== 'none') {
            const authErr = requireApiAuth(req);
            if (authErr) return authErr;
        }
        await activityLogService.log('', 'user_logout', getUserFromRequest(req), 'auth', '', 'User logged out');
        return jsonResponse({ success: true }, 200, { 'Set-Cookie': clearCookieHeader(authKey as string) });
    });
}

async function fetchOAuthProfile(provider: 'microsoft' | 'google', code: string, redirectUri: string): Promise<OAuthProfile> {
    let tokenUrl: string;
    let tokenBody: URLSearchParams;
    let userInfoUrl: string;

    if (provider === 'microsoft') {
        tokenUrl = microsoftOAuth.tokenUrl;
        tokenBody = new URLSearchParams({
            client_id: microsoftOAuth.clientId,
            client_secret: microsoftOAuth.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
            scope: microsoftOAuth.scope,
        });
        userInfoUrl = microsoftOAuth.userInfoUrl;
    } else {
        tokenUrl = googleOAuth.tokenUrl;
        tokenBody = new URLSearchParams({
            client_id: googleOAuth.clientId,
            client_secret: googleOAuth.clientSecret,
            code,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
        });
        userInfoUrl = googleOAuth.userInfoUrl;
    }

    const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        throw new Error(`Token exchange failed (${tokenRes.status}): ${errBody}`);
    }

    const tokenData = (await tokenRes.json()) as Record<string, unknown>;
    const accessToken = typeof tokenData.access_token === 'string' ? tokenData.access_token : '';

    if (!accessToken) {
        throw new Error('No access_token in token response');
    }

    const userRes = await fetch(userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

    if (!userRes.ok) {
        throw new Error(`User info fetch failed (${userRes.status})`);
    }

    const userInfo = (await userRes.json()) as Record<string, unknown>;
    const email =
        (typeof userInfo.email === 'string' && userInfo.email) ||
        (typeof userInfo.mail === 'string' && userInfo.mail) ||
        (typeof userInfo.userPrincipalName === 'string' && userInfo.userPrincipalName);

    if (!email) {
        throw new Error('No email found in OAuth user info');
    }

    return { email: email.trim().toLowerCase(), emailVerified: isEmailVerified(provider, userInfo) };
}

function isEmailVerified(provider: 'microsoft' | 'google', userInfo: Record<string, unknown>): boolean {
    if (provider === 'google') {
        // Google returns a boolean from the userinfo endpoint, but some proxies serialize it as a string.
        return userInfo.email_verified === true || userInfo.email_verified === 'true';
    }
    // Microsoft Graph does not expose a verification flag; addresses are managed by the tenant.
    return true;
}
