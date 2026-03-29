<template>
    <div
        class="flex flex-col gap-4 outline-none"
        tabindex="0"
        @keydown="handleKeydown"
        @click="($event.currentTarget as HTMLElement)?.focus()"
    >
        <!-- Loading State -->
        <div
            v-if="loading"
            class="flex items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200"
        >
            <div class="flex flex-col items-center gap-3">
                <div class="w-8 h-8 border-3 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                <span class="text-sm text-slate-500">Decoding GIF frames...</span>
            </div>
        </div>

        <!-- Error State -->
        <div
            v-else-if="error"
            class="flex items-center justify-center h-64 bg-red-50 rounded-xl border border-red-200"
        >
            <span class="text-sm text-red-500">{{ error }}</span>
        </div>

        <!-- Player -->
        <template v-else-if="frames.length > 0">
            <!-- Canvas -->
            <div class="relative inline-block bg-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                <canvas
                    ref="canvasEl"
                    class="max-w-full h-auto rounded-xl block mx-auto"
                    :style="{ imageRendering: 'pixelated' }"
                />

                <!-- Frame counter overlay -->
                <div class="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-mono rounded-lg">
                    {{ currentFrame + 1 }} / {{ frames.length }}
                </div>

                <!-- Play/Pause overlay button (center) -->
                <button
                    @click="togglePlay"
                    class="absolute bottom-3 right-3 w-9 h-9 flex items-center justify-center bg-black/50 backdrop-blur-sm text-white rounded-full hover:bg-black/70 transition-colors cursor-pointer"
                    :title="playing ? 'Pause' : 'Play'"
                >
                    <svg
                        v-if="!playing"
                        class="w-4 h-4 ml-0.5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M8 5v14l11-7z" />
                    </svg>
                    <svg
                        v-else
                        class="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                </button>
            </div>

            <!-- Controls -->
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
                        :max="frames.length - 1"
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

                <!-- Bottom Row: Play controls + Speed + Frame info -->
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <div class="flex items-center gap-2">
                        <button
                            @click="goToFirst"
                            :disabled="playing"
                            class="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                            title="First frame"
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
                            title="Last frame"
                        >
                            ⏭
                        </button>
                    </div>

                    <!-- Speed Control -->
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

                    <!-- Frame Info -->
                    <div class="flex items-center gap-3 text-xs text-slate-400">
                        <span class="font-mono"> Frame {{ currentFrame + 1 }}/{{ frames.length }} </span>
                        <span
                            v-if="frames[currentFrame]"
                            class="font-mono"
                        >
                            {{ frames[currentFrame].delay }}ms
                        </span>
                    </div>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { useGifDecoder } from '@/composables/useGifDecoder';
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';

const props = defineProps<{
    src: string;
    label?: string;
}>();

const canvasEl = ref<HTMLCanvasElement | null>(null);
const currentFrame = ref(0);
const playing = ref(false);
const speed = ref(1);
const speeds = [0.25, 0.5, 1, 2, 4];

const { frames, loading, error, decode, renderToCanvas } = useGifDecoder();

let animationTimer: ReturnType<typeof setTimeout> | null = null;

function renderFrame(index: number) {
    if (!canvasEl.value) return;
    renderToCanvas(canvasEl.value, index);
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
    if (!playing.value || frames.value.length === 0) return;
    const frame = frames.value[currentFrame.value];
    const delay = frame.delay / speed.value;
    animationTimer = setTimeout(() => {
        const next = (currentFrame.value + 1) % frames.value.length;
        currentFrame.value = next;
        renderFrame(next);
        scheduleNext();
    }, delay);
}

function nextFrame() {
    if (playing.value) return;
    const next = Math.min(currentFrame.value + 1, frames.value.length - 1);
    currentFrame.value = next;
    renderFrame(next);
}

function prevFrame() {
    if (playing.value) return;
    const prev = Math.max(currentFrame.value - 1, 0);
    currentFrame.value = prev;
    renderFrame(prev);
}

function goToFirst() {
    if (playing.value) return;
    currentFrame.value = 0;
    renderFrame(0);
}

function goToLast() {
    if (playing.value) return;
    const last = frames.value.length - 1;
    currentFrame.value = last;
    renderFrame(last);
}

function onScrub(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value);
    if (playing.value) stopPlaying();
    currentFrame.value = val;
    renderFrame(val);
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

watch(
    () => props.src,
    (newSrc) => {
        stopPlaying();
        currentFrame.value = 0;
        decode(newSrc).then(() => {
            nextTick(() => renderFrame(0));
        });
    },
);

onMounted(() => {
    decode(props.src).then(() => {
        nextTick(() => renderFrame(0));
    });
});

onUnmounted(() => {
    stopPlaying();
});
</script>
