import { describe, it, expect, spyOn } from 'bun:test';
import { logger } from './logger';

describe('logger', () => {
    describe('logger methods exist', () => {
        it('should have debug, info, warn, error methods', () => {
            expect(typeof logger.debug).toBe('function');
            expect(typeof logger.info).toBe('function');
            expect(typeof logger.warn).toBe('function');
            expect(typeof logger.error).toBe('function');
        });
    });

    describe('logger.info', () => {
        it('should log with [INFO] prefix when called', () => {
            const spy = spyOn(console, 'log').mockImplementation(() => {});
            logger.info('test info message');
            spy.mockRestore();
        });
    });

    describe('logger.warn', () => {
        it('should log with [WARN] prefix', () => {
            const spy = spyOn(console, 'warn').mockImplementation(() => {});
            logger.warn('test warn message');
            expect(spy).toHaveBeenCalledWith('[WARN]', 'test warn message');
            spy.mockRestore();
        });
    });

    describe('logger.error', () => {
        it('should log with [ERROR] prefix', () => {
            const spy = spyOn(console, 'error').mockImplementation(() => {});
            logger.error('test error message');
            expect(spy).toHaveBeenCalledWith('[ERROR]', 'test error message');
            spy.mockRestore();
        });
    });

    describe('logger.debug', () => {
        it('should call the debug method without throwing', () => {
            const spy = spyOn(console, 'log').mockImplementation(() => {});
            expect(() => logger.debug('test debug')).not.toThrow();
            spy.mockRestore();
        });
    });

    describe('logger accepts multiple arguments', () => {
        it('should accept multiple args for warn', () => {
            const spy = spyOn(console, 'warn').mockImplementation(() => {});
            logger.warn('msg1', 'msg2', { key: 'value' });
            expect(spy).toHaveBeenCalledWith('[WARN]', 'msg1', 'msg2', { key: 'value' });
            spy.mockRestore();
        });

        it('should accept multiple args for error', () => {
            const spy = spyOn(console, 'error').mockImplementation(() => {});
            logger.error('err', new Error('test'));
            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });
    });
});
