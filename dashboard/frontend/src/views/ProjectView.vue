<template>
    <div class="animate-fade-in">
        <!-- Header -->
        <div class="bg-white border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <!-- Breadcrumb -->
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
                    <span class="text-slate-900 font-medium">{{ projectName }}</span>
                </nav>

                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <h1 class="text-2xl font-bold text-slate-900">{{ projectName }}</h1>

                    <!-- Actions -->
                    <div class="flex flex-wrap gap-2">
                        <button
                            @click="activeModal = 'settings'"
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            ⚙️ Settings
                        </button>
                        <router-link
                            :to="`/project/${pid}/webhooks`"
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            🔔 Webhooks
                        </router-link>
                        <router-link
                            :to="`/project/${pid}/analytics`"
                            class="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                            📊 Analytics
                        </router-link>
                        <router-link
                            :to="`/project/${pid}/activity-logs`"
                            class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                            📋 Activity Log
                        </router-link>

                        <button
                            @click="activeModal = 'clean'"
                            class="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                            🧹 Clean
                        </button>
                        <button
                            @click="activeModal = 'delete'"
                            class="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                        >
                            🗑️ Delete
                        </button>
                    </div>
                </div>

                <!-- Project Info -->
                <div class="mt-4 flex flex-wrap gap-4 text-sm">
                    <div class="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <span class="text-slate-500">PID:</span>
                        <code class="text-slate-700 font-mono text-xs select-all">{{ pid }}</code>
                    </div>
                    <div class="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg">
                        <span class="text-slate-500">API Key:</span>
                        <code class="text-slate-700 font-mono text-xs select-all">{{ apiKey }}</code>
                    </div>
                </div>
            </div>
        </div>

        <!-- Builds Table -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Loading -->
            <div
                v-if="loading"
                class="space-y-4"
            >
                <div
                    v-for="i in 5"
                    :key="i"
                    class="bg-white rounded-xl border border-slate-200 p-4 animate-pulse"
                >
                    <div class="flex items-center gap-4">
                        <div class="h-5 bg-slate-200 rounded w-20" />
                        <div class="h-5 bg-slate-200 rounded w-24" />
                        <div class="flex-1" />
                        <div class="h-5 bg-slate-200 rounded w-32" />
                    </div>
                </div>
            </div>

            <!-- Empty State -->
            <div
                v-else-if="builds.length === 0"
                class="text-center py-20"
            >
                <svg
                    class="w-16 h-16 mx-auto text-slate-300 mb-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                </svg>
                <h3 class="text-lg font-medium text-slate-500">No builds yet</h3>
                <p class="text-slate-400 text-sm mt-1">Builds will appear here once created.</p>
            </div>

            <!-- Builds List -->
            <div
                v-else
                class="space-y-3"
            >
                <router-link
                    v-for="build in builds"
                    :key="build.bid"
                    :to="`/build/${build.bid}`"
                    class="block bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
                        <!-- Build Index -->
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="flex flex-col shrink-0 min-w-[4.5rem]">
                                <span class="text-lg font-bold text-slate-900"> #{{ build.buildIndex }} </span>
                                <span
                                    class="text-[10px] text-slate-400 font-mono truncate max-w-[100px]"
                                    :title="build.buildVersion"
                                >
                                    {{ build.buildVersion }}
                                </span>
                            </div>

                            <!-- Result Badge -->
                            <span
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold shrink-0"
                                :class="resultBadgeClasses(build.buildResult)"
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full"
                                    :class="resultBgColor(build.buildResult)"
                                />
                                {{ build.buildResult || 'pending' }}
                            </span>

                            <!-- Baseline Badge -->
                            <span
                                v-if="build.isBaseline"
                                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 shrink-0"
                            >
                                ★ Baseline
                            </span>
                        </div>

                        <!-- Spacer -->
                        <div class="flex-1" />

                        <!-- Case counts -->
                        <div class="flex items-center gap-3 text-sm shrink-0">
                            <span
                                v-if="build.passedCount"
                                class="text-emerald-600 font-medium"
                                :title="`${build.passedCount} passed`"
                            >
                                ✓ {{ build.passedCount }}
                            </span>
                            <span
                                v-if="build.failedCount"
                                class="text-red-600 font-medium"
                                :title="`${build.failedCount} failed`"
                            >
                                ✗ {{ build.failedCount }}
                            </span>
                            <span
                                v-if="build.undeterminedCount"
                                class="text-amber-600 font-medium"
                                :title="`${build.undeterminedCount} undetermined`"
                            >
                                ? {{ build.undeterminedCount }}
                            </span>
                        </div>

                        <!-- Timestamp -->
                        <span class="text-xs text-slate-400 shrink-0">
                            {{ formatTime(build.createdAt) }}
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

            <!-- Pagination -->
            <div
                v-if="totalPages > 1"
                class="flex items-center justify-center gap-2 mt-8"
            >
                <button
                    :disabled="!hasPrevPage"
                    @click="goToPage(currentPage - 1)"
                    class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    ← Previous
                </button>

                <template
                    v-for="p in paginationPages"
                    :key="p"
                >
                    <button
                        v-if="p !== '...'"
                        @click="goToPage(p as number)"
                        class="w-10 h-10 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        :class="p === currentPage ? 'bg-slate-900 text-white' : 'border border-slate-300 hover:bg-slate-50'"
                    >
                        {{ p }}
                    </button>
                    <span
                        v-else
                        class="px-2 text-slate-400"
                        >...</span
                    >
                </template>

                <button
                    :disabled="!hasNextPage"
                    @click="goToPage(currentPage + 1)"
                    class="px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
                >
                    Next →
                </button>
            </div>
        </div>

        <!-- Settings Modal -->
        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="activeModal === 'settings'"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    class="absolute inset-0 bg-black/50"
                    @click="activeModal = null"
                />
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <div class="flex justify-between items-center mb-6">
                        <h2 class="text-xl font-semibold text-slate-900">Project Settings</h2>
                        <button
                            @click="activeModal = null"
                            class="text-slate-400 hover:text-slate-500 transition-colors"
                            aria-label="Close settings"
                        >
                            <svg
                                class="w-6 h-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>

                    <div class="space-y-8">
                        <!-- Image Upload Section -->
                        <section>
                            <h3 class="text-lg font-medium text-slate-800 mb-4">Project Image</h3>
                            <form
                                @submit.prevent="handleUploadImage"
                                class="space-y-4"
                            >
                                <div>
                                    <input
                                        type="file"
                                        @change="onFileChange"
                                        ref="fileInput"
                                        accept="image/*"
                                        class="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 transition-colors"
                                    />
                                    <p class="text-xs text-slate-400 mt-2">
                                        Accepted format: any image (will be converted to .webp, 348x225 recommended)
                                    </p>
                                </div>
                                <div class="flex justify-end">
                                    <button
                                        type="submit"
                                        :disabled="!selectedFile || uploading"
                                        class="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {{ uploading ? 'Uploading...' : 'Upload Image' }}
                                    </button>
                                </div>
                            </form>
                        </section>

                        <hr class="border-slate-200" />

                        <!-- Configuration Section -->
                        <section>
                            <h3 class="text-lg font-medium text-slate-800 mb-4">Configuration</h3>
                            <form
                                @submit.prevent="handleSaveConfig"
                                class="space-y-5"
                            >
                                <!-- Color Threshold -->
                                <div>
                                    <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                                        Color Threshold
                                        <InfoTooltip>Controls how sensitive the pixel color comparison is. A lower value (e.g. 0.05) detects even subtle color changes, while a higher value (e.g. 0.5) ignores minor differences. Default is 0.1.</InfoTooltip>
                                    </label>
                                    <input
                                        v-model.number="config.projectColorThreshold"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="1"
                                        class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                    />
                                    <p class="text-xs text-slate-400 mt-1">Value between 0 and 1</p>
                                </div>

                                <!-- Detect Antialiasing -->
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input
                                        v-model="config.projectDetectAntialiasing"
                                        type="checkbox"
                                        class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                        Detect Antialiasing
                                        <InfoTooltip>When enabled, the comparison engine attempts to detect antialiased pixels (smoothed edges) and exclude them from the diff, reducing false positives on text and shape edges.</InfoTooltip>
                                    </span>
                                </label>

                                <!-- Ignoring Cluster -->
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input
                                        v-model="config.projectIgnoringCluster"
                                        type="checkbox"
                                        class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                        Enable Ignoring Cluster
                                        <InfoTooltip>Groups nearby differing pixels into rectangular clusters using a grid. When disabled, each differing pixel is treated individually. Enable this to get cleaner, more useful ignore regions.</InfoTooltip>
                                    </span>
                                </label>

                                <!-- Cluster Size -->
                                <div v-if="config.projectIgnoringCluster">
                                    <label class="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1">
                                        Ignoring Cluster Size
                                        <InfoTooltip>The grid cell size (in pixels) used to group differences into clusters. A smaller value creates more fine-grained clusters, while a larger value merges nearby differences into bigger regions. Default is 50.</InfoTooltip>
                                    </label>
                                    <input
                                        v-model.number="config.projectIgnoringClusterSize"
                                        type="number"
                                        min="1"
                                        max="5000"
                                        class="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                    />
                                    <p class="text-xs text-slate-400 mt-1">Value between 1 and 5000</p>
                                </div>

                                <!-- Preserve Ignoring on Rebase -->
                                <label class="flex items-center gap-3 cursor-pointer">
                                    <input
                                        v-model="config.preserveIgnoringOnRebase"
                                        type="checkbox"
                                        class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span class="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                                        Preserve Ignoring on Rebase
                                        <InfoTooltip>When enabled, manually marked ignore regions are kept after rebasing a build to a new baseline. When disabled, all ignore regions are cleared on rebase, requiring you to re-mark them.</InfoTooltip>
                                    </span>
                                </label>

                                <div class="flex justify-end pt-4">
                                    <button
                                        type="submit"
                                        :disabled="saving"
                                        class="py-2.5 px-6 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                                    >
                                        {{ saving ? 'Saving...' : 'Save Config' }}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Clean Confirmation Modal -->
        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="activeModal === 'clean'"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    class="absolute inset-0 bg-black/50"
                    @click="activeModal = null"
                />
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                    <h2 class="text-xl font-semibold text-slate-900 mb-2">Clean All Builds</h2>
                    <p class="text-slate-500 text-sm mb-6">
                        This will permanently delete all builds, test cases, and ignoring configurations. This action cannot be undone.
                    </p>
                    <div class="flex gap-3">
                        <button
                            @click="activeModal = null"
                            class="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            @click="handleClean"
                            :disabled="cleaning"
                            class="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                            {{ cleaning ? 'Cleaning...' : 'Clean All' }}
                        </button>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Delete Confirmation Modal -->
        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="activeModal === 'delete'"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <div
                    class="absolute inset-0 bg-black/50"
                    @click="activeModal = null"
                />
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                    <h2 class="text-xl font-semibold text-slate-900 mb-2">Delete Project</h2>
                    <p class="text-slate-500 text-sm mb-6">
                        This will permanently delete the project and all associated data including builds, test cases, and files. This
                        action cannot be undone.
                    </p>
                    <div class="flex gap-3">
                        <button
                            @click="activeModal = null"
                            class="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            @click="handleDelete"
                            :disabled="deleting"
                            class="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                        >
                            {{ deleting ? 'Deleting...' : 'Delete Project' }}
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
import InfoTooltip from '@/components/InfoTooltip.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Build, ProjectConfig } from '@/types';

const props = defineProps<{
    pid: string;
    page?: string;
}>();

const route = useRoute();
const router = useRouter();
const { getProject, updateProjectConfig, uploadProjectImage, cleanProject, deleteProject, loading } = useApi();
const { formatTime, resultBadgeClasses, resultBgColor } = useFormatters();

const projectName = ref('');
const apiKey = ref('');
const pid = computed(() => props.pid);
const builds = ref<Build[]>([]);
const currentPage = ref(1);
const totalPages = ref(1);
const hasNextPage = ref(false);
const hasPrevPage = ref(false);

const activeModal = ref<string | null>(null);
const saving = ref(false);
const uploading = ref(false);
const cleaning = ref(false);
const deleting = ref(false);
const selectedFile = ref<File | null>(null);

const config = ref<ProjectConfig>({
    projectColorThreshold: 0.1,
    projectDetectAntialiasing: false,
    projectIgnoringCluster: false,
    projectIgnoringClusterSize: 2,
    preserveIgnoringOnRebase: false,
});

const paginationPages = computed(() => {
    const pages: (number | string)[] = [];
    const total = totalPages.value;
    const current = currentPage.value;

    if (total <= 5) {
        for (let i = 1; i <= total; i++) pages.push(i);
    } else {
        pages.push(1);
        if (current > 3) pages.push('...');
        for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
            pages.push(i);
        }
        if (current < total - 2) pages.push('...');
        pages.push(total);
    }
    return pages;
});

const loadData = async () => {
    const page = Number(props.page) || 1;
    const data = await getProject(props.pid, page);
    if (data) {
        projectName.value = data.project.projectName;
        apiKey.value = data.project.apiKey;
        builds.value = data.builds.docs;
        currentPage.value = data.builds.page;
        totalPages.value = data.builds.totalPages;
        hasNextPage.value = data.builds.hasNextPage;
        hasPrevPage.value = data.builds.hasPrevPage;
        config.value = {
            projectColorThreshold: data.project.projectColorThreshold,
            projectDetectAntialiasing: data.project.projectDetectAntialiasing,
            projectIgnoringCluster: data.project.projectIgnoringCluster,
            projectIgnoringClusterSize: data.project.projectIgnoringClusterSize,
            preserveIgnoringOnRebase: data.project.preserveIgnoringOnRebase,
        };
    }
};

const goToPage = (page: number) => {
    router.push(`/project/${props.pid}/page/${page}`);
};

const handleSaveConfig = async () => {
    saving.value = true;
    const success = await updateProjectConfig(props.pid, config.value);
    if (success) {
        activeModal.value = null;
        await loadData();
    }
    saving.value = false;
};

const convertToWebP = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create WebP blob'));
                        return;
                    }
                    const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
                        type: 'image/webp',
                    });
                    resolve(webpFile);
                },
                'image/webp',
                0.8,
            );
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
    });
};

const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    selectedFile.value = target.files?.[0] || null;
};

const handleUploadImage = async () => {
    if (!selectedFile.value) return;
    uploading.value = true;
    try {
        const webpFile = await convertToWebP(selectedFile.value);
        const success = await uploadProjectImage(props.pid, webpFile);
        if (success) {
            activeModal.value = null;
            await loadData();
        }
    } catch (error) {
        console.error('Failed to convert or upload image:', error);
    }
    uploading.value = false;
};

const handleClean = async () => {
    cleaning.value = true;
    const success = await cleanProject(props.pid);
    if (success) {
        activeModal.value = null;
        await loadData();
    }
    cleaning.value = false;
};

const handleDelete = async () => {
    deleting.value = true;
    const success = await deleteProject(props.pid);
    if (success) {
        router.push('/');
    }
    deleting.value = false;
};

watch(() => props.page, loadData);
onMounted(loadData);
</script>
