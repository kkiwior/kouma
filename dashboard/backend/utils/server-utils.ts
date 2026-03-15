import jwt from 'jsonwebtoken';
import { authMode } from '../config/auth.config.ts';
import { Build } from '../models/build';
import { Project } from '../models/project';
import { buildService } from '../services/build-service.ts';
import { caseService } from '../services/case-service.ts';
import { parseCookies, unauthorized, forbidden } from '../src/helpers.ts';
import { authKey, credential } from './auth-utils.ts';
import { formatTime } from './common-utils.ts';
import { logger } from './logger.ts';

export function verifyJwt(token: string): boolean {
    try {
        jwt.verify(token, credential.accessTokenSecret);
        return true;
    } catch {
        return false;
    }
}

export function getUserFromRequest(req: Request): string {
    if (authMode === 'none') return '';
    try {
        const cookies = parseCookies(req);
        const token = cookies[authKey as string] as string | undefined;
        if (!token) return '';
        const decoded = jwt.verify(token, credential.accessTokenSecret) as Record<string, unknown>;
        if (typeof decoded.email === 'string') return decoded.email;
        return '';
    } catch {
        return '';
    }
}

export function requireApiAuth(req: Request): Response | null {
    if (authMode === 'none') return null;

    const cookies = parseCookies(req);
    const token = cookies[authKey as string] as string | undefined;
    if (!token) {
        logger.warn('API WARN: no-token access ...');
        return unauthorized({ message: 'Unauthorized' });
    }
    if (!verifyJwt(token)) {
        logger.warn('API WARN: incorrect-token access ...');
        return unauthorized({ message: 'Unauthorized' });
    }
    return null;
}

export function requireApiKey(req: Request): Response | null {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
        return forbidden({ code: 403, message: 'missing API Key' });
    }
    return null;
}

export function safeErrorMessage(error: unknown): string {
    if (process.env.NODE_ENV === 'production') return 'Internal server error';
    return error instanceof Error ? error.message : String(error);
}

export function getHost(req: Request): string {
    return req.headers.get('host') || 'localhost';
}

export async function retrieveProjectInfo(): Promise<unknown[]> {
    const allProjects = await Project.find({}).lean();

    const buildStats = await Build.aggregate([
        { $sort: { _id: -1 } },
        {
            $group: {
                _id: '$pid',
                buildsCount: { $sum: 1 },
                latestBuildResult: { $first: '$buildResult' },
                latestBuildCreatedAt: { $first: '$createdAt' },
            },
        },
    ]);
    const statsMap = new Map(buildStats.map((s) => [s._id, s]));
    return allProjects.map((project) => {
        const stats = statsMap.get(project.pid);
        return {
            pid: project.pid,
            projectName: project.projectName,
            projectDisplayName: project.projectDisplayName,
            projectImageUrl: project.projectImageUrl,
            latestBuildResult: stats?.latestBuildResult ?? '',
            latestBuildTime: stats?.latestBuildCreatedAt ? formatTime(stats.latestBuildCreatedAt) : '',
            totalBuildsNumber: stats?.buildsCount ?? 0,
            labels: project.labels || [],
        };
    });
}

export function allCasesPassed(allCases: Array<{ caseResult: string }>): boolean {
    for (const eachCase of allCases) {
        if (eachCase.caseResult !== 'passed') return false;
    }
    return true;
}

export async function passBuild(pid: string, bid: string, allTestCaseCount: number): Promise<void> {
    await buildService.updateTestCaseCount(pid, bid, {
        casePassedCount: allTestCaseCount,
        caseFailedCount: 0,
        caseUndeterminedCount: 0,
        casePassedByIgnoringRectanglesCount: 0,
    });
    await buildService.updateBuildResult(bid, 'passed');
}

export async function checkAndUpdateBuildResult(bid: string): Promise<void> {
    const allCases = await caseService.getBuildCases(bid);
    if (!allCases || allCases.length === 0) return;
    let [passedCount, failedCount, undeterminedCount, passedByIgnoringRectanglesCount] = [0, 0, 0, 0];
    for (const testCase of allCases) {
        switch (testCase.caseResult) {
            case 'undetermined':
                undeterminedCount += 1;
                break;
            case 'failed':
                failedCount += 1;
                break;
            case 'passed':
                passedCount += 1;
                break;
        }
        if (testCase.comprehensiveCaseResult === 'passed') {
            passedByIgnoringRectanglesCount += 1;
        }
    }
    await buildService.updateTestCaseCount(allCases[0].pid, allCases[0].bid, {
        casePassedCount: passedCount,
        caseFailedCount: failedCount,
        caseUndeterminedCount: undeterminedCount,
        casePassedByIgnoringRectanglesCount: passedByIgnoringRectanglesCount,
    });
    const buildResult = undeterminedCount ? 'undetermined' : failedCount > passedByIgnoringRectanglesCount ? 'failed' : 'passed';
    await buildService.updateBuildResult(allCases[0].bid, buildResult);
}

export function validateProjectName(name: string): string | null {
    if (!name || name.length < 1 || name.length > 20) {
        return 'project name, length must less than 20';
    }
    if (!/^[a-zA-Z0-9\-_\s]+$/.test(name)) {
        return 'only accept letters in [a-zA-Z0-9\\s\\-_]';
    }
    return null;
}
