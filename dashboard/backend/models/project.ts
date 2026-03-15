import mongoose, { Schema, Model } from 'mongoose';
import { createEncryptedAPIKey, decryptAPIKey } from '../utils/auth-utils';
import * as uuidUtils from '../utils/uuid-utils';

interface IProject {
    pid: string;
    apiKey: string;
    projectName: string;
    projectDisplayName: string;
    projectImageUrl: string;
    sharedProjectRootPath: string;
    projectColorThreshold: number;
    projectDetectAntialiasing: boolean;
    projectIgnoringCluster: boolean;
    projectIgnoringClusterSize: number;
    preserveIgnoringOnRebase: boolean;
    labels?: string[];
    createdAt: Date;
}

interface IProjectMethods {
    create(
        projectName: string,
        projectDisplayName: string,
        projectImageUrl: string,
        sharedProjectRootPath: string,
        labels?: string[],
    ): Promise<this>;
    updateProjectImageUrl(projectImageUrl: string): Promise<this>;
    updateProjectColorThreshold(projectColorThreshold: number): Promise<this>;
    updateProjectDetectAntialiasing(projectDetectAntialiasing: boolean): Promise<this>;
    getAPIKey(): string;
    updateProjectIgnoringCluster(enableIgnoringCluster: boolean): Promise<this>;
    updateProjectIgnoringClusterSize(projectIgnoringClusterSize: number): Promise<this>;
    updatePreserveIgnoringOnRebase(projectPreserveIgnoringOnRebase: boolean): Promise<this>;
}

type ProjectModel = Model<IProject, {}, IProjectMethods>;

export const ProjectSchema = new Schema<IProject, ProjectModel, IProjectMethods>({
    pid: { type: String, default: '', trim: true, maxlength: 50 },
    apiKey: { type: String, default: '', trim: true, maxlength: 100 },
    projectName: { type: String, default: '', trim: true, maxlength: 50 },
    projectDisplayName: { type: String, default: '', trim: true, maxlength: 50 },
    projectImageUrl: { type: String, default: '', trim: true, maxlength: 500 },
    sharedProjectRootPath: { type: String, default: '', trim: true, maxlength: 500 },
    projectColorThreshold: { type: Number, default: 0.1, min: 0, max: 1 },
    projectDetectAntialiasing: { type: Boolean, default: true },
    projectIgnoringCluster: { type: Boolean, default: true },
    projectIgnoringClusterSize: { type: Number, default: 50, min: 1, max: 5000 },
    preserveIgnoringOnRebase: { type: Boolean, default: false },
    labels: [{ type: String, default: [] }],
    createdAt: { type: Date, default: Date.now },
});

ProjectSchema.path('projectName').required(true, 'Project name cannot be blank');
ProjectSchema.path('pid').required(true, 'Project Id cannot be blank');

ProjectSchema.methods.create = function (projectName, projectDisplayName, projectImageUrl, sharedProjectRootPath, labels) {
    this.projectName = projectName;
    this.projectDisplayName = projectDisplayName;
    this.projectImageUrl = projectImageUrl;
    this.sharedProjectRootPath = sharedProjectRootPath;
    this.labels = labels || [];
    this.apiKey = createEncryptedAPIKey();
    this.pid = uuidUtils.projectUuid();
    return this.save();
};

ProjectSchema.methods.updateProjectImageUrl = function (projectImageUrl) {
    this.projectImageUrl = projectImageUrl;
    return this.save();
};

ProjectSchema.methods.updateProjectColorThreshold = function (projectColorThreshold) {
    this.projectColorThreshold = projectColorThreshold;
    return this.save();
};

ProjectSchema.methods.updateProjectDetectAntialiasing = function (projectDetectAntialiasing) {
    this.projectDetectAntialiasing = projectDetectAntialiasing;
    return this.save();
};

ProjectSchema.methods.getAPIKey = function () {
    return decryptAPIKey(this.apiKey);
};

ProjectSchema.methods.updateProjectIgnoringCluster = function (enableIgnoringCluster) {
    this.projectIgnoringCluster = enableIgnoringCluster;
    return this.save();
};

ProjectSchema.methods.updateProjectIgnoringClusterSize = function (projectIgnoringClusterSize) {
    this.projectIgnoringClusterSize = projectIgnoringClusterSize;
    return this.save();
};

ProjectSchema.methods.updatePreserveIgnoringOnRebase = function (projectPreserveIgnoringOnRebase) {
    this.preserveIgnoringOnRebase = projectPreserveIgnoringOnRebase;
    return this.save();
};

export const Project = mongoose.model<IProject, ProjectModel>('Project', ProjectSchema);
