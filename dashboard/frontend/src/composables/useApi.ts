import { ref } from 'vue';
import type {
    DashboardData,
    BuildDetail,
    CaseDetail,
    PaginatedBuilds,
    ProjectDetail,
    LoginResponse,
    AuthConfig,
    ProjectConfig,
    Rectangle,
    WebhookConfig,
    WebhookTestResult,
    ProjectAnalytics,
    ActivityLogsResponse,
} from '@/types';

class AppApiError extends Error {
    constructor(
        public status: number,
        public message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

const api = {
    async request<T>(method: string, url: string, data?: any, options: RequestInit = {}): Promise<{ data: T }> {
        const headers = new Headers(options.headers);
        if (!(data instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
        }

        const config: RequestInit = { method, credentials: 'include', headers, ...options };

        if (data) {
            config.body = data instanceof FormData ? data : JSON.stringify(data);
        }

        const response = await fetch(`/api${url}`, config);

        if (!response.ok) {
            let message = response.statusText;
            try {
                const errorData = await response.json();
                if (errorData?.message) message = errorData.message;
            } catch {}
            throw new AppApiError(response.status, message);
        }

        const text = await response.text();
        const responseData = text ? JSON.parse(text) : undefined;
        return { data: responseData };
    },
    get: <T>(url: string, options?: RequestInit) => api.request<T>('GET', url, undefined, options),
    post: <T>(url: string, data?: any, options?: RequestInit) => api.request<T>('POST', url, data, options),
    put: <T>(url: string, data?: any, options?: RequestInit) => api.request<T>('PUT', url, data, options),
    delete: <T>(url: string, options?: RequestInit) => api.request<T>('DELETE', url, undefined, options),
};

export function useApi() {
    const loading = ref(false);
    const error = ref<string | null>(null);

    const handleError = (err: unknown): string => {
        if (err instanceof AppApiError) {
            if (err.status === 401 || err.status === 403) {
                window.location.href = '/login';
                return 'Unauthorized';
            }
            return err.message;
        }
        return String(err instanceof Error ? err.message : err);
    };

    const getAuthConfig = async (): Promise<AuthConfig> => {
        try {
            const { data } = await api.get<AuthConfig>('/auth/config');
            return data;
        } catch {
            return { authMode: 'passcode' };
        }
    };

    const login = async (passcode: string): Promise<LoginResponse> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.post<LoginResponse>('/auth/login', { passcode });
            return data;
        } catch (err) {
            error.value = handleError(err);
            return { success: false, error: error.value };
        } finally {
            loading.value = false;
        }
    };

    const checkAuth = async (): Promise<LoginResponse> => {
        try {
            const { data } = await api.get<LoginResponse>('/auth/check');
            return data;
        } catch {
            return { success: false };
        }
    };

    const logout = async (): Promise<void> => {
        await api.post('/auth/logout');
    };

    const getDashboard = async (): Promise<DashboardData | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<DashboardData>('/dashboard');
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const getProject = async (pid: string, page: number = 1): Promise<{ project: ProjectDetail; builds: PaginatedBuilds } | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<{ project: ProjectDetail; builds: PaginatedBuilds }>(`/project/${pid}/page/${page}`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const createProject = async (
        projectName: string,
        labels: string[] = [],
    ): Promise<{ success: boolean; pid?: string; error?: string }> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.post<{ pid: string }>('/admin/project/create', { projectName, labels });
            return { success: true, pid: data.pid };
        } catch (err) {
            error.value = handleError(err);
            return { success: false, error: error.value };
        } finally {
            loading.value = false;
        }
    };

    const updateProjectConfig = async (pid: string, config: ProjectConfig): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/admin/project/config/${pid}`, config);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const uploadProjectImage = async (pid: string, file: File): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            const formData = new FormData();
            formData.append('projectImage', file);
            await api.post(`/admin/project/image/${pid}`, formData);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const cleanProject = async (pid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/admin/project/clean/${pid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const deleteProject = async (pid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/admin/project/delete/${pid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const getBuild = async (bid: string): Promise<BuildDetail | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<BuildDetail>(`/build/${bid}`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const rebaseBuild = async (bid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/build/rebase/${bid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const debaseBuild = async (bid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/build/debase/${bid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const passAllCases = async (bid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/build/pass/${bid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const getCase = async (cid: string, onlyFails: boolean = false): Promise<CaseDetail | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<CaseDetail>(`/case/${cid}${onlyFails ? '?onlyFails=true' : ''}`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const passCase = async (cid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/case/pass/${cid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const failCase = async (cid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/case/fail/${cid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const saveIgnoringRectangles = async (pid: string, caseName: string, rectangles: Rectangle[]): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post('/case/ignoring', { pid, caseName, rectangles });
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const getProjectAnalytics = async (pid: string): Promise<ProjectAnalytics | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<ProjectAnalytics>(`/project/${pid}/analytics`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    const getWebhooks = async (pid: string): Promise<WebhookConfig[]> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<{ webhooks: WebhookConfig[] }>(`/project/${pid}/webhooks`);
            return data.webhooks;
        } catch (err) {
            error.value = handleError(err);
            return [];
        } finally {
            loading.value = false;
        }
    };

    const createWebhook = async (pid: string, webhook: Partial<WebhookConfig>): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.post(`/project/${pid}/webhooks`, webhook);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const updateWebhook = async (wid: string, webhook: Partial<WebhookConfig>): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.put(`/webhook/${wid}`, webhook);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const deleteWebhook = async (wid: string): Promise<boolean> => {
        loading.value = true;
        error.value = null;
        try {
            await api.delete(`/webhook/${wid}`);
            return true;
        } catch (err) {
            error.value = handleError(err);
            return false;
        } finally {
            loading.value = false;
        }
    };

    const testWebhook = async (wid: string): Promise<WebhookTestResult> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.post<WebhookTestResult>(`/webhook/${wid}/test`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return { success: false, error: error.value || 'Unknown error' };
        } finally {
            loading.value = false;
        }
    };

    const getActivityLogs = async (pid: string, page: number = 1, limit: number = 50): Promise<ActivityLogsResponse | null> => {
        loading.value = true;
        error.value = null;
        try {
            const { data } = await api.get<ActivityLogsResponse>(`/project/${pid}/activity-logs?page=${page}&limit=${limit}`);
            return data;
        } catch (err) {
            error.value = handleError(err);
            return null;
        } finally {
            loading.value = false;
        }
    };

    return {
        loading,
        error,
        getAuthConfig,
        login,
        checkAuth,
        logout,
        getDashboard,
        getProject,
        createProject,
        updateProjectConfig,
        uploadProjectImage,
        cleanProject,
        deleteProject,
        getBuild,
        rebaseBuild,
        debaseBuild,
        passAllCases,
        getCase,
        passCase,
        failCase,
        saveIgnoringRectangles,
        getProjectAnalytics,
        getWebhooks,
        createWebhook,
        updateWebhook,
        deleteWebhook,
        testWebhook,
        getActivityLogs,
    };
}
