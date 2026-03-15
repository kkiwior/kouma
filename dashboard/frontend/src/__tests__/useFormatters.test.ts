import { describe, it, expect } from 'bun:test';
import { useFormatters } from '@/composables/useFormatters';

describe('useFormatters', () => {
    const { formatTime, formatPercentage, resultColor, resultBgColor, resultBadgeClasses } = useFormatters();

    describe('formatTime', () => {
        it('formats a valid date string', () => {
            const result = formatTime('2024-01-15T09:05:03.000Z');
            expect(result).toContain('2024');
            expect(result).toContain('09:05:03');
        });

        it('returns empty string for empty input', () => {
            expect(formatTime('')).toBe('');
        });
    });

    describe('formatPercentage', () => {
        it('formats a number as percentage', () => {
            expect(formatPercentage(5.5)).toBe('5.5%');
        });

        it('formats zero', () => {
            expect(formatPercentage(0)).toBe('0%');
        });
    });

    describe('resultColor', () => {
        it('returns green for passed', () => {
            expect(resultColor('passed')).toContain('emerald');
        });

        it('returns red for failed', () => {
            expect(resultColor('failed')).toContain('red');
        });

        it('returns amber for undetermined', () => {
            expect(resultColor('undetermined')).toContain('amber');
        });

        it('returns slate for unknown', () => {
            expect(resultColor('unknown')).toContain('slate');
        });
    });

    describe('resultBgColor', () => {
        it('returns correct background colors', () => {
            expect(resultBgColor('passed')).toContain('emerald');
            expect(resultBgColor('failed')).toContain('red');
            expect(resultBgColor('undetermined')).toContain('amber');
        });
    });

    describe('resultBadgeClasses', () => {
        it('returns correct badge classes for passed', () => {
            const classes = resultBadgeClasses('passed');
            expect(classes).toContain('emerald');
        });

        it('returns correct badge classes for failed', () => {
            const classes = resultBadgeClasses('failed');
            expect(classes).toContain('red');
        });
    });

    describe('displayResult', () => {
        it('returns "passed (ignored)" if caseResult is failed and comprehensiveCaseResult is passed', () => {
            const { displayResult } = useFormatters();
            expect(displayResult('failed', 'passed')).toBe('passed (ignored)');
        });

        it('returns original caseResult otherwise', () => {
            const { displayResult } = useFormatters();
            expect(displayResult('failed', 'failed')).toBe('failed');
            expect(displayResult('passed', 'passed')).toBe('passed');
            expect(displayResult('undetermined', 'undetermined')).toBe('undetermined');
        });
    });
});
