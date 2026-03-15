export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const getLogLevelValue = (level: LogLevel | string): number => {
    switch (level.toLowerCase()) {
        case 'debug':
            return 0;
        case 'info':
            return 1;
        case 'warn':
            return 2;
        case 'error':
            return 3;
        default:
            return 1;
    }
};

import { getEnv } from './env-utils.js';

const currentLogLevelValue = getLogLevelValue(getEnv('LOG_LEVEL', 'info'));

export const logger = {
    debug: (...args: any[]) => {
        if (getLogLevelValue('debug') >= currentLogLevelValue) {
            console.log('[DEBUG]', ...args);
        }
    },
    info: (...args: any[]) => {
        if (getLogLevelValue('info') >= currentLogLevelValue) {
            console.log('[INFO]', ...args);
        }
    },
    warn: (...args: any[]) => {
        if (getLogLevelValue('warn') >= currentLogLevelValue) {
            console.warn('[WARN]', ...args);
        }
    },
    error: (...args: any[]) => {
        if (getLogLevelValue('error') >= currentLogLevelValue) {
            console.error('[ERROR]', ...args);
        }
    },
};
