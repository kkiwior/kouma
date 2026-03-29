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
                <p class="text-slate-400 mt-2">First Time Setup</p>
            </div>

            <!-- Passcode Card -->
            <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
                <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg
                        class="w-8 h-8 text-emerald-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                        />
                    </svg>
                </div>

                <h2 class="text-xl font-semibold text-slate-800 mb-2">Your Passcode</h2>
                <p class="text-slate-500 text-sm mb-6">Please save this passcode securely. You'll need it to log in.</p>

                <div class="bg-slate-100 rounded-xl p-4 mb-6">
                    <code class="text-2xl font-mono font-bold text-slate-900 tracking-wider select-all">
                        {{ displayPasscode }}
                    </code>
                </div>

                <button
                    @click="copyPasscode"
                    class="mb-4 px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                    {{ copied ? '✓ Copied!' : 'Copy to Clipboard' }}
                </button>

                <router-link
                    to="/login"
                    class="block w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all duration-200 text-center text-lg"
                >
                    Go to Login
                </router-link>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useClipboard } from '@vueuse/core';
import { computed } from 'vue';

const props = defineProps<{
    passcode?: string;
}>();

const displayPasscode = computed(() => props.passcode || 'N/A');

const { copy, copied } = useClipboard({ legacy: true, copiedDuring: 2000 });

const copyPasscode = async () => {
    if (props.passcode) {
        await copy(props.passcode);
    }
};
</script>
