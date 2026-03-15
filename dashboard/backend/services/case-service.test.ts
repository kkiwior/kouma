import { describe, it, expect, mock, beforeEach } from 'bun:test';

mock.module('../models/case', () => ({
    Case: {
        find: mock(() => Promise.resolve([])),
        findOne: mock(() => Promise.resolve(null)),
        deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })),
    },
}));

import { Case } from '../models/case';
import { caseService } from './case-service';

describe('CaseService', () => {
    beforeEach(() => {
        (Case.find as any).mockClear();
        (Case.findOne as any).mockClear();
        (Case.deleteMany as any).mockClear();
    });

    describe('getBuildCases', () => {
        it('should call Case.find with correct bid and sort parameters', async () => {
            const mockCases = [{ cid: 'case1' }, { cid: 'case2' }];
            (Case.find as any).mockReturnValue({ lean: () => mockCases });

            const result = await caseService.getBuildCases('build1');

            expect(Case.find).toHaveBeenCalledWith({ bid: 'build1' }, {}, { sort: { caseResult: 1, updatedAt: -1 } });
            expect(result).toEqual(mockCases as any);
        });
    });

    describe('getAllCasesByCid', () => {
        it('should return null if case is not found', async () => {
            (Case.findOne as any).mockReturnValue({ lean: () => null });

            const result = await caseService.getAllCasesByCid('missing-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'missing-cid' });
            expect(result).toBeNull();
        });

        it('should return build cases if case is found', async () => {
            const mockCase = { cid: 'found-cid', bid: 'build1' };
            const mockBuildCases = [
                { cid: 'found-cid', bid: 'build1' },
                { cid: 'another-cid', bid: 'build1' },
            ];

            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });
            (Case.find as any).mockReturnValue({ lean: () => mockBuildCases });

            const result = await caseService.getAllCasesByCid('found-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'found-cid' });
            expect(Case.find).toHaveBeenCalledWith({ bid: 'build1' }, {}, { sort: { caseResult: 1, updatedAt: -1 } });
            expect(result).toEqual(mockBuildCases as any);
        });
    });

    describe('getCaseByCid', () => {
        it('should call Case.findOne with correct cid', async () => {
            const mockCase = { cid: 'test-cid' };
            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });

            const result = await caseService.getCaseByCid('test-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'test-cid' });
            expect(result).toEqual(mockCase as any);
        });
    });

    describe('getCaseWithNeighborsByCid', () => {
        it('should return null if testCase is not found', async () => {
            (Case.findOne as any).mockReturnValue({ lean: () => null });

            const result = await caseService.getCaseWithNeighborsByCid('missing-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'missing-cid' });
            expect(result).toBeNull();
        });

        it('should return testCase, nextCase, and null prevCase when testCase is first', async () => {
            const mockCase = { cid: 'cid1', bid: 'b1' };
            const mockFamilyCases = [{ cid: 'cid1', bid: 'b1' }, { cid: 'cid2', bid: 'b1' }, { cid: 'cid3', bid: 'b1' }];

            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });
            (Case.find as any).mockReturnValue({ lean: () => mockFamilyCases });

            const result = await caseService.getCaseWithNeighborsByCid('cid1');

            expect(result).toEqual({ prevCase: null, testCase: mockFamilyCases[0], nextCase: mockFamilyCases[1] } as any);
        });

        it('should return testCase, prevCase, and nextCase when testCase is in middle', async () => {
            const mockCase = { cid: 'cid2', bid: 'b1' };
            const mockFamilyCases = [{ cid: 'cid1', bid: 'b1' }, { cid: 'cid2', bid: 'b1' }, { cid: 'cid3', bid: 'b1' }];

            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });
            (Case.find as any).mockReturnValue({ lean: () => mockFamilyCases });

            const result = await caseService.getCaseWithNeighborsByCid('cid2');

            expect(result).toEqual({ prevCase: mockFamilyCases[0], testCase: mockFamilyCases[1], nextCase: mockFamilyCases[2] } as any);
        });

        it('should return testCase, prevCase, and null nextCase when testCase is last', async () => {
            const mockCase = { cid: 'cid3', bid: 'b1' };
            const mockFamilyCases = [{ cid: 'cid1', bid: 'b1' }, { cid: 'cid2', bid: 'b1' }, { cid: 'cid3', bid: 'b1' }];

            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });
            (Case.find as any).mockReturnValue({ lean: () => mockFamilyCases });

            const result = await caseService.getCaseWithNeighborsByCid('cid3');

            expect(result).toEqual({ prevCase: mockFamilyCases[1], testCase: mockFamilyCases[2], nextCase: null } as any);
        });

        it('should return testCase and null prev/next when only one case exists', async () => {
            const mockCase = { cid: 'cid1', bid: 'b1' };
            const mockFamilyCases = [{ cid: 'cid1', bid: 'b1' }];

            (Case.findOne as any).mockReturnValue({ lean: () => mockCase });
            (Case.find as any).mockReturnValue({ lean: () => mockFamilyCases });

            const result = await caseService.getCaseWithNeighborsByCid('cid1');

            expect(result).toEqual({ prevCase: null, testCase: mockFamilyCases[0], nextCase: null } as any);
        });
    });

    describe('getPlainTestCaseIgnoringRectangles', () => {
        it('should return undefined if case is not found', async () => {
            (Case.findOne as any).mockResolvedValue(null);

            const result = await caseService.getPlainTestCaseIgnoringRectangles('missing-cid');

            expect(result).toBeUndefined();
        });

        it('should return undefined if case has no ignoringRectangles', async () => {
            const mockCase = { cid: 'cid1' };
            (Case.findOne as any).mockResolvedValue(mockCase);

            const result = await caseService.getPlainTestCaseIgnoringRectangles('cid1');

            expect(result).toBeUndefined();
        });

        it('should return formatted ignoringRectangles if they exist', async () => {
            const mockRectangles = [
                { x: 10, y: 20, width: 100, height: 200, extra: 'prop' },
                { x: 5, y: 15, width: 50, height: 150, extra: 'prop2' },
            ];
            const mockCase = { cid: 'cid1', ignoringRectangles: mockRectangles };
            (Case.findOne as any).mockResolvedValue(mockCase);

            const result = await caseService.getPlainTestCaseIgnoringRectangles('cid1');

            expect(result).toEqual([
                { x: 10, y: 20, width: 100, height: 200 },
                { x: 5, y: 15, width: 50, height: 150 },
            ]);
        });
    });

    describe('passCase', () => {
        it('should do nothing if case is not found', async () => {
            (Case.findOne as any).mockResolvedValue(null);

            await caseService.passCase('missing-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'missing-cid' });
        });

        it('should call passCase on found testCase', async () => {
            const mockCase = { cid: 'cid1', passCase: mock(() => Promise.resolve(true)) };
            (Case.findOne as any).mockResolvedValue(mockCase);

            await caseService.passCase('cid1');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'cid1' });
            expect(mockCase.passCase).toHaveBeenCalled();
        });
    });

    describe('failCase', () => {
        it('should do nothing if case is not found', async () => {
            (Case.findOne as any).mockResolvedValue(null);

            await caseService.failCase('missing-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'missing-cid' });
        });

        it('should call failCase on found testCase', async () => {
            const mockCase = { cid: 'cid1', failCase: mock(() => Promise.resolve(true)) };
            (Case.findOne as any).mockResolvedValue(mockCase);

            await caseService.failCase('cid1');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'cid1' });
            expect(mockCase.failCase).toHaveBeenCalled();
        });
    });

    describe('deleteByPid', () => {
        it('should call Case.deleteMany with correct pid', async () => {
            const mockResult = { deletedCount: 5 };
            (Case.deleteMany as any).mockResolvedValue(mockResult);

            const result = await caseService.deleteByPid('pid1');

            expect(Case.deleteMany).toHaveBeenCalledWith({ pid: 'pid1' });
            expect(result).toEqual(mockResult as any);
        });
    });

    describe('cleanComprehensiveCaseResult', () => {
        it('should do nothing if case is not found', async () => {
            (Case.findOne as any).mockResolvedValue(null);

            await caseService.cleanComprehensiveCaseResult('missing-cid');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'missing-cid' });
        });

        it('should call cleanComprehensiveCaseResult on found testCase', async () => {
            const mockCase = { cid: 'cid1', cleanComprehensiveCaseResult: mock(() => Promise.resolve(true)) };
            (Case.findOne as any).mockResolvedValue(mockCase);

            await caseService.cleanComprehensiveCaseResult('cid1');

            expect(Case.findOne).toHaveBeenCalledWith({ cid: 'cid1' });
            expect(mockCase.cleanComprehensiveCaseResult).toHaveBeenCalled();
        });
    });
});
