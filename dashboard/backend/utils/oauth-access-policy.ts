import { logger } from './logger.ts';

export interface DomainRule {
    /** Domain the rule is anchored to, e.g. `example.com`. */
    domain: string;
    /** Whether subdomains of `domain` are allowed as well (`*.example.com`). */
    includeSubdomains: boolean;
}

export interface OAuthAccessPolicy {
    domains: DomainRule[];
    emails: string[];
    requireVerifiedEmail: boolean;
}

export interface OAuthProfile {
    email: string;
    emailVerified: boolean;
}

export type OAuthAccessDenialReason = 'email_not_verified' | 'invalid_email' | 'domain_not_allowed' | 'email_not_allowed';

export type OAuthAccessDecision = { allowed: true } | { allowed: false; reason: OAuthAccessDenialReason };

function splitList(raw: string): string[] {
    return raw
        .split(/[,\s]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Parses `KOUMA_OAUTH_ALLOWED_DOMAINS`. Plain entries (`example.com`) match the domain exactly,
 * wildcard entries (`*.example.com`) match the domain itself and any of its subdomains.
 */
export function parseDomainRules(raw: string): DomainRule[] {
    const rules: DomainRule[] = [];
    for (const entry of splitList(raw)) {
        const includeSubdomains = entry.startsWith('*.');
        const domain = (includeSubdomains ? entry.slice(2) : entry).replace(/^@/, '').replace(/\.$/, '');
        if (!domain || domain.includes('*') || domain.includes('@') || !domain.includes('.')) {
            logger.warn(`OAuth: ignoring invalid allowed domain entry '${entry}'`);
            continue;
        }
        rules.push({ domain, includeSubdomains });
    }
    return rules;
}

/**
 * Parses `KOUMA_OAUTH_ALLOWED_EMAILS` into a normalized list of addresses.
 */
export function parseAllowedEmails(raw: string): string[] {
    return splitList(raw).filter((entry) => {
        const atIndex = entry.indexOf('@');
        const valid = atIndex > 0 && atIndex === entry.lastIndexOf('@') && atIndex < entry.length - 1;
        if (!valid) {
            logger.warn(`OAuth: ignoring invalid allowed email entry '${entry}'`);
        }
        return valid;
    });
}

export function getEmailDomain(email: string): string {
    const atIndex = email.lastIndexOf('@');
    return atIndex !== -1 ? email.substring(atIndex + 1).toLowerCase() : '';
}

export function matchesDomainRule(domain: string, rule: DomainRule): boolean {
    if (domain === rule.domain) return true;
    return rule.includeSubdomains && domain.endsWith(rule.domain);
}

export function isAccessRestricted(policy: OAuthAccessPolicy): boolean {
    return policy.domains.length > 0 || policy.emails.length > 0;
}

export function evaluateOAuthAccess(profile: OAuthProfile, policy: OAuthAccessPolicy): OAuthAccessDecision {
    if (policy.requireVerifiedEmail && !profile.emailVerified) {
        return { allowed: false, reason: 'email_not_verified' };
    }

    if (!isAccessRestricted(policy)) {
        return { allowed: true };
    }

    const email = profile.email.trim().toLowerCase();
    const domain = getEmailDomain(email);
    if (!domain) {
        return { allowed: false, reason: 'invalid_email' };
    }

    if (policy.emails.includes(email)) {
        return { allowed: true };
    }

    if (policy.domains.some((rule) => matchesDomainRule(domain, rule))) {
        return { allowed: true };
    }

    return { allowed: false, reason: policy.domains.length > 0 ? 'domain_not_allowed' : 'email_not_allowed' };
}
