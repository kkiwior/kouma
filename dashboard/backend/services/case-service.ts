import { Case } from '../models/case';

class CaseService {
    async getBuildCases(bid: string) {
        return Case.find({ bid: bid }, {}, { sort: { caseResult: 1, updatedAt: -1 } }).lean();
    }

    async getAllCasesByCid(cid: string) {
        const testCase = await this.getCaseByCid(cid);
        if (!testCase) return null;
        return await this.getBuildCases(testCase.bid);
    }

    async getCaseByCid(cid: string) {
        return Case.findOne({ cid: cid }).lean();
    }

    async getCaseWithNeighborsByCid(cid: string, onlyFails: boolean = false) {
        const testCase = await Case.findOne({ cid }).lean();
        if (!testCase) return null;

        const familyCases = await Case.find({ bid: testCase.bid }, {}, { sort: { caseResult: 1, updatedAt: -1 } }).lean();

        const hostIndex = familyCases.findIndex((x) => x.cid === cid);
        if (hostIndex === -1) return null;

        let prevCase = null;
        let nextCase = null;

        if (onlyFails) {
            prevCase =
                familyCases
                    .slice(0, hostIndex)
                    .reverse()
                    .find((x) => x.caseResult === 'failed') || null;
            nextCase = familyCases.slice(hostIndex + 1).find((x) => x.caseResult === 'failed') || null;
        } else {
            prevCase = hostIndex > 0 ? familyCases[hostIndex - 1] : null;
            nextCase = hostIndex < familyCases.length - 1 ? familyCases[hostIndex + 1] : null;
        }

        return { prevCase, testCase: familyCases[hostIndex], nextCase };
    }

    async passCase(cid: string) {
        const testCase = await Case.findOne({ cid: cid });
        if (!testCase) return;
        await testCase.passCase();
    }

    async failCase(cid: string) {
        const testCase = await Case.findOne({ cid: cid });
        if (!testCase) return;
        await testCase.failCase();
    }

    async deleteByPid(pid: string) {
        return Case.deleteMany({ pid: pid });
    }

    async getPlainTestCaseIgnoringRectangles(cid: string) {
        const testCase = await Case.findOne({ cid: cid });
        if (testCase && testCase.ignoringRectangles) {
            return testCase.ignoringRectangles.map((rectangle: any) => {
                return { x: rectangle.x, y: rectangle.y, width: rectangle.width, height: rectangle.height };
            });
        }
    }

    async cleanComprehensiveCaseResult(cid: string) {
        const testCase = await Case.findOne({ cid: cid });
        if (testCase) {
            await testCase.cleanComprehensiveCaseResult();
        }
    }

    async passAllBuildCases(bid: string) {
        return Case.updateMany(
            { bid: bid, caseResult: { $ne: 'passed' } },
            { $set: { caseResult: 'passed', comprehensiveCaseResult: 'confirmed' } },
        );
    }

    async countBuildCases(bid: string) {
        return Case.countDocuments({ bid: bid });
    }

    async getTopFailingCases(pid: string, limit: number = 10) {
        return Case.aggregate([
            { $match: { pid } },
            {
                $group: {
                    _id: '$caseName',
                    totalRuns: { $sum: 1 },
                    failCount: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$caseResult', 'failed'] }, { $eq: ['$comprehensiveCaseResult', 'confirmed'] }] },
                                1,
                                0,
                            ],
                        },
                    },
                    avgDiff: { $avg: { $ifNull: ['$diffPercentage', 0] } },
                    lastSeen: { $max: '$createdAt' },
                },
            },
            { $match: { failCount: { $gt: 0 } } },
            { $sort: { failCount: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    caseName: '$_id',
                    totalRuns: 1,
                    failCount: 1,
                    failRate: {
                        $cond: [
                            { $gt: ['$totalRuns', 0] },
                            { $round: [{ $multiply: [{ $divide: ['$failCount', '$totalRuns'] }, 100] }, 1] },
                            0,
                        ],
                    },
                    avgDiff: { $round: ['$avgDiff', 2] },
                    lastSeen: 1,
                },
            },
        ]);
    }

    async countProjectCases(pid: string) {
        return Case.countDocuments({ pid });
    }

    async passCaseAndClean(cid: string) {
        return await Case.findOneAndUpdate(
            { cid },
            { $set: { caseResult: 'passed', comprehensiveCaseResult: 'confirmed' } },
            { returnDocument: 'after' },
        );
    }

    async failCaseAndClean(cid: string) {
        return await Case.findOneAndUpdate(
            { cid },
            { $set: { caseResult: 'failed', comprehensiveCaseResult: null } },
            { returnDocument: 'after' },
        );
    }
}

export const caseService = new CaseService();
