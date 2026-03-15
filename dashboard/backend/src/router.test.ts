import { describe, it, expect } from 'bun:test';
import { Router } from './router';

describe('Router', () => {
    describe('addRoute and match', () => {
        it('should match a simple GET route', () => {
            const router = new Router();
            const handler = async () => new Response('ok');
            router.get('/api/test', handler);

            const result = router.match('GET', '/api/test');
            expect(result).not.toBeNull();
            expect(result!.handler).toBe(handler);
            expect(result!.params).toEqual({});
        });

        it('should match a POST route', () => {
            const router = new Router();
            const handler = async () => new Response('ok');
            router.post('/api/create', handler);

            const result = router.match('POST', '/api/create');
            expect(result).not.toBeNull();
            expect(result!.handler).toBe(handler);
        });

        it('should match a PUT route', () => {
            const router = new Router();
            const handler = async () => new Response('ok');
            router.put('/api/update', handler);

            const result = router.match('PUT', '/api/update');
            expect(result).not.toBeNull();
        });

        it('should match a DELETE route', () => {
            const router = new Router();
            const handler = async () => new Response('ok');
            router.delete('/api/remove', handler);

            const result = router.match('DELETE', '/api/remove');
            expect(result).not.toBeNull();
        });

        it('should return null for non-matching path', () => {
            const router = new Router();
            router.get('/api/test', async () => new Response('ok'));

            const result = router.match('GET', '/api/other');
            expect(result).toBeNull();
        });

        it('should return null for non-matching method', () => {
            const router = new Router();
            router.get('/api/test', async () => new Response('ok'));

            const result = router.match('POST', '/api/test');
            expect(result).toBeNull();
        });
    });

    describe('route parameters', () => {
        it('should extract a single parameter', () => {
            const router = new Router();
            router.get('/api/project/:pid', async () => new Response('ok'));

            const result = router.match('GET', '/api/project/PID123');
            expect(result).not.toBeNull();
            expect(result!.params).toEqual({ pid: 'PID123' });
        });

        it('should extract multiple parameters', () => {
            const router = new Router();
            router.get('/api/project/:pid/build/:bid', async () => new Response('ok'));

            const result = router.match('GET', '/api/project/PID1/build/BID2');
            expect(result).not.toBeNull();
            expect(result!.params).toEqual({ pid: 'PID1', bid: 'BID2' });
        });

        it('should not match partial paths', () => {
            const router = new Router();
            router.get('/api/project/:pid', async () => new Response('ok'));

            const result = router.match('GET', '/api/project/PID1/extra');
            expect(result).toBeNull();
        });

        it('should not match shorter paths', () => {
            const router = new Router();
            router.get('/api/project/:pid/build', async () => new Response('ok'));

            const result = router.match('GET', '/api/project/PID1');
            expect(result).toBeNull();
        });
    });

    describe('multiple routes', () => {
        it('should match the correct route among many', () => {
            const router = new Router();
            const handler1 = async () => new Response('1');
            const handler2 = async () => new Response('2');
            const handler3 = async () => new Response('3');

            router.get('/api/a', handler1);
            router.get('/api/b', handler2);
            router.post('/api/a', handler3);

            expect(router.match('GET', '/api/a')!.handler).toBe(handler1);
            expect(router.match('GET', '/api/b')!.handler).toBe(handler2);
            expect(router.match('POST', '/api/a')!.handler).toBe(handler3);
        });

        it('should return the first matching route when multiple match', () => {
            const router = new Router();
            const handler1 = async () => new Response('first');
            const handler2 = async () => new Response('second');

            router.get('/api/:anything', handler1);
            router.get('/api/specific', handler2);

            const result = router.match('GET', '/api/specific');
            expect(result!.handler).toBe(handler1);
        });
    });

    describe('edge cases', () => {
        it('should handle root path', () => {
            const router = new Router();
            router.get('/', async () => new Response('root'));

            const result = router.match('GET', '/');
            expect(result).not.toBeNull();
        });

        it('should return null for empty router', () => {
            const router = new Router();
            expect(router.match('GET', '/anything')).toBeNull();
        });

        it('should handle parameters with special characters in values', () => {
            const router = new Router();
            router.get('/api/:id', async () => new Response('ok'));

            const result = router.match('GET', '/api/abc123-def_456');
            expect(result).not.toBeNull();
            expect(result!.params.id).toBe('abc123-def_456');
        });
    });
});
