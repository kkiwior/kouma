import { appConfig } from '../config/app.config';
import { Build, ICaseCount } from '../models/build';
import { logger } from '../utils/logger.ts';
import { screenshotService } from './screenshots-service';

class BuildService {
    async updateBuildResult(bid: string, buildResult: string) {
        const build = await Build.findOne({ bid: bid });
        if (!build) return;
        await build.setBuildResult(buildResult);
    }

    getBuildByBid(bid: string) {
        return Build.findOne({ bid: bid }).lean();
    }

    getProjectBuilds(pid: string) {
        return Build.find({ pid: pid }, {}, { sort: { _id: -1 } }).lean();
    }

    async getProjectPaginatedBuilds(pid: string, page: number) {
        return await Build.paginate({ pid: pid }, { sort: { _id: -1 }, page: page, limit: appConfig.buildsPerPage });
    }

    async getProjectBuildsCountAndLatestBuild(pid: string) {
        const [buildsCount, latestBuild] = await Promise.all([
            Build.countDocuments({ pid: pid }),
            Build.findOne({ pid: pid }, {}, { sort: { _id: -1 } }),
        ]);

        return { buildsCount, latestBuild };
    }

    async rebase(projectName: string, bid: string) {
        const build = await Build.findOne({ bid: bid });
        if (!build) return;
        await screenshotService.rebase(projectName, build.buildIndex);
        await build.rebase();
    }

    async debaseScreenshots(project: any, build: any) {
        const baselineBuilds = await Build.find({ pid: build.pid, isBaseline: true }, {}, { sort: { _id: -1 } });

        baselineBuilds.forEach((baselineBuild: any) => {
            logger.info(`baseline build, buildIndex=${baselineBuild.buildIndex}`);
        });

        if (baselineBuilds.length === 0) {
            logger.warn(`FBI --> warn: no baseline build found, unable to debase for bid=${build.bid}`);
        } else if (baselineBuilds.length === 1) {
            await screenshotService.clearBaselineScreenshots(project.projectName);
        } else if (baselineBuilds.length > 1 && baselineBuilds[0].bid === build.bid) {
            await screenshotService.clearBaselineScreenshotsAccordingToBuildLatestScreenshots(project.projectName, build.buildIndex);
            await screenshotService.rebase(project.projectName, baselineBuilds[1].buildIndex);
        } else {
            logger.warn(
                `FBI --> warn: current build(bid=${build.bid}) is neither the only,` +
                    'nor the latest baseline, debase may left mistake screenshots in baseline directory',
            );
        }
    }

    async debase(project: any, build: any) {
        if (build.isBaseline) {
            await this.debaseScreenshots(project, build);
            await build.debase();
        }
    }

    async deleteByPid(pid: string) {
        return Build.deleteMany({ pid: pid });
    }

    async stats(bid: string) {
        const build = await Build.findOne({ bid: bid });
        if (build) {
            return { status: build.buildStatus, result: build.buildResult };
        } else {
            return build;
        }
    }

    async latestStats(pid: string) {
        const build = await Build.findOne({ pid: pid }, {}, { sort: { createdAt: -1 } });
        if (build) {
            return { bid: build.bid, index: build.buildIndex, status: build.buildStatus, result: build.buildResult };
        } else {
            return build;
        }
    }

    async updateTestCaseCount(pid: string, bid: string, caseCount: ICaseCount) {
        const build = await Build.findOne({ pid: pid, bid: bid });
        if (build) {
            await build.setCaseCount(caseCount);
        }
    }

    async getProjectBuildResultDistribution(pid: string) {
        const results = await Build.aggregate([
            { $match: { pid, buildStatus: 'completed' } },
            { $group: { _id: '$buildResult', count: { $sum: 1 } } },
        ]);
        const distribution: Record<string, number> = { passed: 0, failed: 0, undetermined: 0 };
        for (const r of results) {
            if (r._id in distribution) distribution[r._id] = r.count;
        }
        return distribution;
    }

    async getRecentBuilds(pid: string, limit: number = 10) {
        return Build.find(
            { pid },
            {
                bid: 1,
                buildIndex: 1,
                buildVersion: 1,
                buildResult: 1,
                buildStatus: 1,
                caseCount: 1,
                casePassedCount: 1,
                caseFailedCount: 1,
                caseUndeterminedCount: 1,
                createdAt: 1,
            },
            { sort: { _id: -1 }, limit },
        ).lean();
    }

    async getBuildActivityByDay(pid: string, days: number = 30) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        return Build.aggregate([
            { $match: { pid, createdAt: { $gte: since } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    total: { $sum: 1 },
                    passed: { $sum: { $cond: [{ $eq: ['$buildResult', 'passed'] }, 1, 0] } },
                    failed: { $sum: { $cond: [{ $eq: ['$buildResult', 'failed'] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);
    }
}

export const buildService = new BuildService();
