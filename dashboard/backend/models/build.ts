import mongoose, { Schema, Model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

export interface ICaseCount {
    caseFailedCount: number;
    casePassedCount: number;
    caseUndeterminedCount: number;
    casePassedByIgnoringRectanglesCount: number;
}

interface IBuild extends ICaseCount {
    pid: string;
    bid: string;
    buildResult: string;
    buildStatus: string;
    buildVersion: string;
    buildIndex: number;
    isBaseline: boolean;
    caseCount: number;
    createdAt: Date;
    metadata?: Record<string, string>;
}

interface IBuildMethods {
    rebase(): Promise<this>;
    debase(): Promise<this>;
    setBuildResult(buildResult: string): Promise<this>;
    setCaseCount(caseCount: ICaseCount): Promise<this>;
}

type BuildModel = Model<IBuild, {}, IBuildMethods> & { paginate: any };

export const BuildSchema = new Schema<IBuild, BuildModel, IBuildMethods>({
    pid: { type: String, default: '', trim: true, maxlength: 50 },
    bid: { type: String, default: '', trim: true, maxlength: 50 },
    buildResult: { type: String, default: 'undetermined', trim: true, maxlength: 15 },
    buildStatus: { type: String, default: 'processing', trim: true, maxlength: 10 },
    buildVersion: { type: String, default: '', trim: true, maxlength: 50 },
    buildIndex: { type: Number, default: 0 },
    isBaseline: { type: Boolean, default: false },
    caseCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    caseFailedCount: { type: Number, default: 0 },
    casePassedCount: { type: Number, default: 0 },
    caseUndeterminedCount: { type: Number, default: 0 },
    casePassedByIgnoringRectanglesCount: { type: Number, default: 0 },
    metadata: { type: Map, of: String },
});

BuildSchema.path('pid').required(true, 'pid cannot be blank');
BuildSchema.path('buildVersion').required(true, 'build version cannot be blank');

BuildSchema.plugin(mongoosePaginate as any);

BuildSchema.methods.rebase = function () {
    this.isBaseline = true;
    return this.save();
};

BuildSchema.methods.debase = function () {
    this.isBaseline = false;
    return this.save();
};

BuildSchema.methods.setBuildResult = function (buildResult: string) {
    this.buildResult = buildResult;
    return this.save();
};

BuildSchema.methods.setCaseCount = function (caseCount: ICaseCount) {
    this.casePassedCount = caseCount.casePassedCount;
    this.caseFailedCount = caseCount.caseFailedCount;
    this.caseUndeterminedCount = caseCount.caseUndeterminedCount;
    this.casePassedByIgnoringRectanglesCount = caseCount.casePassedByIgnoringRectanglesCount;
    return this.save();
};

export const Build = mongoose.model<IBuild, BuildModel>('Build', BuildSchema);
