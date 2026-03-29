<template>
    <div
        class="flex flex-col gap-4 outline-none"
        tabindex="0"
        @keydown="handleKeydown"
        @click="($event.currentTarget as HTMLElement)?.focus()"
    >
        <!-- Loading -->
        <div
            v-if="decoderA.loading.value || decoderB.loading.value"
            class="flex items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200"
        >
            <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                <span class="text-sm text-slate-500">Decoding GIF frames...</span>
            </div>
        </div>

        <!-- Error -->
        <div
            v-else-if="decoderA.error.value || decoderB.error.value"
            class="flex items-center justify-center h-64 bg-red-50 rounded-xl border border-red-200"
        >
            <span class="text-sm text-red-500">{{ decoderA.error.value || decoderB.error.value }}</span>
        </div>

        <!-- Player + Slider -->
        <template v-else-if="totalFrames > 0">
            <ImageCompareSlider
                :actual-url="frameUrlA"
                :baseline-url="frameUrlB"
            />

            <!-- GIF Frame Controls -->
            <div class="bg-white rounded-xl border border-slate-200 p-4">
                <!-- Timeline Scrubber -->
                <div class="flex items-center gap-3 mb-4">
                    <button
                        @click="prevFrame"
                        :disabled="playing"
                        class="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Previous frame (←)"
                    >
                        <svg
                            class="w-4 h-4 text-slate-600"
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
                    </button>

                    <input
                        type="range"
                        :min="0"
                        :max="totalFrames - 1"
                        :value="currentFrame"
                        @input="onScrub"
                        class="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
                    />

                    <button
                        @click="nextFrame"
                        :disabled="playing"
                        class="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Next frame (→)"
                    >
                        <svg
                            class="w-4 h-4 text-slate-600"
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
                    </button>
                </div>

                <!-- Bottom Row -->
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center gap-2">
                        <button
                            @click="goToFirst"
                            :disabled="playing"
                            class="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ⏮
                        </button>
                        <button
                            @click="togglePlay"
                            class="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                            :class="
                                playing
                                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                            "
                        >
                            {{ playing ? '⏸ Pause' : '▶ Play' }}
                        </button>
                        <button
                            @click="goToLast"
                            :disabled="playing"
                            class="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            ⏭
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-500">Speed:</span>
                        <button
                            v-for="s in speeds"
                            :key="s"
                            @click="speed = s"
                            class="px-2 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer"
                            :class="speed === s ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'"
                        >
                            {{ s }}x
                        </button>
                    </div>

                    <div class="flex items-center gap-3 text-xs text-slate-400">
                        <span class="font-mono">Frame {{ currentFrame + 1 }}/{{ totalFrames }}</span>
                        <span
                            v-if="decoderA.frames.value[currentFrame]"
                            class="font-mono"
                            >{{ decoderA.frames.value[currentFrame].delay }}ms</span
                        >
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useGifDecoder } from '@/composables/useGifDecoder';
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import ImageCompareSlider from './ImageCompareSlider.vue';

const props = defineProps<{
    actualUrl: string;
    baselineUrl: string;
}>();

const currentFrame = ref(0);
const playing = ref(false);
const speed = ref(1);
const speeds = [0.25, 0.5, 1, 2, 4];

const decoderA = useGifDecoder();
const decoderB = useGifDecoder();

const totalFrames = computed(() => Math.max(decoderA.frames.value.length, decoderB.frames.value.length));

// Offscreen canvases for generating data URLs for the ImageCompareSlider
let offscreenA: HTMLCanvasElement | null = null;
let offscreenB: HTMLCanvasElement | null = null;

const frameUrlA = ref('');
const frameUrlB = ref('');

let animationTimer: ReturnType<typeof setTimeout> | null = null;

function updateFrameUrls(index: number) {
    if (!offscreenA) {
        offscreenA = document.createElement('canvas');
    }
    if (!offscreenB) {
        offscreenB = document.createElement('canvas');
    }

    const idxA = Math.min(index, decoderA.frames.value.length - 1);
    const idxB = Math.min(index, decoderB.frames.value.length - 1);

    if (decoderA.frames.value.length > 0) {
        decoderA.renderToCanvas(offscreenA, idxA);
        frameUrlA.value = offscreenA.toDataURL('image/png');
    }
    if (decoderB.frames.value.length > 0) {
        decoderB.renderToCanvas(offscreenB, idxB);
        frameUrlB.value = offscreenB.toDataURL('image/png');
    }
}

function togglePlay() {
    if (playing.value) stopPlaying();
    else startPlaying();
}

function startPlaying() {
    playing.value = true;
    scheduleNext();
}

function stopPlaying() {
    playing.value = false;
    if (animationTimer) {
        clearTimeout(animationTimer);
        animationTimer = null;
    }
}

function scheduleNext() {
    if (!playing.value || totalFrames.value === 0) return;
    const frameA = decoderA.frames.value[Math.min(currentFrame.value, decoderA.frames.value.length - 1)];
    const delay = (frameA?.delay || 100) / speed.value;
    animationTimer = setTimeout(() => {
        const next = (currentFrame.value + 1) % totalFrames.value;
        currentFrame.value = next;
        updateFrameUrls(next);
        scheduleNext();
    }, delay);
}

function nextFrame() {
    if (playing.value) return;
    const next = Math.min(currentFrame.value + 1, totalFrames.value - 1);
    currentFrame.value = next;
    updateFrameUrls(next);
}

function prevFrame() {
    if (playing.value) return;
    const prev = Math.max(currentFrame.value - 1, 0);
    currentFrame.value = prev;
    updateFrameUrls(prev);
}

function goToFirst() {
    if (playing.value) return;
    currentFrame.value = 0;
    updateFrameUrls(0);
}
function goToLast() {
    if (playing.value) return;
    const l = totalFrames.value - 1;
    currentFrame.value = l;
    updateFrameUrls(l);
}

function onScrub(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (playing.value) stopPlaying();
    currentFrame.value = val;
    updateFrameUrls(val);
}

function handleKeydown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === 'ArrowRight' || e.key === 'd') {
        e.preventDefault();
        nextFrame();
    } else if (e.key === 'ArrowLeft' || e.key === 'a') {
        e.preventDefault();
        prevFrame();
    } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
    }
}

watch(speed, () => {
    if (playing.value) {
        if (animationTimer) clearTimeout(animationTimer);
        scheduleNext();
    }
});

async function loadBoth() {
    currentFrame.value = 0;
    stopPlaying();
    await Promise.all([decoderA.decode(props.actualUrl), decoderB.decode(props.baselineUrl)]);
    await nextTick();
    updateFrameUrls(0);
}

watch(
    () => [props.actualUrl, props.baselineUrl],
    () => loadBoth(),
);
onMounted(() => loadBoth());
onUnmounted(() => stopPlaying());
</script>
