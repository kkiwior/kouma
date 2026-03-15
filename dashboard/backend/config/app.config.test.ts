import { describe, it, expect } from 'bun:test';
import { appConfig } from './app.config';

describe('app.config', () => {
    it('should export buildsPerPage as a number', () => {
        expect(typeof appConfig.buildsPerPage).toBe('number');
        expect(appConfig.buildsPerPage).toBe(12);
    });

    it('should export dashboardContent as a non-empty string', () => {
        expect(typeof appConfig.dashboardContent).toBe('string');
        expect(appConfig.dashboardContent.length).toBeGreaterThan(0);
    });

    it("should mention 'Visual Testing' in dashboard content", () => {
        expect(appConfig.dashboardContent).toContain('Visual Testing');
    });
});
