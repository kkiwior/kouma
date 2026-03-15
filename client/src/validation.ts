import * as path from 'node:path';

/**
 * Pattern matching invalid characters for screenshot filenames.
 * These characters are not allowed: `< > : " / \ | ? *` and null byte.
 * Matches the validation in the Kouma Go engine (`utils.ScreenshotFilenameFilter`).
 */
const INVALID_CHARS_PATTERN = /[<>:"/\\|?*\x00]/;

/**
 * Maximum allowed length for a screenshot filename (including extension).
 * Matches the validation in the Kouma Go engine.
 */
const FILENAME_MAX_LENGTH = 255;

/**
 * Set of image file extensions accepted by the Kouma Go engine.
 * Matches the validation in `utils.ScreenshotFilenameFilter()`.
 */
const SUPPORTED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.webp', '.gif']);

/**
 * Validates a screenshot filename for Kouma engine compatibility.
 *
 * Mirrors the server-side validation from the Go engine's
 * `utils.ScreenshotFilenameFilter()`:
 *
 * - Must have a supported image extension (`.png`, `.jpg`, `.jpeg`, `.bmp`, `.webp`, `.gif`)
 * - Full filename must be at most 255 characters
 * - Filename (without extension) must not contain: `< > : " / \ | ? *` or null bytes
 *
 * @param filename - The screenshot filename to validate (basename only, no directory path).
 * @returns `null` if the filename is valid, or an error message string describing the issue.
 *
 * @example
 * ```ts
 * import { validateScreenshotFilename } from "kouma";
 *
 * validateScreenshotFilename("login.png");           // null (valid)
 * validateScreenshotFilename("photo.jpg");           // null (valid)
 * validateScreenshotFilename("test file.webp");      // null (spaces allowed)
 * validateScreenshotFilename("test@file.png");       // null (@ allowed)
 * validateScreenshotFilename("my.component.png");    // null (dots in name allowed)
 * validateScreenshotFilename("login.svg");           // "unsupported image format..."
 * validateScreenshotFilename("test>file.png");       // "filename contains invalid characters..."
 * ```
 */
export function validateScreenshotFilename(filename: string): string | null {
    const parsed = path.parse(filename);

    if (!parsed.ext || !SUPPORTED_EXTENSIONS.has(parsed.ext.toLowerCase())) {
        return `unsupported image format: "${filename}" (supported: ${[...SUPPORTED_EXTENSIONS].join(', ')})`;
    }

    if (filename.length > FILENAME_MAX_LENGTH) {
        return `filename longer than ${FILENAME_MAX_LENGTH} characters: "${filename}"`;
    }

    if (INVALID_CHARS_PATTERN.test(parsed.name)) {
        return `filename contains invalid characters (< > : " / \\ | ? * are not allowed): "${filename}"`;
    }

    if (parsed.name.length === 0) {
        return `filename has no name part: "${filename}"`;
    }

    return null;
}
