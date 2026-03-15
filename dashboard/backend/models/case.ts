import mongoose, { Schema, Document, Model, Types } from 'mongoose';

interface IRectangle {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
}

export interface ICase {
    pid: string;
    bid: string;
    cid: string;
    caseName: string;
    diffPercentage: number | null;
    caseResult: string;
    linkBaseline: string;
    linkLatest: string;
    linkDiff: string;
    ignoringRectangles: Types.DocumentArray<IRectangle & Document>;
    comprehensiveCaseResult: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface ICaseMethods {
    passCase(): Promise<this>;
    failCase(): Promise<this>;
    cleanComprehensiveCaseResult(): Promise<this>;
}

type CaseModel = Model<ICase, {}, ICaseMethods>;

const RectangleSchema = new Schema<IRectangle>({
    x: { type: Number, default: null, min: [0, 'Must be 0 or greater, got {VALUE}'] },
    y: { type: Number, default: null, min: [0, 'Must be 0 or greater, got {VALUE}'] },
    width: { type: Number, default: null, min: [1, 'Must be greater than 0, got {VALUE}'] },
    height: { type: Number, default: null, min: [1, 'Must be greater than 0, got {VALUE}'] },
});

export const CaseSchema = new Schema<ICase, CaseModel, ICaseMethods>(
    {
        pid: { type: String, default: '', trim: true, maxlength: 50 },
        bid: { type: String, default: '', trim: true, maxlength: 50 },
        cid: { type: String, default: '', trim: true, maxlength: 50 },
        caseName: { type: String, default: '', trim: true, maxlength: 200 },
        diffPercentage: { type: Number, default: null },
        caseResult: { type: String, default: 'undetermined', trim: true, maxlength: 15 },
        linkBaseline: { type: String, default: '', trim: true, maxlength: 200 },
        linkLatest: { type: String, default: '', trim: true, maxlength: 200 },
        linkDiff: { type: String, default: '', trim: true, maxlength: 200 },
        ignoringRectangles: [RectangleSchema],
        comprehensiveCaseResult: { type: String, default: null, trim: true, maxlength: 15 },
    },
    { timestamps: true },
);

CaseSchema.path('pid').required(true, 'pid cannot be blank');
CaseSchema.path('bid').required(true, 'bid cannot be blank');
CaseSchema.path('cid').required(true, 'cid cannot be blank');

CaseSchema.methods.passCase = function () {
    this.caseResult = 'passed';
    this.comprehensiveCaseResult = 'confirmed';
    return this.save();
};

CaseSchema.methods.failCase = function () {
    this.caseResult = 'failed';
    return this.save();
};

CaseSchema.methods.cleanComprehensiveCaseResult = function () {
    this.comprehensiveCaseResult = null;
    return this.save();
};

export const Case = mongoose.model<ICase, CaseModel>('Case', CaseSchema);
