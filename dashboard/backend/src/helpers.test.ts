import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'path';
import {
    parseCookies,
    setCookieHeader,
    clearCookieHeader,
    parseJsonBody,
    parseMultipartFiles,
    jsonResponse,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    internalServerError,
    htmlResponse,
    redirectResponse,
    getMimeType,
    serveStatic,
    logRequest,
} from './helpers';

describe('helpers', () => {
    describe('parseCookies', () => {
        it('should parse a single cookie', () => {
            const req = new Request('http://localhost', { headers: { cookie: 'name=value' } });
            const cookies = parseCookies(req);
            expect(cookies).toEqual({ name: 'value' });
        });

        it('should parse multiple cookies', () => {
            const req = new Request('http://localhost', { headers: { cookie: 'a=1; b=2; c=3' } });
            const cookies = parseCookies(req);
            expect(cookies).toEqual({ a: '1', b: '2', c: '3' });
        });

        it('should return empty object when no cookies', () => {
            const req = new Request('http://localhost');
            const cookies = parseCookies(req);
            expect(cookies).toEqual({});
        });

        it('should handle cookies with = in value', () => {
            const req = new Request('http://localhost', { headers: { cookie: 'token=abc=def=ghi' } });
            const cookies = parseCookies(req);
            expect(cookies.token).toBe('abc=def=ghi');
        });

        it('should handle URL-encoded cookie values', () => {
            const req = new Request('http://localhost', { headers: { cookie: 'name=hello%20world' } });
            const cookies = parseCookies(req);
            expect(cookies.name).toBe('hello world');
        });

        it('should trim whitespace from keys', () => {
            const req = new Request('http://localhost', { headers: { cookie: ' key = value ' } });
            const cookies = parseCookies(req);
            expect(cookies.key).toBe('value');
        });
    });

    describe('setCookieHeader', () => {
        it('should create basic cookie header', () => {
            const header = setCookieHeader('name', 'value');
            expect(header).toContain('name=value');
            expect(header).toContain('Path=/');
        });

        it('should include HttpOnly flag', () => {
            const header = setCookieHeader('name', 'value', { httpOnly: true });
            expect(header).toContain('HttpOnly');
        });

        it('should include SameSite', () => {
            const header = setCookieHeader('name', 'value', { sameSite: 'Strict' });
            expect(header).toContain('SameSite=Strict');
        });

        it('should include Max-Age', () => {
            const header = setCookieHeader('name', 'value', { maxAge: 3600 });
            expect(header).toContain('Max-Age=3600');
        });

        it('should include custom path', () => {
            const header = setCookieHeader('name', 'value', { path: '/api' });
            expect(header).toContain('Path=/api');
        });

        it('should URL-encode the value', () => {
            const header = setCookieHeader('name', 'hello world');
            expect(header).toContain('name=hello%20world');
        });

        it('should include Max-Age=0', () => {
            const header = setCookieHeader('name', 'value', { maxAge: 0 });
            expect(header).toContain('Max-Age=0');
        });
    });

    describe('clearCookieHeader', () => {
        it('should create a clearing cookie header', () => {
            const header = clearCookieHeader('session');
            expect(header).toBe('session=; Path=/; Max-Age=0');
        });
    });

    describe('parseJsonBody', () => {
        it('should parse valid JSON body', async () => {
            const req = new Request('http://localhost', {
                method: 'POST',
                body: JSON.stringify({ key: 'value' }),
                headers: { 'content-type': 'application/json' },
            });
            const result = await parseJsonBody(req);
            expect(result).toEqual({ key: 'value' });
        });

        it('should return empty object for invalid JSON', async () => {
            const req = new Request('http://localhost', { method: 'POST', body: 'not json' });
            const result = await parseJsonBody(req);
            expect(result).toEqual({});
        });

        it('should return empty object for empty body', async () => {
            const req = new Request('http://localhost');
            const result = await parseJsonBody(req);
            expect(result).toEqual({});
        });
    });

    describe('jsonResponse', () => {
        it('should create JSON response with default 200 status', async () => {
            const resp = jsonResponse({ message: 'ok' });
            expect(resp.status).toBe(200);
            expect(resp.headers.get('content-type')).toBe('application/json');

            const body = await resp.json();
            expect(body).toEqual({ message: 'ok' });
        });

        it('should use custom status code', () => {
            const resp = jsonResponse({ error: 'not found' }, 404);
            expect(resp.status).toBe(404);
        });

        it('should include extra headers', () => {
            const resp = jsonResponse({}, 200, { 'X-Custom': 'test' });
            expect(resp.headers.get('X-Custom')).toBe('test');
        });
    });

    describe('badRequest', () => {
        it('should return 400 status', () => {
            const resp = badRequest({ error: 'bad' });
            expect(resp.status).toBe(400);
        });
    });

    describe('unauthorized', () => {
        it('should return 401 status', () => {
            const resp = unauthorized({ error: 'auth' });
            expect(resp.status).toBe(401);
        });
    });

    describe('forbidden', () => {
        it('should return 403 status', () => {
            const resp = forbidden({ error: 'forbidden' });
            expect(resp.status).toBe(403);
        });
    });

    describe('notFound', () => {
        it('should return 404 status', () => {
            const resp = notFound({ error: 'not found' });
            expect(resp.status).toBe(404);
        });
    });

    describe('internalServerError', () => {
        it('should return 500 status', () => {
            const resp = internalServerError({ error: 'server error' });
            expect(resp.status).toBe(500);
        });
    });

    describe('htmlResponse', () => {
        it('should create HTML response with default 200', async () => {
            const resp = htmlResponse('<h1>Hello</h1>');
            expect(resp.status).toBe(200);
            expect(resp.headers.get('content-type')).toBe('text/html; charset=utf-8');

            const text = await resp.text();
            expect(text).toBe('<h1>Hello</h1>');
        });

        it('should use custom status', () => {
            const resp = htmlResponse('<p>Error</p>', 500);
            expect(resp.status).toBe(500);
        });
    });

    describe('redirectResponse', () => {
        it('should create redirect with 302 by default', () => {
            const resp = redirectResponse('/new-location');
            expect(resp.status).toBe(302);
            expect(resp.headers.get('location')).toBe('/new-location');
        });

        it('should use custom status (301)', () => {
            const resp = redirectResponse('/new', 301);
            expect(resp.status).toBe(301);
        });
    });

    describe('getMimeType', () => {
        const cases = [
            { ext: '.html', mime: 'text/html' },
            { ext: '.css', mime: 'text/css' },
            { ext: '.js', mime: 'application/javascript' },
            { ext: '.json', mime: 'application/json' },
            { ext: '.png', mime: 'image/png' },
            { ext: '.jpg', mime: 'image/jpeg' },
            { ext: '.jpeg', mime: 'image/jpeg' },
            { ext: '.gif', mime: 'image/gif' },
            { ext: '.svg', mime: 'image/svg+xml' },
            { ext: '.ico', mime: 'image/x-icon' },
            { ext: '.webp', mime: 'image/webp' },
            { ext: '.woff', mime: 'font/woff' },
            { ext: '.woff2', mime: 'font/woff2' },
            { ext: '.ttf', mime: 'font/ttf' },
            { ext: '.otf', mime: 'font/otf' },
            { ext: '.map', mime: 'application/json' },
            { ext: '.mp4', mime: 'video/mp4' },
            { ext: '.webm', mime: 'video/webm' },
        ];

        for (const { ext, mime } of cases) {
            it(`should return '${mime}' for '${ext}'`, () => {
                expect(getMimeType(`file${ext}`)).toBe(mime);
            });
        }

        it("should return 'application/octet-stream' for unknown extensions", () => {
            expect(getMimeType('file.xyz')).toBe('application/octet-stream');
        });

        it('should handle uppercase extensions', () => {
            expect(getMimeType('FILE.HTML')).toBe('text/html');
        });
    });

    describe('logRequest', () => {
        it('should not throw when logging', () => {
            expect(() => logRequest('GET', '/api/test', 200, Date.now() - 50)).not.toThrow();
        });
    });

    describe('parseMultipartFiles', () => {
        it('should return empty object for non-multipart request', async () => {
            const req = new Request('http://localhost', { method: 'POST', body: 'plain text' });
            const files = await parseMultipartFiles(req);
            expect(files).toEqual({});
        });

        it('should parse multipart file uploads', async () => {
            const formData = new FormData();
            const blob = new Blob(['file content'], { type: 'image/png' });
            formData.append('image', blob, 'test.png');

            const req = new Request('http://localhost', { method: 'POST', body: formData });
            const files = await parseMultipartFiles(req);
            expect(files).toHaveProperty('image');
            expect(files.image.name).toBe('test.png');
            expect(files.image.data).toBeInstanceOf(Buffer);
        });

        it('should handle formData with non-file entries', async () => {
            const formData = new FormData();
            formData.append('field', 'value');

            const req = new Request('http://localhost', { method: 'POST', body: formData });
            const files = await parseMultipartFiles(req);
            expect(Object.keys(files).length).toBe(0);
        });
    });

    describe('serveStatic', () => {
        const STATIC_DIR = '/tmp/micoo-serve-static-test';

        beforeEach(() => {
            rmSync(STATIC_DIR, { recursive: true, force: true });
            mkdirSync(STATIC_DIR, { recursive: true });
        });

        afterEach(() => {
            rmSync(STATIC_DIR, { recursive: true, force: true });
        });

        it('should serve an existing file', async () => {
            writeFileSync(path.join(STATIC_DIR, 'test.html'), '<h1>Hello</h1>');
            const resp = await serveStatic(STATIC_DIR, 'test.html');
            expect(resp).not.toBeNull();
            expect(resp!.status).toBe(200);
            expect(resp!.headers.get('content-type')).toBe('text/html');
        });

        it('should return null for non-existing file', async () => {
            const resp = await serveStatic(STATIC_DIR, 'nonexistent.html');
            expect(resp).toBeNull();
        });

        it('should return 403 for path traversal attempts', async () => {
            const resp = await serveStatic(STATIC_DIR, '../../etc/passwd');
            if (resp) {
                expect(resp.status).toBe(403);
            }
        });

        it('should serve file with correct mime type', async () => {
            writeFileSync(path.join(STATIC_DIR, 'style.css'), 'body{}');
            const resp = await serveStatic(STATIC_DIR, 'style.css');
            expect(resp).not.toBeNull();
            expect(resp!.headers.get('content-type')).toBe('text/css');
        });
    });
});
