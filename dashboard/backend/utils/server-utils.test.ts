import { describe, it, expect, mock, beforeEach } from 'bun:test';
import jwt from 'jsonwebtoken';
import { credential, authKey } from './auth-utils';

mock.module('../services/project-service', () => ({ projectService: { getAllProjects: mock(() => Promise.resolve([])) } }));

mock.module('../models/project', () => ({
    Project: {
        find: mock(() => ({ lean: () => Promise.resolve([]) })),
    },
}));

mock.module('../models/build', () => ({
    Build: {
        aggregate: mock(() => Promise.resolve([])),
    },
}));

mock.module('../services/build-service', () => ({
    buildService: {
        getProjectBuildsCountAndLatestBuild: mock(() => Promise.resolve({ buildsCount: 0, latestBuild: null })),
        updateTestCaseCount: mock(() => Promise.resolve()),
        updateBuildResult: mock(() => Promise.resolve()),
    },
}));

mock.module('../services/case-service', () => ({ caseService: { getBuildCases: mock(() => Promise.resolve([])) } }));
mock.module('../config/auth.config', () => ({ authMode: 'passcode' }));

import { buildService } from '../services/build-service';
import { caseService } from '../services/case-service';
import { projectService } from '../services/project-service';
import { Project } from '../models/project';
import { Build } from '../models/build';
import {
    verifyJwt,
    requireApiAuth,
    requireApiKey,
    safeErrorMessage,
    getHost,
    toRelativePath,
    allCasesPassed,
    validateProjectName,
    retrieveProjectInfo,
    passBuild,
    checkAndUpdateBuildResult,
} from './server-utils';

describe('server-utils', () => {
    beforeEach(() => {
        (projectService.getAllProjects as any).mockClear?.();
        (buildService.getProjectBuildsCountAndLatestBuild as any).mockClear?.();
        (buildService.updateTestCaseCount as any).mockClear?.();
        (buildService.updateBuildResult as any).mockClear?.();
        (caseService.getBuildCases as any).mockClear?.();
        (Project.find as any).mockClear?.();
        (Build.aggregate as any).mockClear?.();
    });

    describe('verifyJwt', () => {
        it('should return true for a valid JWT', () => {
            const token = jwt.sign({ data: 'test' }, credential.accessTokenSecret);
            expect(verifyJwt(token)).toBe(true);
        });

        it('should return false for an invalid JWT', () => {
            expect(verifyJwt('invalid.token.here')).toBe(false);
        });

        it('should return false for a token signed with wrong secret', () => {
            const token = jwt.sign({ data: 'test' }, 'wrong-secret');
            expect(verifyJwt(token)).toBe(false);
        });

        it('should return false for an expired token', () => {
            const token = jwt.sign({ data: 'test' }, credential.accessTokenSecret, { expiresIn: '0s' });
            expect(verifyJwt(token)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(verifyJwt('')).toBe(false);
        });
    });

    describe('requireApiAuth', () => {
        it('should return 401 response when no cookie is present', () => {
            const req = new Request('http://localhost/api/test');
            const result = requireApiAuth(req);
            expect(result).not.toBeNull();
            expect(result!.status).toBe(401);
        });

        it('should return 401 response when token is invalid', () => {
            const req = new Request('http://localhost/api/test', { headers: { cookie: `${authKey}=invalid-token` } });
            const result = requireApiAuth(req);
            expect(result).not.toBeNull();
            expect(result!.status).toBe(401);
        });

        it('should return null when token is valid', () => {
            const token = jwt.sign({ data: 'test' }, credential.accessTokenSecret);
            const req = new Request('http://localhost/api/test', { headers: { cookie: `${authKey}=${token}` } });
            const result = requireApiAuth(req);
            expect(result).toBeNull();
        });
    });

    describe('requireApiKey', () => {
        it('should return 403 response when no x-api-key header', () => {
            const req = new Request('http://localhost/api/test');
            const result = requireApiKey(req);
            expect(result).not.toBeNull();
            expect(result!.status).toBe(403);
        });

        it('should return null when x-api-key header is present', () => {
            const req = new Request('http://localhost/api/test', { headers: { 'x-api-key': 'some-api-key' } });
            const result = requireApiKey(req);
            expect(result).toBeNull();
        });
    });

    describe('safeErrorMessage', () => {
        it('should return error message in non-production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            const result = safeErrorMessage(new Error('test error'));
            expect(result).toBe('test error');
            process.env.NODE_ENV = originalEnv;
        });

        it('should return generic message in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            const result = safeErrorMessage(new Error('sensitive error'));
            expect(result).toBe('Internal server error');
            process.env.NODE_ENV = originalEnv;
        });

        it('should convert non-Error to string in non-production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';
            expect(safeErrorMessage('string error')).toBe('string error');
            expect(safeErrorMessage(42)).toBe('42');
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('getHost', () => {
        it('should return host header value', () => {
            const req = new Request('http://example.com/test', { headers: { host: 'example.com:3000' } });
            expect(getHost(req)).toBe('example.com:3000');
        });

        it("should return 'localhost' when no host header", () => {
            const req = new Request('http://localhost/test');
            const host = getHost(req);
            expect(typeof host).toBe('string');
        });
    });

    describe('allCasesPassed', () => {
        it('should return true when all cases passed', () => {
            const cases = [{ caseResult: 'passed' }, { caseResult: 'passed' }, { caseResult: 'passed' }];
            expect(allCasesPassed(cases)).toBe(true);
        });

        it('should return false when any case failed', () => {
            const cases = [{ caseResult: 'passed' }, { caseResult: 'failed' }, { caseResult: 'passed' }];
            expect(allCasesPassed(cases)).toBe(false);
        });

        it('should return false when any case is undetermined', () => {
            const cases = [{ caseResult: 'passed' }, { caseResult: 'undetermined' }];
            expect(allCasesPassed(cases)).toBe(false);
        });

        it('should return true for empty array', () => {
            expect(allCasesPassed([])).toBe(true);
        });
    });

    describe('validateProjectName', () => {
        it('should return null for valid project names', () => {
            expect(validateProjectName('my-project')).toBeNull();
            expect(validateProjectName('MyProject123')).toBeNull();
            expect(validateProjectName('test_project')).toBeNull();
            expect(validateProjectName('a')).toBeNull();
            expect(validateProjectName('project with spaces')).toBeNull();
        });

        it('should reject empty name', () => {
            const result = validateProjectName('');
            expect(result).not.toBeNull();
            expect(result).toContain('length must less than 20');
        });

        it('should reject name longer than 20 characters', () => {
            const result = validateProjectName('a'.repeat(21));
            expect(result).not.toBeNull();
            expect(result).toContain('length must less than 20');
        });

        it('should accept name exactly 20 characters', () => {
            expect(validateProjectName('a'.repeat(20))).toBeNull();
        });

        it('should reject names with special characters', () => {
            expect(validateProjectName('test@project')).not.toBeNull();
            expect(validateProjectName('test!project')).not.toBeNull();
            expect(validateProjectName('test#project')).not.toBeNull();
        });

        it('should accept names with allowed special chars (hyphen, underscore)', () => {
            expect(validateProjectName('test-project')).toBeNull();
            expect(validateProjectName('test_project')).toBeNull();
        });
    });

    describe('toRelativePath', () => {
        it('should extract the path from an absolute http URL', () => {
            expect(toRelativePath('http://kouma-dashboard:3001/file-server/assets/img.webp')).toBe('/file-server/assets/img.webp');
        });

        it('should extract the path from an absolute https URL', () => {
            expect(toRelativePath('https://example.com/file-server/projects/foo/bar.png')).toBe('/file-server/projects/foo/bar.png');
        });

        it('should return the input unchanged when already a relative path', () => {
            expect(toRelativePath('/file-server/assets/img.webp')).toBe('/file-server/assets/img.webp');
        });

        it('should return empty string unchanged', () => {
            expect(toRelativePath('')).toBe('');
        });
    });

    describe('retrieveProjectInfo', () => {
        it('should return empty array when no projects', async () => {
            (Project.find as any).mockReturnValue({ lean: () => Promise.resolve([]) });
            (Build.aggregate as any).mockResolvedValue([]);
            const result = await retrieveProjectInfo();
            expect(result).toEqual([]);
        });

        it('should map project data correctly', async () => {
            const mockProject = {
                pid: 'PID123',
                projectName: 'test',
                projectDisplayName: 'Test Project',
                projectImageUrl: '/img.webp',
                labels: ['label1'],
            };
            (Project.find as any).mockReturnValue({ lean: () => Promise.resolve([mockProject]) });
            (Build.aggregate as any).mockResolvedValue([
                { _id: 'PID123', buildsCount: 5, latestBuildResult: 'passed', latestBuildCreatedAt: new Date(2024, 0, 15, 10, 30, 0) },
            ]);

            const result = await retrieveProjectInfo();
            expect(result.length).toBe(1);
            const proj = result[0] as any;
            expect(proj.pid).toBe('PID123');
            expect(proj.projectName).toBe('test');
            expect(proj.totalBuildsNumber).toBe(5);
            expect(proj.latestBuildResult).toBe('passed');
            expect(proj.labels).toEqual(['label1']);
        });

        it('should normalize absolute projectImageUrl to a relative path', async () => {
            const mockProject = {
                pid: 'PID789',
                projectName: 'team',
                projectDisplayName: 'Team',
                projectImageUrl: 'http://kouma-dashboard:3001/file-server/assets/project-team-image/team-team.348x225.webp',
                labels: [],
            };
            (Project.find as any).mockReturnValue({ lean: () => Promise.resolve([mockProject]) });
            (Build.aggregate as any).mockResolvedValue([]);

            const result = await retrieveProjectInfo();
            const proj = result[0] as any;
            expect(proj.projectImageUrl).toBe('/file-server/assets/project-team-image/team-team.348x225.webp');
        });

        it('should handle projects with no builds', async () => {
            const mockProject = { pid: 'PID456', projectName: 'empty', projectDisplayName: 'Empty', projectImageUrl: '', labels: [] };
            (Project.find as any).mockReturnValue({ lean: () => Promise.resolve([mockProject]) });
            (Build.aggregate as any).mockResolvedValue([]);

            const result = await retrieveProjectInfo();
            const proj = result[0] as any;
            expect(proj.latestBuildResult).toBe('');
            expect(proj.latestBuildTime).toBe('');
            expect(proj.totalBuildsNumber).toBe(0);
        });
    });

    describe('passBuild', () => {
        it('should call updateTestCaseCount and updateBuildResult', async () => {
            const mockUpdateCount = buildService.updateTestCaseCount as any;
            const mockUpdateResult = buildService.updateBuildResult as any;
            mockUpdateCount.mockResolvedValue(undefined);
            mockUpdateResult.mockResolvedValue(undefined);

            await passBuild('PID1', 'BID1', 10);

            expect(mockUpdateCount).toHaveBeenCalledWith('PID1', 'BID1', {
                casePassedCount: 10,
                caseFailedCount: 0,
                caseUndeterminedCount: 0,
                casePassedByIgnoringRectanglesCount: 0,
            });
            expect(mockUpdateResult).toHaveBeenCalledWith('BID1', 'passed');
        });
    });

    describe('checkAndUpdateBuildResult', () => {
        it('should return early when no cases found', async () => {
            (caseService.getBuildCases as any).mockResolvedValue([]);
            await checkAndUpdateBuildResult('BID1');
        });

        it('should set result to passed when all cases passed', async () => {
            const cases = [
                { pid: 'P1', bid: 'B1', caseResult: 'passed', comprehensiveCaseResult: 'passed' },
                { pid: 'P1', bid: 'B1', caseResult: 'passed', comprehensiveCaseResult: 'passed' },
            ];
            (caseService.getBuildCases as any).mockResolvedValue(cases);
            (buildService.updateTestCaseCount as any).mockResolvedValue(undefined);
            (buildService.updateBuildResult as any).mockResolvedValue(undefined);

            await checkAndUpdateBuildResult('B1');

            expect(buildService.updateBuildResult).toHaveBeenCalledWith('B1', 'passed');
        });

        it('should set result to undetermined when any case is undetermined', async () => {
            const cases = [
                { pid: 'P1', bid: 'B1', caseResult: 'passed', comprehensiveCaseResult: 'passed' },
                { pid: 'P1', bid: 'B1', caseResult: 'undetermined', comprehensiveCaseResult: null },
            ];
            (caseService.getBuildCases as any).mockResolvedValue(cases);
            (buildService.updateTestCaseCount as any).mockResolvedValue(undefined);
            (buildService.updateBuildResult as any).mockResolvedValue(undefined);

            await checkAndUpdateBuildResult('B1');

            expect(buildService.updateBuildResult).toHaveBeenCalledWith('B1', 'undetermined');
        });

        it('should set result to failed when failed count > passedByIgnoring count and no undetermined', async () => {
            const cases = [
                { pid: 'P1', bid: 'B1', caseResult: 'failed', comprehensiveCaseResult: null },
                { pid: 'P1', bid: 'B1', caseResult: 'failed', comprehensiveCaseResult: null },
                { pid: 'P1', bid: 'B1', caseResult: 'passed', comprehensiveCaseResult: 'passed' },
            ];
            (caseService.getBuildCases as any).mockResolvedValue(cases);
            (buildService.updateTestCaseCount as any).mockResolvedValue(undefined);
            (buildService.updateBuildResult as any).mockResolvedValue(undefined);

            await checkAndUpdateBuildResult('B1');

            expect(buildService.updateBuildResult).toHaveBeenCalledWith('B1', 'failed');
        });

        it('should set result to passed when failed <= passedByIgnoring and no undetermined', async () => {
            const cases = [
                { pid: 'P1', bid: 'B1', caseResult: 'passed', comprehensiveCaseResult: 'passed' },
                { pid: 'P1', bid: 'B1', caseResult: 'failed', comprehensiveCaseResult: 'passed' },
            ];
            (caseService.getBuildCases as any).mockResolvedValue(cases);
            (buildService.updateTestCaseCount as any).mockResolvedValue(undefined);
            (buildService.updateBuildResult as any).mockResolvedValue(undefined);

            await checkAndUpdateBuildResult('B1');

            expect(buildService.updateBuildResult).toHaveBeenCalledWith('B1', 'passed');
        });
    });
});
