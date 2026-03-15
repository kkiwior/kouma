import { describe, it, expect } from 'bun:test';
import { projectImageValidator } from './validator-utils';

describe('validator-utils', () => {
    describe('projectImageValidator', () => {
        it('should return true for a valid webp filename', () => {
            expect(projectImageValidator('my-image.webp')).toBe(true);
        });

        it('should return true for a filename with underscores and numbers', () => {
            expect(projectImageValidator('my_image_123.webp')).toBe(true);
        });

        it('should return true for a filename with hyphens', () => {
            expect(projectImageValidator('my-project-image.webp')).toBe(true);
        });

        it('should reject non-webp extensions', () => {
            const result = projectImageValidator('image.png');
            expect(typeof result).toBe('string');
            expect(result).toContain('not a webp image');
        });

        it('should reject .jpg extension', () => {
            const result = projectImageValidator('photo.jpg');
            expect(typeof result).toBe('string');
            expect(result).toContain('not a webp image');
        });

        it('should reject filenames longer than 100 characters', () => {
            const longName = 'a'.repeat(97) + '.webp';
            const result = projectImageValidator(longName);
            expect(typeof result).toBe('string');
            expect(result).toContain('longer than 100');
        });

        it('should accept filenames exactly 100 characters', () => {
            const name = 'a'.repeat(95) + '.webp';
            expect(projectImageValidator(name)).toBe(true);
        });

        it('should reject filenames with spaces', () => {
            const result = projectImageValidator('my image.webp');
            expect(typeof result).toBe('string');
            expect(result).toContain('only support letters');
        });

        it('should reject filenames with special characters', () => {
            const result = projectImageValidator('my@image.webp');
            expect(typeof result).toBe('string');
            expect(result).toContain('only support letters');
        });

        it('should reject filenames with dots in the name part', () => {
            const result = projectImageValidator('my.image.webp');
            expect(typeof result).toBe('string');
            expect(result).toContain('only support letters');
        });

        it('should reject dot-only webp filename', () => {
            const result = projectImageValidator('.webp');
            expect(typeof result).toBe('string');
            expect(result).toContain('not a webp image');
        });
    });
});
