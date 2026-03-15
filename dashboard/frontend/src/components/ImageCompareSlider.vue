<template>
    <div class="flex flex-col gap-4">
        <!-- Controls -->
        <div class="flex items-center gap-4 flex-wrap">
            <button
                @click="resetView"
                class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
                ↻ Reset View
            </button>
            <span class="text-xs text-slate-400">Scroll to zoom · Drag images to pan · Drag slider to compare</span>
        </div>

        <!-- Compare Arena -->
        <div
            ref="arena"
            class="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100 select-none"
            :style="{
                height: arenaHeight + 'px',
                touchAction: 'none',
                cursor: dragMode === 'slider' ? 'ew-resize' : dragMode === 'pan' ? 'grabbing' : 'grab',
            }"
            @wheel.prevent="onWheel"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @touchstart.prevent="onTouchStart"
            @touchmove.prevent="onTouchMove"
            @touchend="onTouchEnd"
        >
            <!-- Baseline (right side) - rendered first so it's behind -->
            <div
                class="absolute inset-0 overflow-hidden"
                :style="{ clipPath: `inset(0 0 0 ${sliderPercent}%)` }"
            >
                <img
                    ref="baselineImg"
                    :src="baselineUrl"
                    alt="Baseline"
                    class="absolute origin-top-left"
                    draggable="false"
                    :style="baselineTransformStyle"
                    @load="onBaselineLoad"
                />
                <div
                    class="absolute top-2 right-2 px-2 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded shadow pointer-events-none z-10"
                >
                    Baseline
                </div>
            </div>

            <!-- Actual (left side) - rendered on top -->
            <div
                class="absolute inset-0 overflow-hidden"
                :style="{ clipPath: `inset(0 ${100 - sliderPercent}% 0 0)` }"
            >
                <img
                    ref="actualImg"
                    :src="actualUrl"
                    alt="Actual"
                    class="absolute origin-top-left"
                    draggable="false"
                    :style="actualTransformStyle"
                    @load="onActualLoad"
                />
                <div
                    class="absolute top-2 left-2 px-2 py-0.5 text-xs font-semibold bg-orange-500 text-white rounded shadow pointer-events-none z-10"
                >
                    Actual
                </div>
            </div>

            <!-- Slider Line -->
            <div
                class="absolute top-0 bottom-0 z-20 pointer-events-none"
                :style="{ left: sliderPercent + '%', transform: 'translateX(-50%)' }"
            >
                <div class="w-0.5 h-full bg-white shadow-lg" />
            </div>

            <!-- Slider Handle -->
            <div
                class="absolute z-30 cursor-ew-resize"
                :style="{ left: sliderPercent + '%', top: '50%', transform: 'translate(-50%, -50%)' }"
                @mousedown.stop="onSliderMouseDown"
                @touchstart.stop.prevent="onSliderTouchStart"
            >
                <div
                    class="w-8 h-8 rounded-full bg-white border-2 border-slate-400 shadow-lg flex items-center justify-center hover:border-slate-600 transition-colors"
                >
                    <svg
                        class="w-4 h-4 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path d="M8 5l-5 7 5 7" />
                        <path d="M16 5l5 7-5 7" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';

const props = defineProps<{
    actualUrl: string;
    baselineUrl: string;
}>();

// Arena
const arena = ref<HTMLDivElement | null>(null);
const arenaHeight = ref(500);
const baselineImg = ref<HTMLImageElement | null>(null);
const actualImg = ref<HTMLImageElement | null>(null);

// Slider position (0-100 percent)
const sliderPercent = ref(50);

// Image transforms - unified zoom and pan (both images always share the same transform)
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);

// Image natural sizes
const actualNaturalW = ref(0);
const actualNaturalH = ref(0);
const baselineNaturalW = ref(0);
const baselineNaturalH = ref(0);

// Drag state
type DragMode = 'none' | 'slider' | 'pan';
const dragMode = ref<DragMode>('none');
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartPanX = ref(0);
const dragStartPanY = ref(0);
const dragStartSlider = ref(50);

// Touch pinch state
const lastTouchDist = ref(0);

// Computed styles - both images share the same transform
const actualTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    willChange: 'transform',
}));

const baselineTransformStyle = computed(() => ({
    transform: `translate(${panX.value}px, ${panY.value}px) scale(${zoom.value})`,
    willChange: 'transform',
}));

function fitImageToArena() {
    if (!arena.value) return;
    const arenaW = arena.value.clientWidth;

    // Use the larger of the two images for sizing, or actual if only one loaded
    const natW = Math.max(actualNaturalW.value, baselineNaturalW.value) || 800;
    const natH = Math.max(actualNaturalH.value, baselineNaturalH.value) || 600;

    const scale = arenaW / natW;
    arenaHeight.value = Math.max(300, Math.min(natH * scale, 800));

    // Fit both images with same zoom
    const fitZoom = Math.min(arenaW / natW, arenaHeight.value / natH);
    zoom.value = fitZoom;

    // Center both images
    panX.value = (arenaW - natW * fitZoom) / 2;
    panY.value = (arenaHeight.value - natH * fitZoom) / 2;

    sliderPercent.value = 50;
}

function resetView() {
    fitImageToArena();
}

// Image load handlers
function onActualLoad() {
    if (actualImg.value) {
        actualNaturalW.value = actualImg.value.naturalWidth;
        actualNaturalH.value = actualImg.value.naturalHeight;
    }
    tryFit();
}

function onBaselineLoad() {
    if (baselineImg.value) {
        baselineNaturalW.value = baselineImg.value.naturalWidth;
        baselineNaturalH.value = baselineImg.value.naturalHeight;
    }
    tryFit();
}

const imagesReady = ref(0);
function tryFit() {
    imagesReady.value++;
    if (imagesReady.value >= 2) {
        nextTick(fitImageToArena);
    }
}

// Reset when URLs change
watch(
    () => [props.actualUrl, props.baselineUrl],
    () => {
        imagesReady.value = 0;
    },
);

// Zoom (wheel) - applies to both images simultaneously
function onWheel(e: WheelEvent) {
    if (!arena.value) return;
    const rect = arena.value.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;

    const oldZoom = zoom.value;
    const newZoom = clampZoom(oldZoom * zoomFactor);
    const ratio = newZoom / oldZoom;
    panX.value = mouseX - ratio * (mouseX - panX.value);
    panY.value = mouseY - ratio * (mouseY - panY.value);
    zoom.value = newZoom;
}

function clampZoom(z: number): number {
    return Math.max(0.1, Math.min(20, z));
}

// Mouse drag (pan or slider)
function onSliderMouseDown(e: MouseEvent) {
    dragMode.value = 'slider';
    dragStartX.value = e.clientX;
    dragStartSlider.value = sliderPercent.value;
    e.preventDefault();
}

function onMouseDown(e: MouseEvent) {
    if (dragMode.value !== 'none') return;
    dragMode.value = 'pan';
    dragStartPanX.value = panX.value;
    dragStartPanY.value = panY.value;
    dragStartX.value = e.clientX;
    dragStartY.value = e.clientY;
}

function onMouseMove(e: MouseEvent) {
    if (dragMode.value === 'none') return;

    if (dragMode.value === 'slider') {
        if (!arena.value) return;
        const rect = arena.value.getBoundingClientRect();
        const dx = e.clientX - dragStartX.value;
        const pctDelta = (dx / rect.width) * 100;
        sliderPercent.value = Math.max(0, Math.min(100, dragStartSlider.value + pctDelta));
    } else if (dragMode.value === 'pan') {
        panX.value = dragStartPanX.value + (e.clientX - dragStartX.value);
        panY.value = dragStartPanY.value + (e.clientY - dragStartY.value);
    }
}

function onMouseUp() {
    dragMode.value = 'none';
}

// Touch support
function onSliderTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    dragMode.value = 'slider';
    dragStartX.value = e.touches[0].clientX;
    dragStartSlider.value = sliderPercent.value;
}

function onTouchStart(e: TouchEvent) {
    if (dragMode.value === 'slider') return;

    if (e.touches.length === 1) {
        const touch = e.touches[0];
        dragMode.value = 'pan';
        dragStartPanX.value = panX.value;
        dragStartPanY.value = panY.value;
        dragStartX.value = touch.clientX;
        dragStartY.value = touch.clientY;
    } else if (e.touches.length === 2) {
        // Pinch zoom
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        lastTouchDist.value = dist;
        dragMode.value = 'none';
    }
}

function onTouchMove(e: TouchEvent) {
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        if (dragMode.value === 'slider') {
            if (!arena.value) return;
            const rect = arena.value.getBoundingClientRect();
            const dx = touch.clientX - dragStartX.value;
            const pctDelta = (dx / rect.width) * 100;
            sliderPercent.value = Math.max(0, Math.min(100, dragStartSlider.value + pctDelta));
        } else if (dragMode.value === 'pan') {
            panX.value = dragStartPanX.value + (touch.clientX - dragStartX.value);
            panY.value = dragStartPanY.value + (touch.clientY - dragStartY.value);
        }
    } else if (e.touches.length === 2) {
        // Pinch zoom - applies to both images
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        if (lastTouchDist.value > 0) {
            const scale = dist / lastTouchDist.value;
            zoom.value = clampZoom(zoom.value * scale);
        }
        lastTouchDist.value = dist;
    }
}

function onTouchEnd() {
    dragMode.value = 'none';
    lastTouchDist.value = 0;
}

function getTouchDist(t1: Touch, t2: Touch): number {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// Resize observer
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    if (arena.value) {
        resizeObserver = new ResizeObserver(() => {
            if (imagesReady.value >= 2) {
                fitImageToArena();
            }
        });
        resizeObserver.observe(arena.value);
    }
});

onUnmounted(() => {
    resizeObserver?.disconnect();
});

// Expose for testing
defineExpose({
    sliderPercent,
    zoom,
    panX,
    panY,
    resetView,
    clampZoom,
});
</script>
