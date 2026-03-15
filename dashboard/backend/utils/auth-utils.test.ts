import { describe, it, expect } from 'bun:test';
import CryptoJS from 'crypto-js';
import {
    encryptPasscodeStore,
    decryptPasscodeStore,
    createEncryptedPasscode,
    decryptPasscode,
    encryptAPIKey,
    decryptAPIKey,
    createEncryptedAPIKey,
    expireTime,
    authKey,
    credential,
} from './auth-utils';

describe('auth-utils', () => {
    describe('exported constants', () => {
        it("should export expireTime as '4h'", () => {
            expect(expireTime).toBe('4h');
        });

        it("should export authKey as 'MicooAuthToken'", () => {
            expect(authKey).toBe('MicooAuthToken');
        });

        it('should export credential with expected keys', () => {
            expect(credential).toHaveProperty('passcodeKey');
            expect(credential).toHaveProperty('apiKeySecret');
            expect(credential).toHaveProperty('accessTokenSecret');
            expect(typeof credential.passcodeKey).toBe('string');
            expect(typeof credential.apiKeySecret).toBe('string');
            expect(typeof credential.accessTokenSecret).toBe('string');
        });
    });

    describe('Passcode Store Encryption/Decryption', () => {
        it('should encrypt and decrypt a passcode correctly', () => {
            const passcode = 'mySuperSecretPasscode123!';
            const encrypted = encryptPasscodeStore(passcode);

            expect(encrypted).not.toBe(passcode);
            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = decryptPasscodeStore(encrypted);
            expect(decrypted).toBe(passcode);
        });

        it('should return different encrypted strings for the same input due to salt', () => {
            const passcode = 'testPasscode';
            const encrypted1 = encryptPasscodeStore(passcode);
            const encrypted2 = encryptPasscodeStore(passcode);

            expect(encrypted1).not.toBe(encrypted2);
            expect(decryptPasscodeStore(encrypted1)).toBe(passcode);
            expect(decryptPasscodeStore(encrypted2)).toBe(passcode);
        });

        it('should throw an error when decrypting tampered data', () => {
            const passcode = 'my_secret_passcode';
            const encrypted = encryptPasscodeStore(passcode);
            const tampered = encrypted.substring(0, encrypted.length - 2) + '==';

            expect(() => decryptPasscodeStore(tampered)).toThrow('Invalid encrypted data format or wrong key');
        });

        it('should throw an error when decrypting invalid data', () => {
            expect(() => decryptPasscodeStore('invalid_data')).toThrow('Invalid encrypted data format or wrong key');
        });
    });

    describe('createEncryptedPasscode', () => {
        it('should generate a valid, decryptable encrypted passcode', () => {
            const encrypted = createEncryptedPasscode();

            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = decryptPasscodeStore(encrypted);
            expect(typeof decrypted).toBe('string');
            expect(decrypted.length).toBeGreaterThan(0);
        });

        it('should generate unique passcodes on each call', () => {
            const passcode1 = createEncryptedPasscode();
            const passcode2 = createEncryptedPasscode();

            const decrypted1 = decryptPasscodeStore(passcode1);
            const decrypted2 = decryptPasscodeStore(passcode2);

            expect(decrypted1).not.toBe(decrypted2);
        });
    });

    describe('API Key Encryption/Decryption', () => {
        it('should encrypt and decrypt an API key correctly', () => {
            const apiKey = 'AK1234567890';
            const encrypted = encryptAPIKey(apiKey);

            expect(encrypted).not.toBe(apiKey);
            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = decryptAPIKey(encrypted);
            expect(decrypted).toBe(apiKey);
        });

        it('should throw an error when decrypting invalid data', () => {
            expect(() => decryptAPIKey('invalid_encrypted_data')).toThrow('Invalid encrypted data format or wrong key');
        });
    });

    describe('createEncryptedAPIKey', () => {
        it('should generate an encrypted API key that starts with AK when decrypted', () => {
            const encrypted = createEncryptedAPIKey();

            expect(typeof encrypted).toBe('string');
            expect(encrypted.length).toBeGreaterThan(0);

            const decrypted = decryptAPIKey(encrypted);
            expect(decrypted.startsWith('AK')).toBe(true);
        });

        it('should generate unique API keys on each call', () => {
            const key1 = createEncryptedAPIKey();
            const key2 = createEncryptedAPIKey();

            const decrypted1 = decryptAPIKey(key1);
            const decrypted2 = decryptAPIKey(key2);

            expect(decrypted1).not.toBe(decrypted2);
        });
    });

    describe('decryptPasscode', () => {
        it('should decrypt a passcode using a custom secret', () => {
            const secret = 'my_custom_secret';
            const text = 'plain_text_passcode';
            const encrypted = CryptoJS.AES.encrypt(text, secret).toString();

            const decrypted = decryptPasscode(encrypted, secret);
            expect(decrypted).toBe(text);
        });

        it('should throw an error when using the wrong secret', () => {
            const secret = 'my_custom_secret';
            const wrongSecret = 'wrong_secret';
            const text = 'plain_text_passcode';
            const encrypted = CryptoJS.AES.encrypt(text, secret).toString();

            expect(() => decryptPasscode(encrypted, wrongSecret)).toThrow('Invalid encrypted data format or wrong key');
        });
    });

    describe('Error Handling', () => {
        it('should throw when decrypting data encrypted with a different key via decryptAPIKey', () => {
            const secret = 'some_other_secret';
            const data = 'test_data';
            const encrypted = CryptoJS.AES.encrypt(data, secret).toString();

            expect(() => decryptAPIKey(encrypted)).toThrow('Invalid encrypted data format or wrong key');
        });

        it('should throw when decrypting data encrypted with a different key via decryptPasscodeStore', () => {
            const secret = 'some_other_secret';
            const data = 'test_data';
            const encrypted = CryptoJS.AES.encrypt(data, secret).toString();

            expect(() => decryptPasscodeStore(encrypted)).toThrow('Invalid encrypted data format or wrong key');
        });
    });
});
