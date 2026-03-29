import { describe, expect, test } from 'bun:test';
import { validateScreenshotFilename } from '../src/validation';

describe('validateScreenshotFilename', () => {
    test('accepts valid PNG filenames', () => {
        expect(validateScreenshotFilename('login.png')).toBeNull();
        expect(validateScreenshotFilename('header-content.png')).toBeNull();
        expect(validateScreenshotFilename('test_case.png')).toBeNull();
        expect(validateScreenshotFilename('test&case.png')).toBeNull();
        expect(validateScreenshotFilename('test(1).png')).toBeNull();
        expect(validateScreenshotFilename('test#1.png')).toBeNull();
        expect(validateScreenshotFilename('A.png')).toBeNull();
    });

    test('accepts valid JPG/JPEG filenames', () => {
        expect(validateScreenshotFilename('photo.jpg')).toBeNull();
        expect(validateScreenshotFilename('screenshot.jpeg')).toBeNull();
        expect(validateScreenshotFilename('header-content.jpg')).toBeNull();
    });

    test('accepts valid BMP, WebP, and GIF filenames', () => {
        expect(validateScreenshotFilename('image.bmp')).toBeNull();
        expect(validateScreenshotFilename('photo.webp')).toBeNull();
        expect(validateScreenshotFilename('animation.gif')).toBeNull();
    });

    test('accepts filenames with spaces', () => {
        expect(validateScreenshotFilename('test file.png')).toBeNull();
        expect(validateScreenshotFilename('my screenshot 01.png')).toBeNull();
    });

    test('accepts filenames with @ symbol', () => {
        expect(validateScreenshotFilename('test@file.png')).toBeNull();
    });

    test('accepts filenames with dots in name part', () => {
        expect(validateScreenshotFilename('test_test.test.png')).toBeNull();
        expect(validateScreenshotFilename('my.component.name.png')).toBeNull();
    });

    test('rejects unsupported image formats', () => {
        expect(validateScreenshotFilename('screenshot.svg')).toContain('unsupported image format');
        expect(validateScreenshotFilename('screenshot.tiff')).toContain('unsupported image format');
        expect(validateScreenshotFilename('readme.txt')).toContain('unsupported image format');
    });

    test('rejects filenames longer than 255 characters', () => {
        const exactLimit = 'a'.repeat(251) + '.png';
        expect(validateScreenshotFilename(exactLimit)).toBeNull();

        const tooLong = 'a'.repeat(252) + '.png';
        expect(validateScreenshotFilename(tooLong)).toContain('longer than 255');
    });

    test('rejects filenames with invalid characters', () => {
        expect(validateScreenshotFilename('test>file.png')).toContain('invalid characters');
        expect(validateScreenshotFilename('test|file.png')).toContain('invalid characters');
        expect(validateScreenshotFilename('test<file.png')).toContain('invalid characters');
        expect(validateScreenshotFilename('test"file.png')).toContain('invalid characters');
        expect(validateScreenshotFilename('test?file.png')).toContain('invalid characters');
        expect(validateScreenshotFilename('test*file.png')).toContain('invalid characters');
    });

    test('rejects empty filename', () => {
        expect(validateScreenshotFilename('.png')).toContain('unsupported image format');
        expect(validateScreenshotFilename('')).toContain('unsupported image format');
    });

    test('rejects filenames without extensions', () => {
        expect(validateScreenshotFilename('screenshot')).toContain('unsupported image format');
        expect(validateScreenshotFilename('my-image')).toContain('unsupported image format');
    });
});
