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
                <h1 class="text-3xl font-bold text-slate-900">📊 Analytics</h1>
                <p class="text-lg text-slate-500 mt-1">
                    Statistics and insights for <span class="font-semibold text-slate-700">{{ analytics?.projectName || '...' }}</span>
                </p>
            </div>
        </div>

        <!-- Loading -->
        <div
            v-if="loading"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
        >
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div
                    v-for="i in 4"
                    :key="i"
                    class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse"
                >
                    <div class="h-4 bg-slate-200 rounded w-1/2 mb-3" />
                    <div class="h-8 bg-slate-200 rounded w-3/4" />
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
            v-else-if="analytics"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8"
        >
            <!-- Summary Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <p class="text-sm font-medium text-slate-500 mb-1">Total Builds</p>
                    <p class="text-3xl font-bold text-slate-900">{{ analytics.totalBuilds }}</p>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <p class="text-sm font-medium text-slate-500 mb-1">Total Test Runs</p>
                    <p class="text-3xl font-bold text-slate-900">{{ analytics.totalCases }}</p>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <p class="text-sm font-medium text-slate-500 mb-1">Build Pass Rate</p>
                    <p
                        class="text-3xl font-bold"
                        :class="passRateColor"
                    >
                        {{ analytics.passRate }}%
                    </p>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <p class="text-sm font-medium text-slate-500 mb-1">Top Failing Cases</p>
                    <p class="text-3xl font-bold text-red-600">{{ analytics.topFailingCases.length }}</p>
                </div>
            </div>

            <!-- Build Result Distribution -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Build Result Distribution</h2>
                <div
                    v-if="totalCompletedBuilds > 0"
                    class="space-y-4"
                >
                    <div class="flex rounded-full overflow-hidden h-8">
                        <div
                            v-if="analytics.buildResultDistribution.passed > 0"
                            class="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                            :style="{ width: `${(analytics.buildResultDistribution.passed / totalCompletedBuilds) * 100}%` }"
                        >
                            {{ analytics.buildResultDistribution.passed }}
                        </div>
                        <div
                            v-if="analytics.buildResultDistribution.failed > 0"
                            class="bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                            :style="{ width: `${(analytics.buildResultDistribution.failed / totalCompletedBuilds) * 100}%` }"
                        >
                            {{ analytics.buildResultDistribution.failed }}
                        </div>
                        <div
                            v-if="analytics.buildResultDistribution.undetermined > 0"
                            class="bg-amber-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                            :style="{ width: `${(analytics.buildResultDistribution.undetermined / totalCompletedBuilds) * 100}%` }"
                        >
                            {{ analytics.buildResultDistribution.undetermined }}
                        </div>
                    </div>
                    <div class="flex gap-6 text-sm">
                        <span class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                            Passed: {{ analytics.buildResultDistribution.passed }}
                        </span>
                        <span class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-red-500 inline-block" />
                            Failed: {{ analytics.buildResultDistribution.failed }}
                        </span>
                        <span class="flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                            Undetermined: {{ analytics.buildResultDistribution.undetermined }}
                        </span>
                    </div>
                </div>
                <p
                    v-else
                    class="text-slate-400 text-sm"
                >
                    No completed builds yet.
                </p>
            </div>

            <!-- Build Activity (last 30 days) -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Build Activity (Last 30 Days)</h2>
                <div
                    v-if="analytics.buildActivity.length > 0"
                    class="space-y-3"
                >
                    <div class="flex items-end gap-1 h-40">
                        <div
                            v-for="day in analytics.buildActivity"
                            :key="day._id"
                            class="flex-1 flex flex-col items-center justify-end gap-0.5 group relative"
                        >
                            <div
                                class="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10"
                            >
                                {{ day._id }}: {{ day.total }} build{{ day.total !== 1 ? 's' : '' }}
                            </div>
                            <div
                                v-if="day.passed > 0"
                                class="w-full bg-emerald-400 rounded-t transition-all"
                                :style="{ height: `${(day.passed / maxDailyBuilds) * 100}%`, minHeight: '4px' }"
                            />
                            <div
                                v-if="day.failed > 0"
                                class="w-full bg-red-400 transition-all"
                                :style="{ height: `${(day.failed / maxDailyBuilds) * 100}%`, minHeight: '4px' }"
                            />
                            <div
                                v-if="day.total - day.passed - day.failed > 0"
                                class="w-full bg-amber-400 rounded-b transition-all"
                                :style="{ height: `${((day.total - day.passed - day.failed) / maxDailyBuilds) * 100}%`, minHeight: '4px' }"
                            />
                        </div>
                    </div>
                    <div class="flex justify-between text-xs text-slate-400 mt-2">
                        <span>{{ analytics.buildActivity[0]?._id }}</span>
                        <span>{{ analytics.buildActivity[analytics.buildActivity.length - 1]?._id }}</span>
                    </div>
                </div>
                <p
                    v-else
                    class="text-slate-400 text-sm"
                >
                    No build activity in the last 30 days.
                </p>
            </div>

            <!-- Recent Builds -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Recent Builds</h2>
                <div
                    v-if="analytics.recentBuilds.length > 0"
                    class="overflow-x-auto"
                >
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-slate-200">
                                <th class="text-left py-3 px-3 font-medium text-slate-500">#</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Result</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Cases</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Passed</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Failed</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="build in analytics.recentBuilds"
                                :key="build.bid"
                                class="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                @click="$router.push(`/build/${build.bid}`)"
                            >
                                <td class="py-3 px-3 font-mono text-slate-600">#{{ build.buildIndex }}</td>
                                <td class="py-3 px-3">
                                    <span
                                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                                        :class="resultBadgeClasses(build.buildResult)"
                                    >
                                        {{ build.buildResult }}
                                    </span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">{{ build.caseCount }}</td>
                                <td class="py-3 px-3 text-emerald-600">{{ build.passedCount }}</td>
                                <td class="py-3 px-3 text-red-600">{{ build.failedCount }}</td>
                                <td class="py-3 px-3 text-slate-500">{{ formatTime(build.createdAt) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p
                    v-else
                    class="text-slate-400 text-sm"
                >
                    No builds yet.
                </p>
            </div>

            <!-- Top Failing Cases -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 class="text-lg font-semibold text-slate-900 mb-4">Top Failing Cases</h2>
                <div
                    v-if="analytics.topFailingCases.length > 0"
                    class="overflow-x-auto"
                >
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-slate-200">
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Case Name</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Fails</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Total Runs</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Fail Rate</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Avg Diff %</th>
                                <th class="text-left py-3 px-3 font-medium text-slate-500">Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="tc in analytics.topFailingCases"
                                :key="tc.caseName"
                                class="border-b border-slate-100"
                            >
                                <td class="py-3 px-3 font-medium text-slate-700 max-w-xs truncate">{{ tc.caseName }}</td>
                                <td class="py-3 px-3 text-red-600 font-semibold">{{ tc.failCount }}</td>
                                <td class="py-3 px-3 text-slate-600">{{ tc.totalRuns }}</td>
                                <td class="py-3 px-3">
                                    <div class="flex items-center gap-2">
                                        <div class="w-16 bg-slate-200 rounded-full h-2">
                                            <div
                                                class="h-2 rounded-full transition-all"
                                                :class="tc.failRate > 50 ? 'bg-red-500' : 'bg-amber-500'"
                                                :style="{ width: `${tc.failRate}%` }"
                                            />
                                        </div>
                                        <span class="text-slate-600">{{ tc.failRate }}%</span>
                                    </div>
                                </td>
                                <td class="py-3 px-3 text-slate-600">{{ tc.avgDiff }}%</td>
                                <td class="py-3 px-3 text-slate-500">{{ formatTime(tc.lastSeen) }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div
                    v-else
                    class="flex flex-col items-center py-8 text-slate-400"
                >
                    <span class="text-4xl mb-2">🎉</span>
                    <p>No failing cases — everything looks great!</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { useFormatters } from '@/composables/useFormatters';
import { ref, computed, onMounted } from 'vue';
import type { ProjectAnalytics } from '@/types';

const props = defineProps<{ pid: string }>();
const { getProjectAnalytics, loading, error } = useApi();
const { formatTime, resultBadgeClasses } = useFormatters();

const analytics = ref<ProjectAnalytics | null>(null);

const totalCompletedBuilds = computed(() => {
    if (!analytics.value) return 0;
    const d = analytics.value.buildResultDistribution;
    return d.passed + d.failed + d.undetermined;
});

const maxDailyBuilds = computed(() => {
    if (!analytics.value) return 1;
    return Math.max(1, ...analytics.value.buildActivity.map((d) => d.total));
});

const passRateColor = computed(() => {
    if (!analytics.value) return 'text-slate-900';
    if (analytics.value.passRate >= 80) return 'text-emerald-600';
    if (analytics.value.passRate >= 50) return 'text-amber-600';
    return 'text-red-600';
});

onMounted(async () => {
    analytics.value = await getProjectAnalytics(props.pid);
});
</script>
