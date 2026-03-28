import path from 'path';
import swaggerJSDoc from 'swagger-jsdoc';
import { exchangeRootDir, engineUrl } from './config/env.config.ts';
import { registerActivityLogRoutes } from './controllers/activity-log.controller.ts';
import { registerAdminRoutes } from './controllers/admin.controller.ts';
import { registerAnalyticsRoutes } from './controllers/analytics.controller.ts';
import { registerAuthRoutes } from './controllers/auth.controller.ts';
import { registerBuildRoutes } from './controllers/build.controller.ts';
import { registerCaseRoutes } from './controllers/case.controller.ts';
import { registerDashboardRoutes } from './controllers/dashboard.controller.ts';
import { registerProjectRoutes } from './controllers/project.controller.ts';
import { registerStatsRoutes } from './controllers/stats.controller.ts';
import { registerWebhookRoutes } from './controllers/webhook.controller.ts';
import { retentionService } from './services/retention-service.ts';
import { jsonResponse, notFound, internalServerError, htmlResponse, serveStatic, logRequest } from './src/helpers.ts';
import { Router } from './src/router.ts';
import { connect } from './utils/database-utils.ts';
import { getEnv } from './utils/env-utils.js';
import { logger } from './utils/logger.ts';

const PORT = Number(getEnv('PORT', '3001'));
const PUBLIC_DIR = path.join(import.meta.dir, '..', 'public');
const VUE_APP_DIR = path.join(PUBLIC_DIR, 'vue-app');
const EXCHANGE_DIR = exchangeRootDir;

const swaggerSpec = swaggerJSDoc({
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Kouma service API doc',
            version: '1.0.0',
            description: 'This doc describes the APIs exposed to Kouma clients (fork of Micoo)',
        },
    },
    apis: ['./backend/controllers/*.ts', './backend/swagger/*.ts'],
});

const router = new Router();

registerAuthRoutes(router);
registerDashboardRoutes(router);
registerProjectRoutes(router);
registerAdminRoutes(router);
registerBuildRoutes(router);
registerCaseRoutes(router);
registerStatsRoutes(router);
registerWebhookRoutes(router);
registerAnalyticsRoutes(router);
registerActivityLogRoutes(router);

async function handleRequest(req: Request): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    let response: Response;

    try {
        if (pathname === '/docs' || pathname === '/docs/') {
            const swaggerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Micoo API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>SwaggerUIBundle({ url: '/docs/swagger.json', dom_id: '#swagger-ui' });</script>
</body>
</html>`;
            response = htmlResponse(swaggerHtml);
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        if (pathname === '/docs/swagger.json') {
            response = jsonResponse(swaggerSpec);
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        if (pathname === '/favicon.ico') {
            const faviconResp = await serveStatic(PUBLIC_DIR, 'image/favicon.ico');
            response = faviconResp || new Response('Not Found', { status: 404 });
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        if (pathname.startsWith('/public/')) {
            const filePath = pathname.replace(/^\/public/, '');
            const staticResp = await serveStatic(PUBLIC_DIR, filePath);
            response = staticResp || new Response('Not Found', { status: 404 });
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        if (pathname.startsWith('/file-server/')) {
            const staticResp = await serveStatic(EXCHANGE_DIR, pathname);
            if (staticResp) {
                const headers = new Headers(staticResp.headers);
                headers.set('Access-Control-Allow-Origin', '*');
                headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
                headers.set('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
                response = new Response(staticResp.body, { status: staticResp.status, headers });
            } else {
                response = new Response('Not Found', { status: 404 });
            }
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        if (engineUrl && (pathname.startsWith('/slave/') || pathname === '/echo')) {
            const targetUrl = `${engineUrl}${pathname}${url.search}`;
            try {
                const hasBody = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
                const proxyResp = await fetch(targetUrl, {
                    method: req.method,
                    headers: req.headers,
                    body: hasBody ? req.body : undefined,
                });
                response = new Response(proxyResp.body, {
                    status: proxyResp.status,
                    headers: proxyResp.headers,
                });
            } catch (err) {
                logger.error('Engine proxy error:', err);
                response = internalServerError({ message: 'Engine proxy error' });
            }
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        const matched = router.match(method, pathname);
        if (matched) {
            response = await matched.handler(req, matched.params);
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        const filePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
        const staticResp = await serveStatic(VUE_APP_DIR, filePath);
        if (staticResp) {
            response = staticResp;
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        const indexFile = Bun.file(path.join(VUE_APP_DIR, 'index.html'));
        if (await indexFile.exists()) {
            response = new Response(indexFile, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
            logRequest(method, pathname, response.status, startTime);
            return response;
        }

        response = notFound({ message: 'Not Found' });
    } catch (error) {
        logger.error('Unhandled error:', error);
        response = internalServerError({ message: 'Internal Server Error' });
    }

    logRequest(method, pathname, response.status, startTime);
    return response;
}

await connect();

const RETENTION_INTERVAL_MS = Number(getEnv('RETENTION_INTERVAL_MS', '3600000')); // default: 1 hour

setInterval(async () => {
    try {
        logger.info('Retention worker: starting cleanup cycle');
        await retentionService.applyRetentionForAllProjects();
        logger.info('Retention worker: cleanup cycle completed');
    } catch (error) {
        logger.error('Retention worker: error during cleanup cycle:', error);
    }
}, RETENTION_INTERVAL_MS);

const server = Bun.serve({ port: PORT, fetch: handleRequest });

logger.info(`🚀 Kouma Dashboard running on http://localhost:${server.port}`);
