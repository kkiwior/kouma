import path from 'path';
import { logger } from '../utils/logger.ts';

export function parseCookies(req: Request): Record<string, string> {
    const header = req.headers.get('cookie') || '';
    const cookies: Record<string, string> = {};
    for (const part of header.split(';')) {
        const [key, ...rest] = part.split('=');
        if (key) {
            cookies[key.trim()] = decodeURIComponent(rest.join('=').trim());
        }
    }
    return cookies;
}

export function setCookieHeader(
    name: string,
    value: string,
    options: { httpOnly?: boolean; sameSite?: string; path?: string; maxAge?: number } = {},
): string {
    let cookie = `${name}=${encodeURIComponent(value)}`;
    if (options.httpOnly) cookie += '; HttpOnly';
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
    cookie += `; Path=${options.path ?? '/'}`;
    if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
    return cookie;
}

export function clearCookieHeader(name: string): string {
    return `${name}=; Path=/; Max-Age=0`;
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown>> {
    try {
        return (await req.json()) as Record<string, unknown>;
    } catch {
        return {};
    }
}

export interface UploadedFile {
    name: string;
    data: Buffer;
    mv(filepath: string): Promise<void>;
}

export async function parseMultipartFiles(req: Request): Promise<Record<string, UploadedFile>> {
    const files: Record<string, UploadedFile> = {};
    try {
        const formData = await req.formData();
        for (const [key, value] of formData.entries()) {
            if (typeof value === 'object' && 'name' in value && 'arrayBuffer' in value) {
                const fileEntry = value as unknown as { name: string; arrayBuffer(): Promise<ArrayBuffer> };
                const arrayBuffer = await fileEntry.arrayBuffer();
                const data = Buffer.from(arrayBuffer);
                files[key] = {
                    name: fileEntry.name,
                    data,
                    async mv(filepath: string) {
                        await Bun.write(filepath, data);
                    },
                };
            }
        }
    } catch {}
    return files;
}

export function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...extraHeaders } });
}

export function badRequest(data: unknown, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse(data, 400, extraHeaders);
}

export function unauthorized(data: unknown, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse(data, 401, extraHeaders);
}

export function forbidden(data: unknown, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse(data, 403, extraHeaders);
}

export function notFound(data: unknown, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse(data, 404, extraHeaders);
}

export function internalServerError(data: unknown, extraHeaders: Record<string, string> = {}): Response {
    return jsonResponse(data, 500, extraHeaders);
}

export function htmlResponse(html: string, status = 200, extraHeaders: Record<string, string> = {}): Response {
    return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...extraHeaders } });
}

export function redirectResponse(location: string, status = 302, setCookie?: string): Response {
    const headers: Record<string, string> = { Location: location };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(null, { status, headers });
}

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontopen',
    '.otf': 'font/otf',
    '.map': 'application/json',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
};

export function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

export async function serveStatic(basePath: string, urlPath: string): Promise<Response | null> {
    const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const filePath = path.join(basePath, safePath);

    if (!filePath.startsWith(basePath)) {
        return new Response('Forbidden', { status: 403 });
    }

    const file = Bun.file(filePath);
    if (await file.exists()) {
        return new Response(file, { headers: { 'Content-Type': getMimeType(filePath) } });
    }
    return null;
}

export function logRequest(method: string, url: string, status: number, startTime: number): void {
    const duration = Date.now() - startTime;
    logger.info(`${method} ${url} ${status} ${duration}ms`);
}
