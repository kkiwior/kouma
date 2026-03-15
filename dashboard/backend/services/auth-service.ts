import { Auth } from '../models/auth';
import { decryptPasscodeStore } from '../utils/auth-utils';

class AuthService {
    async initializeAuth() {
        const auth = new Auth();
        await auth.create();
        return decryptPasscodeStore(auth.passcode);
    }

    async getPasscode() {
        const auth: any = await Auth.findOne({});
        return auth ? decryptPasscodeStore(auth.passcode) : null;
    }
}

export const authService = new AuthService();
