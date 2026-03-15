import { describe, it, expect, mock, beforeEach } from 'bun:test';

mock.module('../models/ignoring', () => ({
    Ignoring: Object.assign(
        function () {
            return {
                pid: '',
                caseName: '',
                rectangles: [],
                create: mock(function (this: any, pid: string, caseName: string, rectangles: any[]) {
                    this.pid = pid;
                    this.caseName = caseName;
                    this.rectangles = rectangles;
                    return Promise.resolve(this);
                }),
                resetRectangles: mock(() => Promise.resolve()),
            };
        },
        { findOne: mock(() => Promise.resolve(null)), deleteMany: mock(() => Promise.resolve({ deletedCount: 0 })) },
    ),
}));

import { Ignoring } from '../models/ignoring';
import { ignoringService } from './ignoring-service';

describe('IgnoringService', () => {
    beforeEach(() => {
        (Ignoring.findOne as any).mockClear();
        (Ignoring.deleteMany as any).mockClear();
    });

    describe('plainIgnoring', () => {
        it('should return null/undefined for null input', () => {
            const result = ignoringService.plainIgnoring(null);
            expect(result).toBeNull();
        });

        it('should return plain object with only x, y, width, height for each rectangle', () => {
            const ignoring = {
                pid: 'PID1',
                caseName: 'test-case',
                rectangles: [
                    { x: 10, y: 20, width: 100, height: 200, _id: 'abc', extra: 'field' },
                    { x: 5, y: 15, width: 50, height: 150, _id: 'def' },
                ],
            } as any;

            const result = ignoringService.plainIgnoring(ignoring);

            expect(result).toEqual({
                pid: 'PID1',
                caseName: 'test-case',
                rectangles: [
                    { x: 10, y: 20, width: 100, height: 200 },
                    { x: 5, y: 15, width: 50, height: 150 },
                ],
            });
        });

        it('should handle empty rectangles array', () => {
            const ignoring = { pid: 'PID1', caseName: 'test', rectangles: [] } as any;

            const result = ignoringService.plainIgnoring(ignoring);
            expect(result).toEqual({ pid: 'PID1', caseName: 'test', rectangles: [] });
        });
    });

    describe('getIgnoring', () => {
        it('should call Ignoring.findOne with pid and caseName', async () => {
            (Ignoring.findOne as any).mockResolvedValue(null);

            await ignoringService.getIgnoring('PID1', 'case1');

            expect(Ignoring.findOne).toHaveBeenCalledWith({ pid: 'PID1', caseName: 'case1' });
        });
    });

    describe('deleteIgnoring', () => {
        it('should call Ignoring.deleteMany with pid and caseName', async () => {
            (Ignoring.deleteMany as any).mockResolvedValue({ deletedCount: 1 });

            await ignoringService.deleteIgnoring('PID1', 'case1');

            expect(Ignoring.deleteMany).toHaveBeenCalledWith({ pid: 'PID1', caseName: 'case1' });
        });
    });

    describe('cleanProjectIgnoring', () => {
        it('should call Ignoring.deleteMany with pid only', async () => {
            (Ignoring.deleteMany as any).mockResolvedValue({ deletedCount: 5 });

            await ignoringService.cleanProjectIgnoring('PID1');

            expect(Ignoring.deleteMany).toHaveBeenCalledWith({ pid: 'PID1' });
        });
    });

    describe('getPlainIgnoring', () => {
        it('should return null when ignoring not found', async () => {
            (Ignoring.findOne as any).mockResolvedValue(null);

            const result = await ignoringService.getPlainIgnoring('PID1', 'case1');
            expect(result).toBeNull();
        });

        it('should return plain ignoring when found', async () => {
            const mockIgnoring = { pid: 'PID1', caseName: 'case1', rectangles: [{ x: 1, y: 2, width: 3, height: 4 }] };
            (Ignoring.findOne as any).mockResolvedValue(mockIgnoring);

            const result = await ignoringService.getPlainIgnoring('PID1', 'case1');
            expect(result).toEqual({ pid: 'PID1', caseName: 'case1', rectangles: [{ x: 1, y: 2, width: 3, height: 4 }] });
        });
    });

    describe('createOrUpdateIgnoring', () => {
        it('should create new ignoring when none exists and rectangles provided', async () => {
            (Ignoring.findOne as any).mockResolvedValue(null);

            const rectangles = [{ x: 10, y: 20, width: 30, height: 40 }] as any;
            const result = await ignoringService.createOrUpdateIgnoring('PID1', 'case1', rectangles);
            expect(result).not.toBeNull();
        });

        it('should return null when no existing ignoring and empty rectangles', async () => {
            (Ignoring.findOne as any).mockResolvedValue(null);

            const result = await ignoringService.createOrUpdateIgnoring('PID1', 'case1', []);
            expect(result).toBeNull();
        });

        it('should update existing ignoring when rectangles provided', async () => {
            const mockResetRectangles = mock(() => Promise.resolve());
            const existingIgnoring = {
                pid: 'PID1',
                caseName: 'case1',
                rectangles: [{ x: 1, y: 1, width: 1, height: 1 }],
                resetRectangles: mockResetRectangles,
            };
            (Ignoring.findOne as any).mockResolvedValue(existingIgnoring);

            const rectangles = [{ x: 10, y: 20, width: 30, height: 40 }] as any;
            await ignoringService.createOrUpdateIgnoring('PID1', 'case1', rectangles);

            expect(mockResetRectangles).toHaveBeenCalledWith(rectangles);
        });

        it('should delete existing ignoring when empty rectangles provided', async () => {
            const existingIgnoring = {
                pid: 'PID1',
                caseName: 'case1',
                rectangles: [{ x: 1, y: 1, width: 1, height: 1 }],
                resetRectangles: mock(() => Promise.resolve()),
            };
            (Ignoring.findOne as any).mockResolvedValue(existingIgnoring);
            (Ignoring.deleteMany as any).mockResolvedValue({ deletedCount: 1 });

            const result = await ignoringService.createOrUpdateIgnoring('PID1', 'case1', []);

            expect(Ignoring.deleteMany).toHaveBeenCalledWith({ pid: 'PID1', caseName: 'case1' });
            expect(result).toBeNull();
        });
    });
});
