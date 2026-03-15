import { describe, it, expect } from 'bun:test';
import { projectUuid, buildUuid, caseUuid } from './uuid-utils';

describe('uuid-utils', () => {
    describe('projectUuid', () => {
        it("should start with 'PID'", () => {
            const uuid = projectUuid();
            expect(uuid.startsWith('PID')).toBe(true);
        });

        it('should have no hyphens', () => {
            const uuid = projectUuid();
            expect(uuid.includes('-')).toBe(false);
        });

        it('should generate unique values on each call', () => {
            const uuid1 = projectUuid();
            const uuid2 = projectUuid();
            expect(uuid1).not.toBe(uuid2);
        });

        it('should have PID prefix + 32 hex characters', () => {
            const uuid = projectUuid();
            expect(uuid.length).toBe(3 + 32);
        });
    });

    describe('buildUuid', () => {
        it("should start with 'BID'", () => {
            const uuid = buildUuid();
            expect(uuid.startsWith('BID')).toBe(true);
        });

        it('should have no hyphens', () => {
            const uuid = buildUuid();
            expect(uuid.includes('-')).toBe(false);
        });

        it('should generate unique values on each call', () => {
            const uuid1 = buildUuid();
            const uuid2 = buildUuid();
            expect(uuid1).not.toBe(uuid2);
        });

        it('should have BID prefix + 32 hex characters', () => {
            const uuid = buildUuid();
            expect(uuid.length).toBe(3 + 32);
        });
    });

    describe('caseUuid', () => {
        it("should start with 'CID'", () => {
            const uuid = caseUuid();
            expect(uuid.startsWith('CID')).toBe(true);
        });

        it('should have no hyphens', () => {
            const uuid = caseUuid();
            expect(uuid.includes('-')).toBe(false);
        });

        it('should generate unique values on each call', () => {
            const uuid1 = caseUuid();
            const uuid2 = caseUuid();
            expect(uuid1).not.toBe(uuid2);
        });

        it('should have CID prefix + 32 hex characters', () => {
            const uuid = caseUuid();
            expect(uuid.length).toBe(3 + 32);
        });
    });
});
