import type { RouteRecordRaw } from 'vue-router';

export const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('@/layouts/DashboardLayout.vue'),
        children: [
            { path: '', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
            { path: 'project/:pid', name: 'project', component: () => import('@/views/ProjectView.vue'), props: true },
            { path: 'project/:pid/page/:page', name: 'project-page', component: () => import('@/views/ProjectView.vue'), props: true },
            { path: 'build/:bid', name: 'build', component: () => import('@/views/BuildView.vue'), props: true },
            { path: 'project/:pid/webhooks', name: 'webhooks', component: () => import('@/views/WebhookView.vue'), props: true },
            { path: 'project/:pid/analytics', name: 'analytics', component: () => import('@/views/AnalyticsView.vue'), props: true },
            {
                path: 'project/:pid/activity-logs',
                name: 'activity-logs',
                component: () => import('@/views/ActivityLogView.vue'),
                props: true,
            },
            { path: 'case/:cid', name: 'case', component: () => import('@/views/CaseView.vue'), props: true },
        ],
    },
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue') },
    {
        path: '/initialize',
        name: 'initialize',
        component: () => import('@/views/InitializeView.vue'),
        props: (route) => ({ passcode: route.query.passcode }),
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/ErrorView.vue') },
];
