import { Project } from '../models/project';

class ProjectService {
    async createProject(
        projectName: string,
        projectDisplayName: string,
        projectBgImage: string,
        sharedProjectRootPath: string,
        labels: string[] = [],
    ) {
        const project = new Project();
        await project.create(projectName, projectDisplayName, projectBgImage, sharedProjectRootPath, labels);
        return project;
    }

    async getProjectByPid(pid: string) {
        return Project.findOne({ pid });
    }

    async isProjectNameExist(projectName: string) {
        const count = await Project.countDocuments({ projectName: projectName });
        return count > 0;
    }

    async getAllProjects() {
        return Project.find({}).lean();
    }

    async getSharedProjectRootPath(projectName: string) {
        const project = await Project.findOne({ projectName });
        return project && project.sharedProjectRootPath;
    }

    async deleteProject(pid: string) {
        return Project.deleteOne({ pid: pid });
    }

    async updateProjectImageUrl(pid: string, projectImageUrl: string) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updateProjectImageUrl(projectImageUrl);
    }

    async updateProjectColorThreshold(pid: string, projectColorThreshold: number) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updateProjectColorThreshold(projectColorThreshold);
    }

    async updateProjectDetectAntialiasing(pid: string, projectDetectAntialiasing: boolean) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updateProjectDetectAntialiasing(projectDetectAntialiasing);
    }

    async updateEnableProjectIgnoringCluster(pid: string, enableIgnoringCluster: boolean) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updateProjectIgnoringCluster(enableIgnoringCluster);
    }

    async updateProjectIgnoringClusterSize(pid: string, projectIgnoringClusterSize: number) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updateProjectIgnoringClusterSize(projectIgnoringClusterSize);
    }

    async updateEnablePreserveIgnoringOnRebase(pid: string, enablePreserveIgnoringOnRebase: boolean) {
        const project = await this.getProjectByPid(pid);
        if (!project) return;
        await project.updatePreserveIgnoringOnRebase(enablePreserveIgnoringOnRebase);
    }

    async updateProjectConfig(
        pid: string,
        updates: Partial<{
            projectColorThreshold: number;
            projectDetectAntialiasing: boolean;
            projectIgnoringCluster: boolean;
            projectIgnoringClusterSize: number;
            preserveIgnoringOnRebase: boolean;
            retentionPolicyType: string;
            retentionPolicyValue: number;
        }>,
    ) {
        return Project.findOneAndUpdate({ pid }, { $set: updates }, { returnDocument: 'after' });
    }
}

export const projectService = new ProjectService();
