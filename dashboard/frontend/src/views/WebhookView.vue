<template>
    <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-white border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <nav class="flex items-center gap-2 text-sm text-slate-500 mb-4">
                    <router-link
                        to="/"
                        class="hover:text-slate-700 transition-colors"
                        >Dashboard</router-link
                    >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                    <router-link
                        :to="`/project/${pid}`"
                        class="hover:text-slate-700 transition-colors"
                        >Project</router-link
                    >
                    <svg
                        class="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 5l7 7-7 7"
                        />
                    </svg>
                    <span class="text-slate-900 font-medium">Webhooks</span>
                </nav>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 class="text-2xl font-bold text-slate-900">🔔 Webhooks</h1>
                    <button
                        @click="showCreateForm = true"
                        class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                        + Add Webhook
                    </button>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading -->
            <div
                v-if="loading"
                class="space-y-4"
            >
                <div
                    v-for="i in 3"
                    :key="i"
                    class="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
                >
                    <div class="h-5 bg-slate-200 rounded w-48 mb-3" />
                    <div class="h-4 bg-slate-200 rounded w-96" />
                </div>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="webhooks.length === 0 && !showCreateForm"
                class="text-center py-20"
            >
                <div class="text-5xl mb-4">🔔</div>
                <h3 class="text-lg font-medium text-slate-500">No webhooks configured</h3>
                <p class="text-slate-400 text-sm mt-1">Add a webhook to receive notifications when builds complete.</p>
                <button
                    @click="showCreateForm = true"
                    class="mt-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                    + Add Webhook
                </button>
            </div>

            <!-- Create/Edit Form -->
            <div
                v-if="showCreateForm || editingWebhook"
                class="bg-white rounded-xl border border-slate-200 p-6 mb-6"
            >
                <h2 class="text-lg font-semibold text-slate-900 mb-4">
                    {{ editingWebhook ? 'Edit Webhook' : 'New Webhook' }}
                </h2>
                <form
                    @submit.prevent="saveWebhook"
                    class="space-y-4"
                >
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input
                                v-model="form.name"
                                type="text"
                                placeholder="e.g. Slack Notification"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">URL</label>
                            <input
                                v-model="form.url"
                                type="url"
                                placeholder="https://hooks.slack.com/services/..."
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Method</label>
                            <select
                                v-model="form.method"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="POST">POST</option>
                                <option value="GET">GET</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Content Type</label>
                            <select
                                v-model="form.contentType"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="json">JSON Body</option>
                                <option value="query_params">Query Parameters</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-slate-700 mb-1">Trigger Condition</label>
                            <select
                                v-model="form.condition"
                                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="always">Always</option>
                                <option value="success">On Success</option>
                                <option value="fail">On Failure</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-slate-700 mb-1">Payload Template</label>
                        <textarea
                            v-model="form.payloadTemplate"
                            rows="4"
                            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder='{"text":"Build {{buildVersion}} {{buildResult}} for {{projectName}}"}'
                        />
                        <p class="text-xs text-slate-400 mt-1">
                            Available variables:
                            <code
                                class="text-indigo-500"
                                v-pre
                                >{{ projectName }}, {{ buildVersion }}, {{ buildResult }}, {{ buildStatus }}, {{ bid }}, {{ pid }},
                                {{ caseCount }}, {{ casePassedCount }}, {{ caseFailedCount }}, {{ caseUndeterminedCount }}, {{ timestamp }},
                                {{ meta.KEY }}</code
                            >
                            <br />
                            <span class="text-slate-400"
                                >Use
                                <code
                                    class="text-indigo-500"
                                    v-pre
                                    >{{ meta.KEY }}</code
                                >
                                to access build metadata (e.g.
                                <code
                                    class="text-indigo-500"
                                    v-pre
                                    >{{ meta.branch }}</code
                                >,
                                <code
                                    class="text-indigo-500"
                                    v-pre
                                    >{{ meta.commit }}</code
                                >).</span
                            >
                        </p>
                    </div>

                    <div class="flex items-center gap-2">
                        <input
                            v-model="form.enabled"
                            type="checkbox"
                            id="webhook-enabled"
                            class="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label
                            for="webhook-enabled"
                            class="text-sm text-slate-700"
                            >Enabled</label
                        >
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button
                            type="submit"
                            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                        >
                            {{ editingWebhook ? 'Update' : 'Create' }}
                        </button>
                        <button
                            type="button"
                            @click="cancelForm"
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>

                    <p
                        v-if="error"
                        class="text-red-600 text-sm"
                    >
                        {{ error }}
                    </p>
                </form>
            </div>

            <!-- Webhooks List -->
            <div
                v-if="webhooks.length > 0"
                class="space-y-3"
            >
                <div
                    v-for="webhook in webhooks"
                    :key="webhook.wid"
                    class="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
                >
                    <div class="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 mb-1">
                                <h3 class="font-semibold text-slate-900">{{ webhook.name }}</h3>
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    :class="webhook.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'"
                                >
                                    {{ webhook.enabled ? 'Active' : 'Disabled' }}
                                </span>
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                    {{ webhook.method }}
                                </span>
                                <span
                                    class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                                >
                                    {{ conditionLabel(webhook.condition) }}
                                </span>
                            </div>
                            <p class="text-sm text-slate-500 font-mono truncate">{{ webhook.url }}</p>
                        </div>

                        <div class="flex items-center gap-2 shrink-0">
                            <button
                                @click="testWebhookAction(webhook.wid)"
                                class="px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                                :disabled="testingWid === webhook.wid"
                            >
                                {{ testingWid === webhook.wid ? '⏳ Testing...' : '🧪 Test' }}
                            </button>
                            <button
                                @click="startEdit(webhook)"
                                class="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                                ✏️ Edit
                            </button>
                            <button
                                @click="confirmDelete(webhook)"
                                class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                            >
                                🗑️ Delete
                            </button>
                        </div>
                    </div>

                    <!-- Test Result -->
                    <div
                        v-if="testResults[webhook.wid]"
                        class="mt-3 p-3 rounded-lg text-sm"
                        :class="testResults[webhook.wid].success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
                    >
                        {{ testResults[webhook.wid].success ? '✓' : '✗' }}
                        {{
                            testResults[webhook.wid].success
                                ? `Success (HTTP ${testResults[webhook.wid].statusCode})`
                                : `Failed: ${testResults[webhook.wid].error}`
                        }}
                    </div>
                </div>
            </div>

            <!-- Usage Examples -->
            <div class="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h3 class="text-lg font-semibold text-slate-900 mb-4">📖 Examples</h3>

                <div class="space-y-4">
                    <div>
                        <h4 class="text-sm font-medium text-slate-700 mb-2">Slack Webhook (POST JSON)</h4>
                        <pre
                            class="bg-slate-800 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto"
                            v-pre
                        >
URL: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
Method: POST | Content Type: JSON | Condition: Always
Payload: {"text":"Build {{ buildVersion }} for {{ projectName }}: {{ buildResult }} ({{ casePassedCount }}/{{ caseCount }} passed)"}</pre
                        >
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-slate-700 mb-2">Using Build Metadata</h4>
                        <pre
                            class="bg-slate-800 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto"
                            v-pre
                        >
Payload: {"text":"Build {{ buildVersion }} on branch {{ meta.branch }} (commit {{ meta.commit }}): {{ buildResult }}"}
Metadata is set during build initialization via meta_* query parameters, e.g. ?meta_branch=main&amp;meta_commit=abc1234</pre
                        >
                    </div>

                    <div>
                        <h4 class="text-sm font-medium text-slate-700 mb-2">GET Request with Query Parameters</h4>
                        <pre
                            class="bg-slate-800 text-slate-100 p-4 rounded-lg text-xs overflow-x-auto"
                            v-pre
                        >
URL: https://your-api.com/webhook
Method: GET | Content Type: Query Parameters | Condition: On Failure
Payload: {"status":"{{ buildResult }}","build":"{{ bid }}","project":"{{ projectName }}"}</pre
                        >
                    </div>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <div
            v-if="deletingWebhook"
            class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            @click.self="deletingWebhook = null"
        >
            <div class="bg-white rounded-xl p-6 max-w-md mx-4">
                <h3 class="text-lg font-semibold text-slate-900 mb-2">Delete Webhook</h3>
                <p class="text-sm text-slate-600 mb-4">
                    Are you sure you want to delete <strong>{{ deletingWebhook.name }}</strong
                    >? This action cannot be undone.
                </p>
                <div class="flex gap-3 justify-end">
                    <button
                        @click="deletingWebhook = null"
                        class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        @click="deleteWebhookAction"
                        class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 cursor-pointer"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import type { WebhookConfig, WebhookTestResult } from '@/types';

const route = useRoute();
const pid = route.params.pid as string;

const { loading, error, getWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } = useApi();

const webhooks = ref<WebhookConfig[]>([]);
const showCreateForm = ref(false);
const editingWebhook = ref<WebhookConfig | null>(null);
const deletingWebhook = ref<WebhookConfig | null>(null);
const testingWid = ref<string | null>(null);
const testResults = ref<Record<string, WebhookTestResult>>({});

const defaultPayload = '{"text":"Build {{buildVersion}} for {{projectName}}: {{buildResult}} ({{casePassedCount}}/{{caseCount}} passed)"}';

const form = ref({
    name: '',
    url: '',
    method: 'POST' as 'GET' | 'POST',
    contentType: 'json' as 'json' | 'query_params',
    condition: 'always' as 'always' | 'success' | 'fail',
    payloadTemplate: defaultPayload,
    enabled: true,
});

function conditionLabel(condition: string): string {
    switch (condition) {
        case 'always':
            return 'Always';
        case 'success':
            return 'On Success';
        case 'fail':
            return 'On Failure';
        default:
            return condition;
    }
}

function resetForm() {
    form.value = {
        name: '',
        url: '',
        method: 'POST',
        contentType: 'json',
        condition: 'always',
        payloadTemplate: defaultPayload,
        enabled: true,
    };
}

function cancelForm() {
    showCreateForm.value = false;
    editingWebhook.value = null;
    resetForm();
}

function startEdit(webhook: WebhookConfig) {
    editingWebhook.value = webhook;
    showCreateForm.value = false;
    form.value = {
        name: webhook.name,
        url: webhook.url,
        method: webhook.method,
        contentType: webhook.contentType,
        condition: webhook.condition,
        payloadTemplate: webhook.payloadTemplate,
        enabled: webhook.enabled,
    };
}

function confirmDelete(webhook: WebhookConfig) {
    deletingWebhook.value = webhook;
}

async function loadWebhooks() {
    webhooks.value = await getWebhooks(pid);
}

async function saveWebhook() {
    if (editingWebhook.value) {
        const success = await updateWebhook(editingWebhook.value.wid, form.value);
        if (success) {
            editingWebhook.value = null;
            resetForm();
            await loadWebhooks();
        }
    } else {
        const success = await createWebhook(pid, form.value);
        if (success) {
            showCreateForm.value = false;
            resetForm();
            await loadWebhooks();
        }
    }
}

async function deleteWebhookAction() {
    if (!deletingWebhook.value) return;
    const success = await deleteWebhook(deletingWebhook.value.wid);
    if (success) {
        deletingWebhook.value = null;
        await loadWebhooks();
    }
}

async function testWebhookAction(wid: string) {
    testingWid.value = wid;
    const result = await testWebhook(wid);
    testResults.value[wid] = result;
    testingWid.value = null;
}

onMounted(loadWebhooks);
</script>
