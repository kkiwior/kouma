import { Schema, model, Document, Model } from 'mongoose';
import { createEncryptedPasscode } from '../utils/auth-utils';

interface IAuth {
    passcode: string;
    createdAt: Date;
}

interface IAuthMethods {
    create(): Promise<IAuth & Document>;
}

type AuthModel = Model<IAuth, {}, IAuthMethods>;

export const AuthSchema = new Schema<IAuth, AuthModel, IAuthMethods>({
    passcode: { type: String, default: '', trim: true },
    createdAt: { type: Date, default: Date.now },
});

AuthSchema.methods.create = function () {
    this.passcode = createEncryptedPasscode();
    return this.save();
};

export const Auth = model<IAuth, AuthModel>('Auth', AuthSchema);
