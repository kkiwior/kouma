import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { encryptPasscodeStore } from '../utils/auth-utils';

const testPasscode = encryptPasscodeStore('test-passcode-value');

const mockCreate = mock(() => Promise.resolve());
const mockAuthInstance = { create: mockCreate, passcode: testPasscode };

mock.module('../models/auth', () => ({
    Auth: Object.assign(
        function () {
            return mockAuthInstance;
        },
        { findOne: mock(() => Promise.resolve(null)) },
    ),
}));

import { Auth } from '../models/auth';
import { authService } from './auth-service';

describe('AuthService', () => {
    beforeEach(() => {
        mockCreate.mockClear();
        (Auth.findOne as any).mockClear?.();
    });

    describe('initializeAuth', () => {
        it('should initialize auth and return decrypted passcode', async () => {
            mockCreate.mockResolvedValue(undefined as any);
            const result = await authService.initializeAuth();
            expect(mockCreate).toHaveBeenCalled();
            expect(result).toBe('test-passcode-value');
        });

        it('should throw an error if auth creation fails', async () => {
            mockCreate.mockRejectedValueOnce(new Error('Creation failed'));
            await expect(authService.initializeAuth()).rejects.toThrow('Creation failed');
        });
    });

    describe('getPasscode', () => {
        it('should return decrypted passcode if auth exists', async () => {
            const storedPasscode = encryptPasscodeStore('stored-secret');
            (Auth.findOne as any).mockResolvedValue({ passcode: storedPasscode });
            const result = await authService.getPasscode();
            expect(Auth.findOne).toHaveBeenCalledWith({});
            expect(result).toBe('stored-secret');
        });

        it('should return null if auth does not exist', async () => {
            (Auth.findOne as any).mockResolvedValue(null);
            const result = await authService.getPasscode();
            expect(Auth.findOne).toHaveBeenCalledWith({});
            expect(result).toBeNull();
        });

        it('should throw an error if findOne fails', async () => {
            (Auth.findOne as any).mockRejectedValueOnce(new Error('Database error'));
            await expect(authService.getPasscode()).rejects.toThrow('Database error');
        });
    });
});
