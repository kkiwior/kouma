import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';
import type { AuthConfig } from '@/types';

export { routes } from './routes';

const router = createRouter({ history: createWebHistory(), routes });

let cachedAuthConfig: AuthConfig | null = null;

async function fetchAuthConfig(): Promise<AuthConfig> {
    if (cachedAuthConfig) return cachedAuthConfig;
    try {
        const response = await fetch('/api/auth/config', { credentials: 'include' });
        if (!response.ok) throw new Error('Network error');
        const data = (await response.json()) as AuthConfig;
        cachedAuthConfig = data;
        return data;
    } catch {
        return { authMode: 'passcode' };
    }
}

export function getAuthConfig(): AuthConfig | null {
    return cachedAuthConfig;
}

router.beforeEach(async (to) => {
    const config = await fetchAuthConfig();

    if (config.authMode === 'none') {
        if (to.name === 'login' || to.name === 'initialize') {
            return { name: 'dashboard' };
        }
        return true;
    }

    return true;
});

export default router;
