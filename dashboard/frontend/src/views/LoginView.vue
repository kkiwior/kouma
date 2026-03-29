<template>
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
        <div class="w-full max-w-md animate-fade-in">
            <!-- Logo & Title -->
            <div class="text-center mb-8">
                <img
                    :src="'/public/image/kouma.webp'"
                    alt="Micoo"
                    class="h-16 w-16 mx-auto rounded-xl shadow-lg mb-4"
                />
                <h1 class="text-3xl font-bold text-white">kouma</h1>
                <p class="text-slate-400 mt-2">Visual Testing Dashboard</p>
            </div>

            <!-- Login Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8">
                <!-- OAuth error message -->
                <transition
                    enter-active-class="transition duration-200 ease-out"
                    enter-from-class="opacity-0 -translate-y-1"
                    enter-to-class="opacity-100 translate-y-0"
                >
                    <p
                        v-if="oauthError"
                        class="text-red-500 text-sm flex items-center gap-2 mb-4"
                    >
                        <svg
                            class="w-4 h-4 shrink-0"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        {{ oauthError }}
                    </p>
                </transition>

                <!-- Passcode login form -->
                <form
                    v-if="authConfig?.authMode === 'passcode'"
                    @submit.prevent="handleLogin"
                    class="space-y-6"
                >
                    <div>
                        <label
                            for="passcode"
                            class="block text-sm font-medium text-slate-700 mb-2"
                        >
                            Passcode
                        </label>
                        <input
                            id="passcode"
                            v-model="passcode"
                            type="password"
                            placeholder="Enter your passcode"
                            required
                            autofocus
                            class="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-lg"
                            :class="{ 'border-red-400 focus:border-red-500 focus:ring-red-200': loginFailed }"
                        />
                    </div>

                    <!-- Error message -->
                    <transition
                        enter-active-class="transition duration-200 ease-out"
                        enter-from-class="opacity-0 -translate-y-1"
                        enter-to-class="opacity-100 translate-y-0"
                    >
                        <p
                            v-if="loginFailed"
                            class="text-red-500 text-sm flex items-center gap-2"
                        >
                            <svg
                                class="w-4 h-4 shrink-0"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fill-rule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clip-rule="evenodd"
                                />
                            </svg>
                            Invalid passcode. Please try again.
                        </p>
                    </transition>

                    <button
                        type="submit"
                        :disabled="loading || !passcode"
                        class="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium rounded-xl transition-all duration-200 text-lg cursor-pointer disabled:cursor-not-allowed"
                    >
                        <span
                            v-if="loading"
                            class="flex items-center justify-center gap-2"
                        >
                            <svg
                                class="animate-spin h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                />
                                <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>
                            Signing in...
                        </span>
                        <span v-else>Sign In</span>
                    </button>
                </form>

                <!-- Microsoft OAuth login -->
                <div
                    v-else-if="authConfig?.authMode === 'microsoft'"
                    class="space-y-6"
                >
                    <p class="text-slate-600 text-center text-sm">Sign in with your Microsoft account to continue.</p>
                    <a
                        href="/api/auth/oauth/login?provider=microsoft"
                        class="w-full py-3 px-4 bg-[#2f2f2f] hover:bg-[#1a1a1a] text-white font-medium rounded-xl transition-all duration-200 text-lg flex items-center justify-center gap-3"
                    >
                        <svg
                            class="w-5 h-5"
                            viewBox="0 0 21 21"
                            fill="none"
                        >
                            <rect
                                x="1"
                                y="1"
                                width="9"
                                height="9"
                                fill="#F25022"
                            />
                            <rect
                                x="11"
                                y="1"
                                width="9"
                                height="9"
                                fill="#7FBA00"
                            />
                            <rect
                                x="1"
                                y="11"
                                width="9"
                                height="9"
                                fill="#00A4EF"
                            />
                            <rect
                                x="11"
                                y="11"
                                width="9"
                                height="9"
                                fill="#FFB900"
                            />
                        </svg>
                        Sign in with Microsoft
                    </a>
                </div>

                <!-- Google OAuth login -->
                <div
                    v-else-if="authConfig?.authMode === 'google'"
                    class="space-y-6"
                >
                    <p class="text-slate-600 text-center text-sm">Sign in with your Google account to continue.</p>
                    <a
                        href="/api/auth/oauth/login?provider=google"
                        class="w-full py-3 px-4 bg-white border-2 border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all duration-200 text-lg flex items-center justify-center gap-3"
                    >
                        <svg
                            class="w-5 h-5"
                            viewBox="0 0 24 24"
                        >
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign in with Google
                    </a>
                </div>

                <!-- Loading state -->
                <div
                    v-else
                    class="text-center py-4"
                >
                    <svg
                        class="animate-spin h-8 w-8 mx-auto text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="4"
                        />
                        <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                    <p class="text-slate-400 text-sm mt-2">Loading...</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import type { AuthConfig } from '@/types';

const router = useRouter();
const route = useRoute();
const { login, getAuthConfig, loading } = useApi();

const passcode = ref('');
const loginFailed = ref(false);
const authConfig = ref<AuthConfig | null>(null);
const oauthError = ref('');

onMounted(async () => {
    const errorParam = route.query.error as string | undefined;
    if (errorParam) {
        oauthError.value = decodeURIComponent(errorParam);
    }

    const config = await getAuthConfig();
    authConfig.value = config;

    if (config.authMode === 'none') {
        router.push('/');
    }
});

const handleLogin = async () => {
    loginFailed.value = false;

    const result = await login(passcode.value);

    if (result.success) {
        router.push('/');
    } else if (result.initialized === false) {
        router.push({ name: 'initialize', query: { passcode: result.passcode } });
    } else {
        loginFailed.value = true;
        passcode.value = '';
    }
};
</script>
