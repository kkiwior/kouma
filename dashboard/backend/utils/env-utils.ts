export function getEnv(key: string): string | undefined;
export function getEnv(key: string, defaultValue: string): string;
export function getEnv(key: string, defaultValue?: string): string | undefined {
    return process.env[`KOUMA_${key}`] || process.env[`MICOO_${key}`] || defaultValue;
}

export function isMigration(): boolean {
    return !!(process.env.MICOO_ENV || process.env.MICOO_DB_USERNAME || process.env.MICOO_DB_NAME);
}

export function getDatabaseName(): string {
    const dbName = getEnv('DB_NAME');
    if (dbName) return dbName;

    return isMigration() ? 'micoo' : 'kouma';
}

export function getExchangeRootDir(): string {
    const envPath = getEnv('EXCHANGE_ROOT_DIR');
    if (envPath) return envPath;

    if (getEnv('ENV') === 'docker') {
        return '/exchange';
    }

    return '../exchange';
}
