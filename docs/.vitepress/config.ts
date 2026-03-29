import { defineConfig } from 'vitepress';

export default defineConfig({
    title: 'Kouma',
    description: 'Pixel-based visual regression testing solution',
    base: '/kouma',
    ignoreDeadLinks: [/localhost/],
    head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '%%base%%logo.svg' }]],
    themeConfig: {
        logo: '/logo.svg',
        nav: [
            { text: 'Guide', link: '/guide/introduction' },
            { text: 'Reference', link: '/reference/cli' },
            {
                text: 'Links',
                items: [
                    { text: 'GitHub', link: 'https://github.com/kkiwior/kouma' },
                    { text: 'npm', link: 'https://www.npmjs.com/package/kouma-client' },
                    { text: 'Helm Chart', link: 'https://github.com/kkiwior/kouma/pkgs/container/charts%2Fkouma' },
                ],
            },
        ],
        sidebar: {
            '/guide/': [
                {
                    text: 'Getting Started',
                    items: [
                        { text: 'Introduction', link: '/guide/introduction' },
                        { text: 'Installation', link: '/guide/installation' },
                    ],
                },
                {
                    text: 'Features',
                    items: [
                        { text: 'Dashboard', link: '/guide/dashboard' },
                        { text: 'Engine', link: '/guide/engine' },
                        { text: 'Authentication', link: '/guide/authentication' },
                    ],
                },
                {
                    text: 'Integrations',
                    items: [
                        { text: 'Client Library', link: '/guide/client-library' },
                        { text: 'Cypress Plugin', link: '/guide/cypress' },
                        { text: 'Playwright Reporter', link: '/guide/playwright' },
                    ],
                },
            ],
            '/reference/': [
                {
                    text: 'Reference',
                    items: [
                        { text: 'CLI', link: '/reference/cli' },
                        { text: 'Client API', link: '/reference/client-api' },
                        { text: 'Helm Chart', link: '/reference/helm-chart' },
                        { text: 'Configuration', link: '/reference/configuration' },
                        { text: 'Architecture', link: '/reference/architecture' },
                    ],
                },
            ],
        },
        socialLinks: [{ icon: 'github', link: 'https://github.com/kkiwior/kouma' }],
        search: { provider: 'local' },
        editLink: { pattern: 'https://github.com/kkiwior/kouma/edit/main/docs/:path', text: 'Edit this page on GitHub' },
        footer: { message: 'Released under the MIT License.', copyright: 'Copyright © 2024-present Kouma Contributors' },
    },
});
