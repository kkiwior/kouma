import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    base: '/',
    resolve: { alias: { '@': fileURLToPath(new URL('./frontend/src', import.meta.url)) } },
    root: './frontend',
    build: { outDir: '../public/vue-app', emptyOutDir: true },
    server: { proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } } },
});
