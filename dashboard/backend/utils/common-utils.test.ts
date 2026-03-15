import { describe, it, expect } from 'bun:test';
import { formatTime } from './common-utils';

describe('common-utils', () => {
    describe('formatTime', () => {
        it('should format a date correctly with zero-padded hours/minutes/seconds', () => {
            const d = new Date(2024, 0, 15, 9, 5, 3);
            expect(formatTime(d)).toBe('2024-1-15 09:05:03');
        });

        it('should not zero-pad values >= 10', () => {
            const d = new Date(2024, 11, 25, 14, 30, 45);
            expect(formatTime(d)).toBe('2024-12-25 14:30:45');
        });

        it('should handle midnight correctly', () => {
            const d = new Date(2024, 5, 1, 0, 0, 0);
            expect(formatTime(d)).toBe('2024-6-1 00:00:00');
        });

        it('should handle end of day (23:59:59)', () => {
            const d = new Date(2024, 0, 1, 23, 59, 59);
            expect(formatTime(d)).toBe('2024-1-1 23:59:59');
        });

        it('should handle single-digit month and day', () => {
            const d = new Date(2024, 0, 1, 1, 2, 3);
            expect(formatTime(d)).toBe('2024-1-1 01:02:03');
        });

        it('should handle February dates', () => {
            const d = new Date(2024, 1, 29, 12, 0, 0);
            expect(formatTime(d)).toBe('2024-2-29 12:00:00');
        });
    });
});
