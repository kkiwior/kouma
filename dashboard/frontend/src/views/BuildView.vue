<template>
    <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-white border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <!-- Breadcrumb -->
                <nav class="flex items-center gap-2 text-sm text-slate-500 mb-4 flex-wrap">
                    <router-link
                        to="/"
                        class="hover:text-slate-700 transition-colors"
                        >Dashboard</router-link
                    >
                    <svg
                        class="w-4 h-4 shrink-0"
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
                        v-if="buildData"
                        :to="`/project/${buildData.pid}/page/1`"
                        class="hover:text-slate-700 transition-colors"
                    >
                        {{ buildData.projectName }}
                    </router-link>
                    <svg
                        class="w-4 h-4 shrink-0"
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
                    <span class="text-slate-900 font-medium"
                        >Build #{{ buildData?.buildIndex }}
                        <span
                            v-if="buildData?.buildVersion"
                            class="text-slate-400 font-normal"
                            >({{ buildData.buildVersion }})</span
                        ></span
                    >
                </nav>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <div class="flex flex-col">
                            <h1 class="text-2xl font-bold text-slate-900">Build #{{ buildData?.buildIndex }}</h1>
                            <span
                                v-if="buildData?.buildVersion"
                                class="text-xs text-slate-500 font-mono mt-0.5"
                                >{{ buildData.buildVersion }}</span
                            >
                        </div>
                        <span
                            v-if="buildData?.isBaseline"
                            class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                            ★ Baseline
                        </span>
                    </div>

                    <!-- Actions -->
                    <div
                        v-if="buildData"
                        class="flex flex-wrap gap-2"
                    >
                        <!-- Rebase / Debase -->
                        <button
                            v-if="buildData.ableToRebase && !buildData.isBaseline"
                            @click="handleRebase"
                            :disabled="actionLoading"
                            class="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {{ actionLoading ? 'Processing...' : '⬆️ Set as Baseline' }}
                        </button>
                        <button
                            v-if="buildData.isBaseline"
                            @click="handleDebase"
                            :disabled="actionLoading"
                            class="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {{ actionLoading ? 'Processing...' : '⬇️ Remove Baseline' }}
                        </button>

                        <!-- Pass All -->
                        <button
                            v-if="!buildData.isAllPassed"
                            @click="showPassAllModal = true"
                            class="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
                        >
                            ✓ Pass All
                        </button>

                        <!-- Review Fails -->
                        <router-link
                            v-if="firstFailedCaseCid"
                            :to="{ path: `/case/${firstFailedCaseCid}`, query: { onlyFails: 'true' } }"
                            class="px-4 py-2 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                            🔍 Review Fails
                        </router-link>
                    </div>
                </div>
            </div>
        </div>

        <!-- Test Cases -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading -->
            <div
                v-if="loading"
                class="space-y-3"
            >
                <div
                    v-for="i in 5"
                    :key="i"
                    class="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"
                >
                    <div class="flex items-center gap-4">
                        <div class="h-5 bg-slate-200 rounded w-40" />
                        <div class="flex-1" />
                        <div class="h-5 bg-slate-200 rounded w-20" />
                    </div>
                </div>
            </div>

            <!-- Metadata -->
            <div
                v-if="buildData && buildData.metadata && Object.keys(buildData.metadata).length > 0"
                class="mb-6 bg-white rounded-xl border border-slate-200 p-4"
            >
                <h3 class="text-sm font-semibold text-slate-900 mb-3">Metadata</h3>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div
                        v-for="(value, key) in buildData.metadata"
                        :key="key"
                        class="flex flex-col"
                    >
                        <span class="text-xs text-slate-500 font-medium uppercase tracking-wider">{{ key }}</span>
                        <a
                            v-if="isUrl(value)"
                            :href="value"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-sm text-indigo-600 hover:text-indigo-800 font-medium break-all mt-1 flex items-center gap-1 group/link"
                        >
                            {{ value }}
                            <svg
                                class="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 transition-opacity"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                            </svg>
                        </a>
                        <span
                            v-else
                            class="text-sm text-slate-900 font-medium break-words mt-1"
                            >{{ value }}</span
                        >
                    </div>
                </div>
            </div>

            <!-- Cases List -->
            <div
                v-if="buildData"
                class="space-y-3"
            >
                <div class="text-sm text-slate-500 mb-4">
                    {{ buildData.allCases.length }} test
                    {{ buildData.allCases.length === 1 ? 'case' : 'cases' }}
                </div>

                <router-link
                    v-for="testCase in buildData.allCases"
                    :key="testCase.cid"
                    :to="`/case/${testCase.cid}`"
                    class="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <!-- Case name -->
                        <span class="font-medium text-slate-900 truncate flex-1">
                            {{ testCase.caseName }}
                        </span>

                        <!-- Result badge -->
                        <span
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                            :class="resultBadgeClasses(displayResult(testCase.caseResult, testCase.comprehensiveCaseResult))"
                        >
                            <span
                                class="w-1.5 h-1.5 rounded-full"
                                :class="resultBgColor(displayResult(testCase.caseResult, testCase.comprehensiveCaseResult))"
                            />
                            {{ displayResult(testCase.caseResult, testCase.comprehensiveCaseResult) }}
                        </span>

                        <!-- Diff percentage -->
                        <span
                            v-if="testCase.diffPercentage"
                            class="text-sm font-mono shrink-0"
                            :class="testCase.diffPercentage > 0 ? 'text-red-500' : 'text-slate-400'"
                        >
                            {{ testCase.diffPercentage }}% diff
                        </span>

                        <!-- Arrow -->
                        <svg
                            class="w-5 h-5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 hidden sm:block"
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
                    </div>
                </router-link>
            </div>
        </div>

        <!-- Pass All Modal -->
        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="showPassAllModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    class="absolute inset-0 bg-black/50"
                    @click="showPassAllModal = false"
                />
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                    <h2 class="text-xl font-semibold text-slate-900 mb-2">Pass All Test Cases</h2>
                    <p class="text-slate-500 text-sm mb-6">This will mark all test cases in this build as passed. Are you sure?</p>
                    <div class="flex gap-3">
                        <button
                            @click="showPassAllModal = false"
                            class="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            @click="handlePassAll"
                            :disabled="actionLoading"
                            class="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                            {{ actionLoading ? 'Processing...' : 'Pass All' }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { useFormatters } from '@/composables/useFormatters';
import { ref, onMounted, computed } from 'vue';
import type { BuildDetail } from '@/types';

const props = defineProps<{
    bid: string;
}>();

const { getBuild, rebaseBuild, debaseBuild, passAllCases, loading } = useApi();
const { resultBadgeClasses, resultBgColor, displayResult } = useFormatters();

const buildData = ref<BuildDetail | null>(null);
const actionLoading = ref(false);
const showPassAllModal = ref(false);

const firstFailedCaseCid = computed(() => {
    if (!buildData.value) return null;
    return buildData.value.allCases.find((c) => c.caseResult === 'failed')?.cid || null;
});

const isUrl = (val: string) => {
    try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
};

const loadData = async () => {
    buildData.value = await getBuild(props.bid);
};

const handleRebase = async () => {
    actionLoading.value = true;
    const success = await rebaseBuild(props.bid);
    if (success) await loadData();
    actionLoading.value = false;
};

const handleDebase = async () => {
    actionLoading.value = true;
    const success = await debaseBuild(props.bid);
    if (success) await loadData();
    actionLoading.value = false;
};

const handlePassAll = async () => {
    actionLoading.value = true;
    const success = await passAllCases(props.bid);
    if (success) {
        showPassAllModal.value = false;
        await loadData();
    }
    actionLoading.value = false;
};

onMounted(loadData);
</script>
