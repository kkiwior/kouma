import path from 'path';
import { logger } from './logger.ts';

export function projectImageValidator(projectImageFilename: string) {
    let message = null;
    const parsedFilename = path.parse(projectImageFilename);
    const errorMessage = (failure: string) => {
        return `project image filename "${projectImageFilename}" unacceptable: ${failure}`;
    };

    if (parsedFilename.ext !== '.webp') {
        message = errorMessage('not a webp image');
        logger.error(message);
        return message;
    }

    const lengthLimit = 100;
    if (projectImageFilename.length > lengthLimit) {
        message = errorMessage(`longer than ${lengthLimit}`);
        logger.error(message);
        return message;
    }

    const format = /^[a-zA-Z0-9\-_]+$/;
    if (!format.test(parsedFilename.name)) {
        message = errorMessage(`only support letters in [a-zA-Z0-9-_]`);
        logger.error(message);
        return message;
    }

    return true;
}
