export interface Project {
    pid: string;
    projectName: string;
    projectDisplayName: string;
    projectImageUrl: string;
    latestBuildResult: string;
    latestBuildTime: string;
    totalBuildsNumber: number;
    labels?: string[];
}

export interface ProjectDetail {
    pid: string;
    projectName: string;
    apiKey: string;
    projectColorThreshold: number;
    projectDetectAntialiasing: boolean;
    projectIgnoringCluster: boolean;
    projectIgnoringClusterSize: number;
    preserveIgnoringOnRebase: boolean;
}

export interface Build {
    bid: string;
    pid: string;
    buildIndex: number;
    buildVersion: string;
    buildStatus: string;
    buildResult: string;
    isBaseline: boolean;
    passedCount: number;
    failedCount: number;
    undeterminedCount: number;
    passedByIgnoringRectangles: number;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedBuilds {
    docs: Build[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
}

export interface TestCase {
    cid: string;
    bid: string;
    pid: string;
    caseName: string;
    caseResult: string;
    comprehensiveCaseResult: string;
    linkLatest: string;
    linkBaseline: string;
    linkDiff: string;
    diffPercentage: number;
    createdAt: string;
    updatedAt: string;
}

export interface CaseDetail {
    pid: string;
    bid: string;
    cid: string;
    buildIndex: number;
    projectName: string;
    caseName: string;
    caseResult: string;
    comprehensiveCaseResult: string;
    diffUrl: string;
    latestUrl: string;
    baselineUrl: string;
    diffPercentage: number;
    view: number;
    hostUrl: string;
    rectangles: Rectangle[];
    rectanglesString: string;
    prevCase: TestCase | null;
    nextCase: TestCase | null;
}

export interface BuildDetail {
    pid: string;
    bid: string;
    buildIndex: number;
    buildVersion: string;
    projectName: string;
    isBaseline: boolean;
    isAllPassed: boolean;
    ableToRebase: boolean;
    hostUrl: string;
    metadata?: Record<string, string>;
    allCases: TestCase[];
}

export interface Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ProjectConfig {
    projectColorThreshold: number;
    projectDetectAntialiasing: boolean;
    projectIgnoringCluster: boolean;
    projectIgnoringClusterSize: number;
    preserveIgnoringOnRebase: boolean;
}

export interface DashboardData {
    projects: Project[];
    dashboardContent: string;
}

export interface LoginResponse {
    success: boolean;
    redirect?: string;
    error?: string;
    initialized?: boolean;
    passcode?: string;
}

export interface AuthConfig {
    authMode: 'none' | 'passcode' | 'microsoft' | 'google';
}

export interface ApiError {
    message: string;
    code?: number;
    errors?: Array<{ msg: string; param: string }>;
}

export interface WebhookConfig {
    wid: string;
    pid: string;
    name: string;
    url: string;
    method: 'GET' | 'POST';
    contentType: 'json' | 'query_params';
    condition: 'always' | 'success' | 'fail';
    payloadTemplate: string;
    headers: Record<string, string>;
    enabled: boolean;
    createdAt: string;
}

export interface WebhookTestResult {
    success: boolean;
    statusCode?: number;
    error?: string;
}

export interface AnalyticsRecentBuild {
    bid: string;
    buildIndex: number;
    buildVersion: string;
    buildResult: string;
    buildStatus: string;
    caseCount: number;
    passedCount: number;
    failedCount: number;
    undeterminedCount: number;
    createdAt: string;
}

export interface AnalyticsFailingCase {
    caseName: string;
    totalRuns: number;
    failCount: number;
    failRate: number;
    avgDiff: number;
    lastSeen: string;
}

export interface AnalyticsBuildActivity {
    _id: string;
    total: number;
    passed: number;
    failed: number;
}

export interface ProjectAnalytics {
    projectName: string;
    totalBuilds: number;
    totalCases: number;
    buildResultDistribution: { passed: number; failed: number; undetermined: number };
    recentBuilds: AnalyticsRecentBuild[];
    topFailingCases: AnalyticsFailingCase[];
    buildActivity: AnalyticsBuildActivity[];
    passRate: number;
}

export interface ActivityLogEntry {
    pid: string;
    action: string;
    actor: string;
    entityType: string;
    entityId: string;
    details: string;
    createdAt: string;
}

export interface ActivityLogsResponse {
    logs: ActivityLogEntry[];
    total: number;
    page: number;
    limit: number;
}
