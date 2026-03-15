<template>
    <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-white border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div class="flex items-center gap-4 mb-2">
                    <router-link
                        :to="`/project/${pid}`"
                        class="text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        ← Back to Project
                    </router-link>
                </div>
                <h1 class="text-3xl font-bold text-slate-900">📋 Activity Log</h1>
                <p class="text-lg text-slate-500 mt-1">Recent actions for this project</p>
            </div>
        </div>

        <!-- Loading -->
        <div
            v-if="loading"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
            <div class="space-y-4">
                <div
                    v-for="i in 5"
                    :key="i"
                    class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse"
                >
                    <div class="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                    <div class="h-3 bg-slate-200 rounded w-2/3" />
                </div>
            </div>
        </div>

        <!-- Error -->
        <div
            v-else-if="error"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
            <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                <p class="text-red-600">{{ error }}</p>
            </div>
        </div>

        <!-- Content -->
        <div
            v-else
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
            <!-- Empty state -->
            <div
                v-if="logs.length === 0"
                class="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center"
            >
                <p class="text-slate-400 text-lg">No activity logs yet</p>
                <p class="text-slate-400 text-sm mt-1">Actions performed on this project will appear here</p>
            </div>

            <!-- Log entries -->
            <div
                v-else
                class="space-y-3"
            >
                <div
                    v-for="(log, index) in logs"
                    :key="`${log.createdAt}-${index}`"
                    class="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-start gap-4"
                >
                    <!-- Action icon -->
                    <div
                        class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
                        :class="actionIconBg(log.action)"
                    >
                        {{ actionIcon(log.action) }}
                    </div>

                    <!-- Content -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                :class="actionBadgeClasses(log.action)"
                            >
                                {{ formatAction(log.action) }}
                            </span>
                            <span
                                v-if="log.actor"
                                class="text-sm text-slate-600"
                            >
                                by <span class="font-medium text-slate-800">{{ log.actor }}</span>
                            </span>
                        </div>
                        <p class="text-sm text-slate-700 mt-1">{{ log.details }}</p>
                        <div class="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                            <span>{{ formatTime(log.createdAt) }}</span>
                            <span
                                v-if="log.entityType && log.entityId"
                                class="font-mono"
                                >{{ log.entityType }}:{{ log.entityId }}</span
                            >
                        </div>
                    </div>
                </div>
            </div>

            <!-- Pagination -->
            <div
                v-if="totalPages > 1"
                class="flex items-center justify-center gap-2 mt-8"
            >
                <button
                    :disabled="currentPage <= 1"
                    @click="goToPage(currentPage - 1)"
                    class="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
                    :class="currentPage <= 1 ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-slate-50'"
                >
                    ← Previous
                </button>
                <span class="text-sm text-slate-500"> Page {{ currentPage }} of {{ totalPages }} </span>
                <button
                    :disabled="currentPage >= totalPages"
                    @click="goToPage(currentPage + 1)"
                    class="px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors cursor-pointer"
                    :class="
                        currentPage >= totalPages ? 'border-slate-200 text-slate-300' : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    "
                >
                    Next →
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { useFormatters } from '@/composables/useFormatters';
import { ref, computed, onMounted } from 'vue';
import type { ActivityLogEntry } from '@/types';

const props = defineProps<{ pid: string }>();
const { getActivityLogs, loading, error } = useApi();
const { formatTime } = useFormatters();

const logs = ref<ActivityLogEntry[]>([]);
const total = ref(0);
const currentPage = ref(1);
const pageSize = 20;

const totalPages = computed(() => Math.ceil(total.value / pageSize));

async function fetchLogs(page: number) {
    const result = await getActivityLogs(props.pid, page, pageSize);
    if (result) {
        logs.value = result.logs;
        total.value = result.total;
        currentPage.value = page;
    }
}

function goToPage(page: number) {
    if (page >= 1 && page <= totalPages.value) {
        fetchLogs(page);
    }
}

function actionIcon(action: string): string {
    if (action.startsWith('project_created')) return '🆕';
    if (action.startsWith('project_configured')) return '⚙️';
    if (action.startsWith('project_image')) return '🖼️';
    if (action.startsWith('project_cleaned')) return '🧹';
    if (action.startsWith('project_deleted')) return '🗑️';
    if (action.startsWith('build_rebased')) return '🔄';
    if (action.startsWith('build_debased')) return '↩️';
    if (action.startsWith('build_passed')) return '✅';
    if (action.startsWith('case_passed')) return '✅';
    if (action.startsWith('case_failed')) return '❌';
    if (action.startsWith('case_ignoring')) return '🔲';
    if (action.startsWith('webhook_created')) return '🔔';
    if (action.startsWith('webhook_updated')) return '✏️';
    if (action.startsWith('webhook_deleted')) return '🗑️';
    if (action.startsWith('user_login')) return '🔑';
    if (action.startsWith('user_logout')) return '🚪';
    return '📝';
}

function actionIconBg(action: string): string {
    if (action.includes('deleted') || action.includes('failed')) return 'bg-red-50';
    if (action.includes('passed') || action.includes('created')) return 'bg-emerald-50';
    if (action.includes('cleaned') || action.includes('debased')) return 'bg-amber-50';
    return 'bg-slate-50';
}

function actionBadgeClasses(action: string): string {
    if (action.includes('deleted') || action.includes('failed')) return 'bg-red-100 text-red-800';
    if (action.includes('passed') || action.includes('created')) return 'bg-emerald-100 text-emerald-800';
    if (action.includes('cleaned') || action.includes('debased')) return 'bg-amber-100 text-amber-800';
    return 'bg-slate-100 text-slate-700';
}

function formatAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

onMounted(() => fetchLogs(1));
</script>
