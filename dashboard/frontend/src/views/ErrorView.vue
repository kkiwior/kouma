<template>
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
        <div class="text-center animate-fade-in">
            <img
                :src="'/public/image/kouma-error.webp'"
                alt="Error"
                class="w-192 h-128 object-contain mx-auto mb-8 opacity-80"
                @error="hideImage"
                v-show="showImage"
            />
            <h1 class="text-6xl font-bold text-slate-300 mb-4">404</h1>
            <h2 class="text-2xl font-semibold text-slate-700 mb-2">Page Not Found</h2>
            <p class="text-slate-500 mb-8 max-w-md mx-auto">
                {{ message || "The page you're looking for doesn't exist or has been moved." }}
            </p>
            <router-link
                to="/"
                class="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors"
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
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                </svg>
                Back to Dashboard
            </router-link>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const message = ref((route.query.message as string) || '');
const showImage = ref(true);

const hideImage = () => {
    showImage.value = false;
};
</script>
