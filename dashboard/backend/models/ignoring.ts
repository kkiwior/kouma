import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRectangle {
    x: number | null;
    y: number | null;
    width: number | null;
    height: number | null;
}

export interface IIgnoring {
    pid: string;
    caseName: string;
    rectangles: Types.DocumentArray<IRectangle & Document>;
}

export interface IIgnoringMethods {
    create(pid: string, caseName: string, rectangles: IRectangle[]): Promise<this>;
    resetRectangles(rectangles: IRectangle[]): Promise<this>;
}

type IgnoringModel = Model<IIgnoring, {}, IIgnoringMethods>;

const RectangleSchema = new Schema<IRectangle>({
    x: { type: Number, default: null, min: [0, 'Must be 0 or greater, got {VALUE}'] },
    y: { type: Number, default: null, min: [0, 'Must be 0 or greater, got {VALUE}'] },
    width: { type: Number, default: null, min: [1, 'Must be greater than 0, got {VALUE}'] },
    height: { type: Number, default: null, min: [1, 'Must be greater than 0, got {VALUE}'] },
});

export const IgnoringSchema = new Schema<IIgnoring, IgnoringModel, IIgnoringMethods>({
    pid: { type: String, default: '', trim: true, maxlength: 50 },
    caseName: { type: String, default: '', trim: true, maxlength: 200 },
    rectangles: [RectangleSchema],
});

IgnoringSchema.path('pid').required(true, 'pid cannot be blank');
IgnoringSchema.path('caseName').required(true, 'caseName cannot be blank');

IgnoringSchema.methods.create = function (pid: string, caseName: string, rectangles: IRectangle[]) {
    this.pid = pid;
    this.caseName = caseName;
    this.rectangles = rectangles as any;
    return this.save();
};

IgnoringSchema.methods.resetRectangles = function (rectangles: IRectangle[]) {
    this.rectangles = rectangles as any;
    return this.save();
};

export const Ignoring = mongoose.model<IIgnoring, IgnoringModel>('Ignoring', IgnoringSchema);
