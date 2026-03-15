import { describe, it, expect } from 'bun:test';
import { routes } from '@/router/routes';
import type { RouteRecordRaw } from 'vue-router';

function collectRouteNames(routeList: RouteRecordRaw[]): string[] {
    const names: string[] = [];
    for (const r of routeList) {
        if (r.name) names.push(r.name as string);
        if ('children' in r && r.children) names.push(...collectRouteNames(r.children));
    }
    return names;
}

function findRoute(routeList: RouteRecordRaw[], name: string): RouteRecordRaw | undefined {
    for (const r of routeList) {
        if (r.name === name) return r;
        if ('children' in r && r.children) {
            const found = findRoute(r.children, name);
            if (found) return found;
        }
    }
    return undefined;
}

describe('Router', () => {
    it('has all expected routes', () => {
        const routeNames = collectRouteNames(routes);

        expect(routeNames).toContain('dashboard');
        expect(routeNames).toContain('project');
        expect(routeNames).toContain('project-page');
        expect(routeNames).toContain('build');
        expect(routeNames).toContain('case');
        expect(routeNames).toContain('login');
        expect(routeNames).toContain('initialize');
        expect(routeNames).toContain('not-found');
    });

    it('dashboard route path is correct', () => {
        const dashboardRoute = findRoute(routes, 'dashboard');
        expect(dashboardRoute?.path).toBe('');
    });

    it('login route path is correct', () => {
        const loginRoute = findRoute(routes, 'login');
        expect(loginRoute?.path).toBe('/login');
    });

    it('project route has pid param', () => {
        const projectRoute = findRoute(routes, 'project');
        expect(projectRoute?.path).toContain(':pid');
    });

    it('build route has bid param', () => {
        const buildRoute = findRoute(routes, 'build');
        expect(buildRoute?.path).toContain(':bid');
    });

    it('case route has cid param', () => {
        const caseRoute = findRoute(routes, 'case');
        expect(caseRoute?.path).toContain(':cid');
    });
});
