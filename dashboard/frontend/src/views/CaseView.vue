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
                        v-if="caseData"
                        :to="`/project/${caseData.pid}/page/1`"
                        class="hover:text-slate-700 transition-colors"
                    >
                        {{ caseData.projectName }}
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
                    <router-link
                        v-if="caseData"
                        :to="`/build/${caseData.bid}`"
                        class="hover:text-slate-700 transition-colors"
                    >
                        Build #{{ caseData.buildIndex }}
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
                    <span class="text-slate-900 font-medium">{{ caseData?.caseName }}</span>
                </nav>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <!-- Prev/Next Navigation -->
                        <router-link
                            v-if="caseData?.prevCase"
                            :to="{ path: `/case/${caseData.prevCase.cid}`, query: { onlyFails: onlyFails ? 'true' : undefined } }"
                            class="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                            title="Previous case"
                            aria-label="Previous case"
                        >
                            <svg
                                class="w-5 h-5 text-slate-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </router-link>
                        <span
                            v-else
                            class="p-2 rounded-lg border border-slate-200 opacity-40"
                            aria-hidden="true"
                        >
                            <svg
                                class="w-5 h-5 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M15 19l-7-7 7-7"
                                />
                            </svg>
                        </span>

                        <h1 class="text-xl font-bold text-slate-900">
                            {{ caseData?.caseName }}
                        </h1>

                        <router-link
                            v-if="caseData?.nextCase"
                            :to="{ path: `/case/${caseData.nextCase.cid}`, query: { onlyFails: onlyFails ? 'true' : undefined } }"
                            class="p-2 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors"
                            title="Next case"
                            aria-label="Next case"
                        >
                            <svg
                                class="w-5 h-5 text-slate-600"
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
                        </router-link>
                        <span
                            v-else
                            class="p-2 rounded-lg border border-slate-200 opacity-40"
                            aria-hidden="true"
                        >
                            <svg
                                class="w-5 h-5 text-slate-400"
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
                        </span>

                        <!-- Result Badge -->
                        <span
                            v-if="caseData"
                            class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ml-2"
                            :class="resultBadgeClasses(displayResult(caseData.caseResult, caseData.comprehensiveCaseResult))"
                        >
                            <span
                                class="w-1.5 h-1.5 rounded-full"
                                :class="resultBgColor(displayResult(caseData.caseResult, caseData.comprehensiveCaseResult))"
                            />
                            {{ displayResult(caseData.caseResult, caseData.comprehensiveCaseResult) }}
                        </span>

                        <!-- Diff percentage -->
                        <span
                            v-if="caseData?.diffPercentage"
                            class="text-sm font-mono text-red-500 ml-2"
                        >
                            {{ caseData.diffPercentage }}% diff
                        </span>
                    </div>

                    <!-- Actions -->
                    <div
                        v-if="caseData"
                        class="flex items-center gap-4"
                    >
                        <!-- Review Mode Toggle -->
                        <div class="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
                            <span class="text-xs font-medium text-slate-600">Review Fails Only</span>
                            <button
                                @click="toggleOnlyFails"
                                class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
                                :class="onlyFails ? 'bg-indigo-600' : 'bg-slate-200'"
                            >
                                <span
                                    aria-hidden="true"
                                    class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                                    :class="onlyFails ? 'translate-x-4' : 'translate-x-0'"
                                />
                            </button>
                        </div>

                        <div class="flex gap-2">
                            <button
                                @click="handlePass"
                                :disabled="actionLoading"
                                class="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                ✓ Pass
                            </button>
                            <button
                                @click="handleFail"
                                :disabled="actionLoading"
                                class="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                ✗ Fail
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Content -->
        <div
            v-if="loading"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
            <div class="bg-white rounded-xl border border-slate-200 p-8 animate-pulse">
                <div class="h-64 bg-slate-200 rounded" />
            </div>
        </div>

        <div
            v-else-if="caseData"
            class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        >
            <!-- View Mode Tabs -->
            <div
                v-if="caseData.view === 2 || caseData.view === 3"
                class="flex gap-2 mb-6"
            >
                <button
                    v-for="tab in viewTabs"
                    v-show="!(caseData.view === 2 && tab.id === 'diff') && !(isGif(caseData.latestUrl) && tab.id === 'diff')"
                    :key="tab.id"
                    @click="handleTabChange(tab.id)"
                    class="px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                    :class="
                        activeTab === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                    "
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- Image Display -->
            <div class="space-y-6">
                <!-- View 1: Latest Only -->
                <div
                    v-if="caseData.view === 1"
                    class="bg-white rounded-xl border border-slate-200 p-6"
                >
                    <h3 class="text-sm font-medium text-slate-500 mb-3">Latest Screenshot</h3>
                    <img
                        :src="caseData.latestUrl"
                        alt="Latest"
                        class="max-w-full rounded-lg shadow-sm"
                    />
                </div>

                <!-- View 2 & 3 Tabs Content -->
                <template v-else-if="caseData.view === 2 || caseData.view === 3">
                    <!-- Diff Tab -->
                    <div
                        v-if="activeTab === 'diff' && caseData.view === 3"
                        class="bg-white rounded-xl border border-slate-200 p-6"
                    >
                        <h3 class="text-sm font-medium text-red-500 mb-3">Diff Overlay ({{ caseData.diffPercentage }}% different)</h3>
                        <div class="relative inline-block">
                            <img
                                :src="caseData.diffUrl"
                                alt="Diff"
                                class="max-w-full rounded-lg shadow-sm"
                            />
                            <div
                                v-if="rectangles.length > 0"
                                class="absolute inset-0 pointer-events-none"
                            >
                                <div
                                    v-for="(rect, index) in rectangles"
                                    :key="'diff-rect-' + index"
                                    class="absolute border-2 border-blue-500/50 bg-blue-500/10"
                                    :style="{
                                        left: (rect.x / naturalWidth) * 100 + '%',
                                        top: (rect.y / naturalHeight) * 100 + '%',
                                        width: (rect.width / naturalWidth) * 100 + '%',
                                        height: (rect.height / naturalHeight) * 100 + '%',
                                    }"
                                />
                            </div>
                        </div>
                    </div>

                    <!-- Side by Side Tab -->
                    <div v-if="activeTab === 'sideBySide'">
                        <!-- GIF: synced dual player -->
                        <GifSyncPlayer
                            v-if="isGif(caseData.latestUrl) && isGif(caseData.baselineUrl)"
                            :src-a="caseData.latestUrl"
                            :src-b="caseData.baselineUrl"
                            label-a="Latest"
                            label-b="Baseline"
                        />
                        <!-- Static images: original layout -->
                        <div
                            v-else
                            class="grid grid-cols-1 lg:grid-cols-2 gap-6"
                        >
                            <div class="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 class="text-sm font-medium text-slate-500 mb-3">Latest</h3>
                                <img
                                    :src="caseData.latestUrl"
                                    alt="Latest"
                                    class="max-w-full rounded-lg shadow-sm"
                                />
                            </div>
                            <div class="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 class="text-sm font-medium text-slate-500 mb-3">Baseline</h3>
                                <div class="relative inline-block">
                                    <img
                                        :src="caseData.baselineUrl"
                                        alt="Baseline"
                                        class="max-w-full rounded-lg shadow-sm"
                                    />
                                    <div
                                        v-if="rectangles.length > 0"
                                        class="absolute inset-0 pointer-events-none"
                                    >
                                        <div
                                            v-for="(rect, index) in rectangles"
                                            :key="'sbs-rect-' + index"
                                            class="absolute border-2 border-blue-500/50 bg-blue-500/10"
                                            :style="{
                                                left: (rect.x / naturalWidth) * 100 + '%',
                                                top: (rect.y / naturalHeight) * 100 + '%',
                                                width: (rect.width / naturalWidth) * 100 + '%',
                                                height: (rect.height / naturalHeight) * 100 + '%',
                                            }"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Compare Slider Tab -->
                    <div
                        v-if="activeTab === 'compare'"
                        class="bg-white rounded-xl border border-slate-200 p-6"
                    >
                        <h3 class="text-sm font-medium text-slate-500 mb-3">Interactive Comparison</h3>
                        <GifCompareSlider
                            v-if="isGif(caseData.latestUrl) && isGif(caseData.baselineUrl)"
                            :actual-url="caseData.latestUrl"
                            :baseline-url="caseData.baselineUrl"
                        />
                        <ImageCompareSlider
                            v-else
                            :actual-url="caseData.latestUrl"
                            :baseline-url="caseData.baselineUrl"
                        />
                    </div>

                    <!-- Baseline Tab (Exclusions) -->
                    <div
                        v-show="activeTab === 'baseline'"
                        class="bg-white rounded-xl border border-slate-200 p-6"
                    >
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-medium text-slate-500">Baseline Image & Ignoring Regions</h3>
                            <div class="flex gap-2">
                                <button
                                    @click="toggleIgnoringMode"
                                    class="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                                    :class="
                                        ignoringMode
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
                                    "
                                >
                                    {{ ignoringMode ? '🖊️ Drawing...' : '🖊️ Draw Regions' }}
                                </button>
                                <button
                                    v-if="rectangles.length > 0"
                                    @click="clearRectangles"
                                    class="px-3 py-1.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                >
                                    Clear All
                                </button>
                                <button
                                    @click="handleSaveIgnoring"
                                    :disabled="savingIgnoring"
                                    class="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {{ savingIgnoring ? 'Saving...' : 'Save Regions' }}
                                </button>
                            </div>
                        </div>

                        <!-- Canvas for drawing rectangles over the baseline image -->
                        <div
                            ref="canvasContainer"
                            class="relative inline-block select-none"
                            :class="{ 'cursor-crosshair': ignoringMode }"
                            @mousedown="startDrawing"
                            @mousemove="onDrawing"
                            @mouseup="stopDrawing"
                            @mouseleave="stopDrawing"
                            @dragstart.prevent
                        >
                            <img
                                ref="baselineImage"
                                :src="caseData.baselineUrl"
                                alt="Baseline"
                                class="max-w-full rounded-lg shadow-sm"
                                draggable="false"
                                @load="onImageLoad"
                            />

                            <template v-if="imageLoaded">
                                <!-- Existing rectangles -->
                                <div
                                    v-for="(rect, index) in rectangles"
                                    :key="'rect-' + index"
                                    class="absolute border-2 border-blue-500 border-dashed bg-blue-500/20 group hover:bg-blue-500/30 transition-colors"
                                    :style="{
                                        left: (rect.x / naturalWidth) * 100 + '%',
                                        top: (rect.y / naturalHeight) * 100 + '%',
                                        width: (rect.width / naturalWidth) * 100 + '%',
                                        height: (rect.height / naturalHeight) * 100 + '%',
                                    }"
                                >
                                    <button
                                        v-if="ignoringMode"
                                        @mousedown.stop
                                        @click.stop="removeRectangle(index)"
                                        class="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-red-600 shadow-sm"
                                        title="Remove region"
                                        aria-label="Remove region"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <!-- Current drawing rectangle -->
                                <div
                                    v-if="isDrawing && currentRect"
                                    class="absolute border-2 border-blue-500 bg-blue-500/15"
                                    :style="{
                                        left: (currentRect.x / naturalWidth) * 100 + '%',
                                        top: (currentRect.y / naturalHeight) * 100 + '%',
                                        width: (currentRect.width / naturalWidth) * 100 + '%',
                                        height: (currentRect.height / naturalHeight) * 100 + '%',
                                    }"
                                />
                            </template>
                        </div>
                    </div>

                    <!-- Latest Only Tab -->
                    <div
                        v-if="activeTab === 'latest'"
                        class="bg-white rounded-xl border border-slate-200 p-6"
                    >
                        <h3 class="text-sm font-medium text-slate-500 mb-3">Latest Screenshot</h3>
                        <img
                            :src="caseData.latestUrl"
                            alt="Latest"
                            class="max-w-full rounded-lg shadow-sm"
                        />
                    </div>
                </template>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import GifCompareSlider from '@/components/GifCompareSlider.vue';
import GifFramePlayer from '@/components/GifFramePlayer.vue';
import GifSyncPlayer from '@/components/GifSyncPlayer.vue';
import ImageCompareSlider from '@/components/ImageCompareSlider.vue';
import { useApi } from '@/composables/useApi';
import { useFormatters } from '@/composables/useFormatters';
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CaseDetail, Rectangle } from '@/types';

function isGif(url: string | undefined | null): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.gif');
}

const props = defineProps<{
    cid: string;
}>();

const route = useRoute();
const { getCase, passCase, failCase, saveIgnoringRectangles, loading } = useApi();
const { resultBadgeClasses, resultBgColor, displayResult } = useFormatters();

const caseData = ref<CaseDetail | null>(null);
const actionLoading = ref(false);
const activeTab = ref('diff');
const userInteractedWithTab = ref(false);

const onlyFails = computed(() => route.query.onlyFails === 'true');

const toggleOnlyFails = () => {
    router.replace({
        query: {
            ...route.query,
            onlyFails: onlyFails.value ? undefined : 'true',
        },
    });
};

const handleTabChange = (tabId: string) => {
    activeTab.value = tabId;
    userInteractedWithTab.value = true;
};

const viewTabs = [
    { id: 'diff', label: 'Diff Overlay' },
    { id: 'sideBySide', label: 'Side by Side' },
    { id: 'compare', label: 'Compare Slider' },
    { id: 'baseline', label: 'Baseline (Exclusions)' },
    { id: 'latest', label: 'Latest Only' },
];

// Ignoring rectangles
const ignoringMode = ref(false);
const isDrawing = ref(false);
const rectangles = ref<Rectangle[]>([]);
const currentRect = ref<Rectangle | null>(null);
const savingIgnoring = ref(false);
const drawStart = ref({ x: 0, y: 0 });

const baselineImage = ref<HTMLImageElement | null>(null);
const canvasContainer = ref<HTMLDivElement | null>(null);
const imageLoaded = ref(false);
const imageWidth = ref(0);
const imageHeight = ref(0);
const naturalWidth = ref(0);
const naturalHeight = ref(0);

const onImageLoad = () => {
    if (baselineImage.value) {
        imageWidth.value = baselineImage.value.clientWidth;
        imageHeight.value = baselineImage.value.clientHeight;
        naturalWidth.value = baselineImage.value.naturalWidth;
        naturalHeight.value = baselineImage.value.naturalHeight;
        imageLoaded.value = true;
    }
};

const getMousePos = (e: MouseEvent): { x: number; y: number } => {
    if (!canvasContainer.value || !baselineImage.value) return { x: 0, y: 0 };
    const rect = canvasContainer.value.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const scaleX = naturalWidth.value / rect.width;
    const scaleY = naturalHeight.value / rect.height;
    return {
        x: clientX * scaleX,
        y: clientY * scaleY,
    };
};

const startDrawing = (e: MouseEvent) => {
    if (!ignoringMode.value) return;
    isDrawing.value = true;
    const pos = getMousePos(e);
    drawStart.value = pos;
    currentRect.value = { x: pos.x, y: pos.y, width: 0, height: 0 };
};

const onDrawing = (e: MouseEvent) => {
    if (!isDrawing.value || !currentRect.value) return;
    const pos = getMousePos(e);
    const x = Math.min(drawStart.value.x, pos.x);
    const y = Math.min(drawStart.value.y, pos.y);
    const width = Math.abs(pos.x - drawStart.value.x);
    const height = Math.abs(pos.y - drawStart.value.y);
    currentRect.value = { x, y, width, height };
};

const stopDrawing = () => {
    if (!isDrawing.value || !currentRect.value) return;
    isDrawing.value = false;
    if (currentRect.value.width > 5 && currentRect.value.height > 5) {
        rectangles.value.push({ ...currentRect.value });
    }
    currentRect.value = null;
};

const toggleIgnoringMode = () => {
    ignoringMode.value = !ignoringMode.value;
};

const removeRectangle = (index: number) => {
    rectangles.value.splice(index, 1);
};

const clearRectangles = () => {
    rectangles.value = [];
};

const handleSaveIgnoring = async () => {
    if (!caseData.value) return;
    savingIgnoring.value = true;
    await saveIgnoringRectangles(caseData.value.pid, caseData.value.caseName, rectangles.value);
    savingIgnoring.value = false;
};

const loadData = async () => {
    const data = await getCase(props.cid, onlyFails.value);
    if (data) {
        caseData.value = data;
        rectangles.value = data.rectangles || [];
        // Only set default tab if user hasn't manually selected one
        if (!userInteractedWithTab.value) {
            if (isGif(data.latestUrl)) {
                activeTab.value = 'sideBySide';
            } else {
                activeTab.value = data.view === 3 ? 'diff' : data.view === 2 ? 'sideBySide' : 'latest';
            }
        }
    }
};

const handlePass = async () => {
    actionLoading.value = true;
    const currentNextCase = caseData.value?.nextCase;
    const success = await passCase(props.cid);
    if (success) {
        if (onlyFails.value && currentNextCase) {
            router.push({ path: `/case/${currentNextCase.cid}`, query: { onlyFails: 'true' } });
        } else {
            await loadData();
        }
    }
    actionLoading.value = false;
};

const handleFail = async () => {
    actionLoading.value = true;
    const currentNextCase = caseData.value?.nextCase;
    const success = await failCase(props.cid);
    if (success) {
        if (onlyFails.value && currentNextCase) {
            router.push({ path: `/case/${currentNextCase.cid}`, query: { onlyFails: 'true' } });
        } else {
            await loadData();
        }
    }
    actionLoading.value = false;
};

watch(() => props.cid, loadData);
watch(onlyFails, loadData);
onMounted(loadData);

const router = useRouter();

let lastEnterTime = 0;
const handleKeydown = (e: KeyboardEvent) => {
    // Prevent interfering with user input in forms/textareas
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
    }

    // Disable navigation if ignoring mode is active
    if (ignoringMode.value) {
        return;
    }

    if (e.key === 'ArrowRight' && caseData.value?.nextCase) {
        router.push({ path: '/case/' + caseData.value.nextCase.cid, query: { onlyFails: onlyFails.value ? 'true' : undefined } });
    } else if (e.key === 'ArrowLeft' && caseData.value?.prevCase) {
        router.push({ path: '/case/' + caseData.value.prevCase.cid, query: { onlyFails: onlyFails.value ? 'true' : undefined } });
    } else if (e.key === 'Enter') {
        const now = Date.now();
        if (now - lastEnterTime < 500) {
            // Double enter
            if (!actionLoading.value && caseData.value) {
                handlePass();
            }
        }
        lastEnterTime = now;
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>
