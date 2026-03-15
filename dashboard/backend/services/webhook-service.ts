import { Webhook, type IWebhook } from '../models/webhook.ts';

export interface WebhookPayloadContext {
    projectName: string;
    buildVersion: string;
    buildResult: string;
    buildStatus: string;
    bid: string;
    pid: string;
    caseCount: number;
    casePassedCount: number;
    caseFailedCount: number;
    caseUndeterminedCount: number;
    timestamp: string;
    metadata?: Record<string, string>;
}

class WebhookService {
    async getWebhooksByPid(pid: string) {
        return Webhook.find({ pid }).lean();
    }

    async getWebhookByWid(wid: string) {
        return Webhook.findOne({ wid });
    }

    async createWebhook(data: Partial<IWebhook>) {
        const webhook = new Webhook(data);
        return webhook.save();
    }

    async updateWebhook(wid: string, data: Partial<IWebhook>) {
        return Webhook.findOneAndUpdate({ wid }, { $set: data }, { new: true });
    }

    async deleteWebhook(wid: string) {
        return Webhook.deleteOne({ wid });
    }

    async deleteWebhooksByPid(pid: string) {
        return Webhook.deleteMany({ pid });
    }

    renderTemplate(template: string, context: WebhookPayloadContext): string {
        return template.replace(/\{\{(\w+(?:\.\w+)?)}}/g, (_match, key: string) => {
            if (key.startsWith('meta.') && context.metadata) {
                const metaKey = key.slice(5);
                return metaKey in context.metadata ? context.metadata[metaKey] : _match;
            }
            if (key.startsWith('meta.')) return _match;
            return key in context ? String(context[key as keyof WebhookPayloadContext]) : '';
        });
    }

    async sendWebhook(
        webhook: IWebhook,
        context: WebhookPayloadContext,
    ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
        try {
            const renderedPayload = this.renderTemplate(webhook.payloadTemplate, context);

            const headers: Record<string, string> = {};
            if (webhook.headers) {
                const headersObj = (webhook.headers instanceof Map ? Object.fromEntries(webhook.headers) : webhook.headers) as Record<
                    string,
                    string
                >;
                for (const [key, value] of Object.entries(headersObj)) {
                    headers[key] = this.renderTemplate(value, context);
                }
            }

            let url = webhook.url;
            let body: string | undefined;

            if (webhook.method === 'POST') {
                if (webhook.contentType === 'json') {
                    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
                    body = renderedPayload;
                } else {
                    const params = JSON.parse(renderedPayload) as Record<string, string>;
                    const queryString = new URLSearchParams(params).toString();
                    url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
                }
            } else {
                const params = JSON.parse(renderedPayload) as Record<string, string>;
                const queryString = new URLSearchParams(params).toString();
                url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
            }

            const response = await fetch(url, {
                method: webhook.method,
                headers,
                body: webhook.method === 'POST' && webhook.contentType === 'json' ? body : undefined,
                signal: AbortSignal.timeout(10000),
            });

            return { success: response.ok, statusCode: response.status };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`Webhook delivery failed for wid=${webhook.wid}: ${message}`);
            return { success: false, error: message };
        }
    }

    async sendWebhooksForBuild(context: WebhookPayloadContext): Promise<void> {
        const webhooks = await this.getWebhooksByPid(context.pid);
        if (!webhooks || webhooks.length === 0) return;

        for (const webhook of webhooks) {
            if (!webhook.enabled) continue;

            const shouldSend =
                webhook.condition === 'always' ||
                (webhook.condition === 'success' && context.buildResult === 'passed') ||
                (webhook.condition === 'fail' && (context.buildResult === 'failed' || context.buildResult === 'undetermined'));

            if (!shouldSend) continue;

            const result = await this.sendWebhook(webhook, context);
            console.log(
                `Webhook [${webhook.name}] (wid=${webhook.wid}) -> ${result.success ? 'OK' : 'FAILED'} ` +
                    `(status=${result.statusCode || 'N/A'}${result.error ? `, error=${result.error}` : ''})`,
            );
        }
    }
}

export const webhookService = new WebhookService();
