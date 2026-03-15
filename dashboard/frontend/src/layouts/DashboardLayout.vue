<template>
    <div class="min-h-screen flex flex-col bg-slate-50">
        <!-- Navbar -->
        <nav class="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <!-- Brand -->
                    <router-link
                        to="/"
                        class="flex items-center gap-3 hover:opacity-90 transition-opacity"
                    >
                        <img
                            :src="'/public/image/kouma.webp'"
                            alt="Micoo"
                            class="h-8 w-8 rounded"
                        />
                        <span class="text-xl font-bold tracking-tight">kouma</span>
                    </router-link>

                    <!-- Desktop Nav -->
                    <div class="hidden md:flex items-center gap-6">
                        <router-link
                            to="/"
                            class="text-slate-300 hover:text-white transition-colors text-sm font-medium"
                        >
                            Dashboard
                        </router-link>
                        <a
                            href="https://github.com/kkiwior/kouma"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-slate-300 hover:text-white transition-colors text-sm font-medium flex items-center gap-1.5"
                        >
                            <svg
                                class="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                                />
                            </svg>
                            GitHub
                        </a>
                        <button
                            v-if="showLogout"
                            @click="handleLogout"
                            class="ml-2 px-4 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                        >
                            Logout
                        </button>
                    </div>

                    <!-- Mobile menu button -->
                    <button
                        @click="mobileMenuOpen = !mobileMenuOpen"
                        class="md:hidden p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        aria-label="Toggle mobile menu"
                    >
                        <svg
                            class="w-6 h-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                v-if="!mobileMenuOpen"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16"
                            />
                            <path
                                v-else
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Mobile menu -->
            <transition
                enter-active-class="transition duration-200 ease-out"
                enter-from-class="opacity-0 -translate-y-2"
                enter-to-class="opacity-100 translate-y-0"
                leave-active-class="transition duration-150 ease-in"
                leave-from-class="opacity-100 translate-y-0"
                leave-to-class="opacity-0 -translate-y-2"
            >
                <div
                    v-if="mobileMenuOpen"
                    class="md:hidden border-t border-slate-700 px-4 py-3 space-y-2"
                >
                    <router-link
                        to="/"
                        class="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                        @click="mobileMenuOpen = false"
                    >
                        Dashboard
                    </router-link>
                    <a
                        href="https://github.com/nicholaswmin/Micoo"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                    >
                        GitHub
                    </a>
                    <button
                        v-if="showLogout"
                        @click="handleLogout"
                        class="w-full text-left px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                    >
                        Logout
                    </button>
                </div>
            </transition>
        </nav>

        <!-- Main content -->
        <main class="flex-1">
            <router-view v-slot="{ Component }">
                <transition
                    enter-active-class="transition duration-200 ease-out"
                    enter-from-class="opacity-0"
                    enter-to-class="opacity-100"
                    leave-active-class="transition duration-150 ease-in"
                    leave-from-class="opacity-100"
                    leave-to-class="opacity-0"
                    mode="out-in"
                >
                    <component :is="Component" />
                </transition>
            </router-view>
        </main>

        <!-- Footer -->
        <footer class="bg-white border-t border-slate-200 py-6">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <p class="text-center text-sm text-slate-500">
                    Powered by kouma (fork of
                    <a
                        href="https://github.com/Mikuu/Micoo"
                        target="_blank"
                        >Micoo</a
                    >) — Visual Testing Dashboard
                </p>
            </div>
        </footer>
    </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi';
import { getAuthConfig } from '@/router';
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const { logout } = useApi();
const mobileMenuOpen = ref(false);
const showLogout = ref(true);

onMounted(() => {
    const config = getAuthConfig();
    if (config && config.authMode === 'none') {
        showLogout.value = false;
    }
});

const handleLogout = async () => {
    await logout();
    router.push('/login');
};
</script>
