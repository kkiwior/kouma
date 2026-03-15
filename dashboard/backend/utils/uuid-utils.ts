import crypto from 'node:crypto';

export function projectUuid() {
    return 'PID' + crypto.randomUUID().replace(/-/g, '');
}

export function buildUuid() {
    return 'BID' + crypto.randomUUID().replace(/-/g, '');
}

export function caseUuid() {
    return 'CID' + crypto.randomUUID().replace(/-/g, '');
}
