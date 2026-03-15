<template>
    <div class="animate-fade-in">
        <!-- Hero Section -->
        <div class="bg-white border-b border-slate-200">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Visual Testing Dashboard</h1>
                <p class="text-lg text-slate-500 max-w-2xl">
                    {{ dashboardContent }}
                </p>
            </div>
        </div>

        <!-- Projects Grid -->
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Filters -->
            <div class="mb-6 flex flex-col sm:flex-row gap-4 items-center">
                <input
                    v-model="searchQuery"
                    type="text"
                    placeholder="Search projects..."
                    class="w-full sm:w-1/3 px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                />
                <select
                    v-model="selectedLabel"
                    class="w-full sm:w-1/4 px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                >
                    <option value="">All Labels</option>
                    <option
                        v-for="label in allLabels"
                        :key="label"
                        :value="label"
                    >
                        {{ label }}
                    </option>
                </select>
            </div>

            <!-- Loading skeleton -->

            <div
                v-if="loading"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
                <div
                    v-for="i in 4"
                    :key="i"
                    class="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-pulse"
                >
                    <div class="h-48 bg-slate-200" />
                    <div class="p-5 space-y-3">
                        <div class="h-5 bg-slate-200 rounded w-3/4" />
                        <div class="h-4 bg-slate-200 rounded w-1/2" />
                        <div class="h-4 bg-slate-200 rounded w-2/3" />
                    </div>
                </div>
            </div>

            <!-- Projects -->
            <div
                v-else
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
                <!-- Project Cards -->
                <router-link
                    v-for="project in filteredAndSortedProjects"
                    :key="project.pid"
                    :to="`/project/${project.pid}/page/1`"
                    class="group bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all duration-300 transform hover:-translate-y-1"
                >
                    <!-- Project Image -->
                    <div class="relative h-48 overflow-hidden">
                        <img
                            :src="project.projectImageUrl"
                            :alt="project.projectDisplayName"
                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            @error="handleImageError"
                        />
                        <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div class="absolute bottom-0 left-0 right-0 p-4">
                            <h3 class="text-white font-semibold text-lg truncate">
                                {{ project.projectDisplayName || project.projectName }}
                            </h3>
                        </div>
                    </div>

                    <!-- Project Info -->
                    <div class="p-4 space-y-3">
                        <!-- Build Result Badge -->
                        <div class="flex items-center justify-between">
                            <span
                                v-if="project.latestBuildResult"
                                class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
                                :class="resultBadgeClasses(project.latestBuildResult)"
                            >
                                <span
                                    class="w-1.5 h-1.5 rounded-full"
                                    :class="resultBgColor(project.latestBuildResult)"
                                />
                                {{ project.latestBuildResult }}
                            </span>
                            <span
                                v-else
                                class="text-xs text-slate-400"
                                >No builds yet</span
                            >

                            <span class="text-xs text-slate-500 font-medium">
                                {{ project.totalBuildsNumber }}
                                {{ project.totalBuildsNumber === 1 ? 'build' : 'builds' }}
                            </span>
                        </div>

                        <!-- Build Time -->
                        <p
                            v-if="project.latestBuildTime"
                            class="text-xs text-slate-400"
                        >
                            Last build: {{ project.latestBuildTime }}
                        </p>

                        <div
                            class="flex flex-wrap gap-1 mt-2"
                            v-if="project.labels && project.labels.length > 0"
                        >
                            <span
                                v-for="label in project.labels"
                                :key="label"
                                class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                                {{ label }}
                            </span>
                        </div>
                    </div>
                </router-link>

                <!-- New Project Card -->
                <div
                    class="bg-white rounded-2xl shadow-sm border-2 border-dashed border-slate-300 overflow-hidden hover:border-slate-400 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center min-h-[320px] cursor-pointer group"
                    @click="showNewProjectModal = true"
                >
                    <div class="text-center p-6">
                        <div
                            class="w-16 h-16 rounded-full border-2 border-slate-300 group-hover:border-slate-500 flex items-center justify-center mx-auto mb-4 transition-colors"
                        >
                            <svg
                                class="w-8 h-8 text-slate-400 group-hover:text-slate-600 transition-colors"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="2"
                                    d="M12 4v16m8-8H4"
                                />
                            </svg>
                        </div>
                        <p class="text-slate-500 group-hover:text-slate-700 font-medium transition-colors">New Project</p>
                        <p class="text-slate-400 text-sm mt-1">Create a new testing project</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- New Project Modal -->
        <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
        >
            <div
                v-if="showNewProjectModal"
                class="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
                <!-- Backdrop -->
                <div
                    class="absolute inset-0 bg-black/50"
                    @click="showNewProjectModal = false"
                />

                <!-- Modal -->
                <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                    <h2 class="text-xl font-semibold text-slate-900 mb-4">Create New Project</h2>

                    <form @submit.prevent="handleCreateProject">
                        <div class="mb-4">
                            <label
                                for="projectName"
                                class="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Project Name
                            </label>
                            <input
                                id="projectName"
                                v-model="newProjectName"
                                type="text"
                                placeholder="e.g., my-project"
                                required
                                maxlength="20"
                                pattern="[a-zA-Z0-9\-_\s]+"
                                class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                            <p class="text-xs text-slate-400 mt-1">
                                Max 20 characters. Letters, numbers, spaces, hyphens, and underscores only.
                            </p>
                        </div>

                        <div class="mb-4">
                            <label
                                for="projectLabels"
                                class="block text-sm font-medium text-slate-700 mb-2"
                            >
                                Project Labels (Optional)
                            </label>
                            <input
                                id="projectLabels"
                                v-model="newProjectLabels"
                                type="text"
                                placeholder="e.g., label1, label2"
                                class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                            />
                            <p class="text-xs text-slate-400 mt-1">Comma-separated list of labels.</p>
                        </div>

                        <hr class="my-4 border-slate-200" />

                        <div class="mb-4">
                            <label class="block text-sm font-medium text-slate-700 mb-2">Project Image (Optional)</label>
                            <input
                                type="file"
                                @change="onFileChange"
                                accept="image/*"
                                class="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 transition-colors"
                            />
                            <p class="text-xs text-slate-400 mt-1">Accepted format: any image (will be converted to .webp)</p>
                        </div>

                        <hr class="my-4 border-slate-200" />

                        <div class="space-y-4 mb-6">
                            <h3 class="text-sm font-medium text-slate-800">Configuration</h3>
                            <div>
                                <label class="block text-sm font-medium text-slate-700 mb-1">Color Threshold</label>
                                <input
                                    v-model.number="newProjectConfig.projectColorThreshold"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    class="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                />
                            </div>

                            <label class="flex items-center gap-3 cursor-pointer">
                                <input
                                    v-model="newProjectConfig.projectDetectAntialiasing"
                                    type="checkbox"
                                    class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span class="text-sm font-medium text-slate-700">Detect Antialiasing</span>
                            </label>

                            <label class="flex items-center gap-3 cursor-pointer">
                                <input
                                    v-model="newProjectConfig.projectIgnoringCluster"
                                    type="checkbox"
                                    class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span class="text-sm font-medium text-slate-700">Enable Ignoring Cluster</span>
                            </label>

                            <div v-if="newProjectConfig.projectIgnoringCluster">
                                <label class="block text-sm font-medium text-slate-700 mb-1">Ignoring Cluster Size</label>
                                <input
                                    v-model.number="newProjectConfig.projectIgnoringClusterSize"
                                    type="number"
                                    min="1"
                                    max="5000"
                                    class="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                                />
                            </div>

                            <label class="flex items-center gap-3 cursor-pointer">
                                <input
                                    v-model="newProjectConfig.preserveIgnoringOnRebase"
                                    type="checkbox"
                                    class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span class="text-sm font-medium text-slate-700">Preserve Ignoring on Rebase</span>
                            </label>
                        </div>

                        <p
                            v-if="createError"
                            class="text-red-500 text-sm mb-4"
                        >
                            {{ createError }}
                        </p>

                        <div class="flex gap-3">
                            <button
                                type="button"
                                @click="showNewProjectModal = false"
                                class="flex-1 py-2.5 px-4 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                :disabled="!newProjectName || creating"
                                class="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white rounded-xl transition-colors font-medium cursor-pointer disabled:cursor-not-allowed"
                            >
                                {{ creating ? 'Creating...' : 'Create' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { useFormatters } from '@/composables/useFormatters';
import { ref, onMounted, computed } from 'vue';
import type { Project, ProjectConfig } from '@/types';

const { getDashboard, createProject, updateProjectConfig, uploadProjectImage, loading } = useApi();
const { resultBadgeClasses, resultBgColor } = useFormatters();

const projects = ref<Project[]>([]);
const dashboardContent = ref('');

const allLabels = computed(() => {
    const labels = new Set<string>();
    projects.value.forEach((p) => {
        if (p.labels) {
            p.labels.forEach((l) => labels.add(l));
        }
    });
    return Array.from(labels).sort();
});

const filteredAndSortedProjects = computed(() => {
    let result = projects.value;

    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter((p) => (p.projectDisplayName || p.projectName).toLowerCase().includes(query));
    }

    if (selectedLabel.value) {
        result = result.filter((p) => p.labels && p.labels.includes(selectedLabel.value));
    }

    return result;
});

const showNewProjectModal = ref(false);
const searchQuery = ref('');
const selectedLabel = ref('');
const newProjectName = ref('');
const newProjectLabels = ref('');
const creating = ref(false);
const createError = ref('');
const selectedFile = ref<File | null>(null);

const newProjectConfig = ref<ProjectConfig>({
    projectColorThreshold: 0,
    projectDetectAntialiasing: true,
    projectIgnoringCluster: true,
    projectIgnoringClusterSize: 100,
    preserveIgnoringOnRebase: true,
});

const onFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
        selectedFile.value = target.files[0];
    }
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
                    resolve(new File([blob], file.name.replace(/.[^/.]+$/, '.webp'), { type: 'image/webp' }));
                },
                'image/webp',
                0.8,
            );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = objectUrl;
    });
};

const handleImageError = (e: Event) => {
    const img = e.target as HTMLImageElement;
    img.src = '/public/image/kouma-bg.webp';
};

const loadData = async () => {
    const data = await getDashboard();
    if (data) {
        projects.value = data.projects;
        dashboardContent.value = data.dashboardContent;
    }
};

const handleCreateProject = async () => {
    creating.value = true;
    createError.value = '';

    const result = await createProject(
        newProjectName.value,
        newProjectLabels.value
            .split(',')
            .map((l) => l.trim())
            .filter((l) => l.length > 0),
    );

    if (result.success && result.pid) {
        await updateProjectConfig(result.pid, newProjectConfig.value);
        if (selectedFile.value) {
            try {
                const webpFile = await convertToWebP(selectedFile.value);
                await uploadProjectImage(result.pid, webpFile);
            } catch (err) {
                console.error('Failed to convert or upload image:', err);
            }
        }

        showNewProjectModal.value = false;
        newProjectName.value = '';
        newProjectLabels.value = '';
        selectedFile.value = null;
        newProjectConfig.value = {
            projectColorThreshold: 0,
            projectDetectAntialiasing: true,
            projectIgnoringCluster: true,
            projectIgnoringClusterSize: 100,
            preserveIgnoringOnRebase: true,
        };
        await loadData();
    } else {
        createError.value = result.error || 'Failed to create project';
    }

    creating.value = false;
};

onMounted(loadData);
</script>
