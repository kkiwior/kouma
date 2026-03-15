import CryptoJS from 'crypto-js';
import { getEnv } from './env-utils.js';

export const expireTime = '4h';
export const authKey = getEnv('AUTH_TOKEN_KEY', 'MicooAuthToken');

export const credential = {
    passcodeKey: getEnv('PASSCODE_KEY', 'micooPasscodeKey!@#$%^&*()'),
    apiKeySecret: getEnv('API_KEY_SECRET', 'micooProjectApiKey~!@#$%^&*()__+'),
    accessTokenSecret: getEnv('ACCESS_TOKEN_SECRET', 'micooAccessTokenSecret'),
};

function encrypt(text: string, secret: string): string {
    return CryptoJS.AES.encrypt(text, secret).toString();
}

function decrypt(encryptedText: string, secret: string): string {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, secret);
        const decrypted = bytes.toString(CryptoJS.enc.Utf8);
        if (!decrypted) {
            throw new Error();
        }
        return decrypted;
    } catch {
        throw new Error('Invalid encrypted data format or wrong key');
    }
}

function createCryptoProvider(secret: string) {
    return { encrypt: (text: string) => encrypt(text, secret), decrypt: (encryptedText: string) => decrypt(encryptedText, secret) };
}

function generateRandomString(bytes: number = 9): string {
    return CryptoJS.lib.WordArray.random(bytes).toString();
}

export function decryptPasscode(encryptedPasscode: string, storedPasscode: string) {
    return decrypt(encryptedPasscode, storedPasscode);
}

export const { encrypt: encryptPasscodeStore, decrypt: decryptPasscodeStore } = createCryptoProvider(credential.passcodeKey);
export const { encrypt: encryptAPIKey, decrypt: decryptAPIKey } = createCryptoProvider(credential.apiKeySecret);

export function createEncryptedPasscode() {
    return encryptPasscodeStore(generateRandomString());
}

export function createEncryptedAPIKey() {
    return encryptAPIKey('AK' + generateRandomString());
}
