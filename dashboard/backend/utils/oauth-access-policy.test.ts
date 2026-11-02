import { describe, it, expect, spyOn, beforeEach, afterEach } from 'bun:test';
import {
    parseDomainRules,
    parseAllowedEmails,
    getEmailDomain,
    matchesDomainRule,
    isAccessRestricted,
    evaluateOAuthAccess,
    type OAuthAccessPolicy,
} from './oauth-access-policy.ts';

function policy(overrides: Partial<OAuthAccessPolicy> = {}): OAuthAccessPolicy {
    return { domains: [], emails: [], requireVerifiedEmail: true, ...overrides };
}

describe('oauth-access-policy', () => {
    let warnSpy: ReturnType<typeof spyOn>;

    beforeEach(() => {
        warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        warnSpy.mockRestore();
    });

    describe('parseDomainRules', () => {
        it('should return an empty list for an empty value', () => {
            expect(parseDomainRules('')).toEqual([]);
        });

        it('should parse exact domains', () => {
            expect(parseDomainRules('example.com,corp.example.com')).toEqual([
                { domain: 'example.com', includeSubdomains: false },
                { domain: 'corp.example.com', includeSubdomains: false },
            ]);
        });

        it('should parse wildcard domains', () => {
            expect(parseDomainRules('*.example.com')).toEqual([{ domain: 'example.com', includeSubdomains: true }]);
        });

        it('should normalize case, whitespace, leading @ and trailing dots', () => {
            expect(parseDomainRules('  Example.COM ,\n@corp.example.com  *.Dev.Example.com.')).toEqual([
                { domain: 'example.com', includeSubdomains: false },
                { domain: 'corp.example.com', includeSubdomains: false },
                { domain: 'dev.example.com', includeSubdomains: true },
            ]);
        });

        it('should ignore invalid entries and warn about them', () => {
            expect(parseDomainRules('*,*.,ex*mple.com,user@example.com,localhost,example.com')).toEqual([
                { domain: 'example.com', includeSubdomains: false },
            ]);
            expect(warnSpy).toHaveBeenCalledTimes(5);
        });
    });

    describe('parseAllowedEmails', () => {
        it('should return an empty list for an empty value', () => {
            expect(parseAllowedEmails('')).toEqual([]);
        });

        it('should parse and normalize emails', () => {
            expect(parseAllowedEmails(' Alice@Example.com, bob@partner.io ')).toEqual(['alice@example.com', 'bob@partner.io']);
        });

        it('should ignore invalid emails', () => {
            expect(parseAllowedEmails('alice,@example.com,bob@,a@b@c.com,carol@example.com')).toEqual(['carol@example.com']);
            expect(warnSpy).toHaveBeenCalledTimes(4);
        });
    });

    describe('getEmailDomain', () => {
        it('should return the lowercased domain part', () => {
            expect(getEmailDomain('alice@Example.COM')).toBe('example.com');
        });

        it('should use the last @ in the address', () => {
            expect(getEmailDomain('"weird@local"@example.com')).toBe('example.com');
        });

        it('should return an empty string when there is no @', () => {
            expect(getEmailDomain('alice')).toBe('');
        });
    });

    describe('matchesDomainRule', () => {
        const exact = { domain: 'example.com', includeSubdomains: false };
        const wildcard = { domain: 'example.com', includeSubdomains: true };

        it('should match the exact domain', () => {
            expect(matchesDomainRule('example.com', exact)).toBe(true);
            expect(matchesDomainRule('example.com', wildcard)).toBe(true);
        });

        it('should not match subdomains for exact rules', () => {
            expect(matchesDomainRule('dev.example.com', exact)).toBe(false);
        });

        it('should match subdomains for wildcard rules', () => {
            expect(matchesDomainRule('dev.example.com', wildcard)).toBe(true);
            expect(matchesDomainRule('eu.dev.example.com', wildcard)).toBe(true);
        });

        it('should not match unrelated domains', () => {
            expect(matchesDomainRule('example.org', wildcard)).toBe(false);
            expect(matchesDomainRule('other.com', wildcard)).toBe(false);
        });

        it('should not match domains that only contain the allowed domain as a prefix', () => {
            expect(matchesDomainRule('example.com.attacker.io', wildcard)).toBe(false);
            expect(matchesDomainRule('example.com.attacker.io', exact)).toBe(false);
        });

        it('should not match lookalike domains that merely end with the allowed domain', () => {
            expect(matchesDomainRule('notexample.com', wildcard)).toBe(false);
            expect(matchesDomainRule('evil-example.com', wildcard)).toBe(false);
            expect(matchesDomainRule('notexample.com', exact)).toBe(false);
        });
    });

    describe('isAccessRestricted', () => {
        it('should be false when no domains or emails are configured', () => {
            expect(isAccessRestricted(policy())).toBe(false);
        });

        it('should be true when domains or emails are configured', () => {
            expect(isAccessRestricted(policy({ emails: ['alice@example.com'] }))).toBe(true);
            expect(isAccessRestricted(policy({ domains: [{ domain: 'example.com', includeSubdomains: false }] }))).toBe(true);
        });
    });

    describe('evaluateOAuthAccess', () => {
        const restricted = policy({
            domains: [
                { domain: 'example.com', includeSubdomains: false },
                { domain: 'corp.example.org', includeSubdomains: true },
            ],
            emails: ['contractor@partner.io'],
        });

        it('should allow any verified user when access is not restricted', () => {
            expect(evaluateOAuthAccess({ email: 'anyone@anywhere.dev', emailVerified: true }, policy())).toEqual({ allowed: true });
        });

        it('should reject unverified emails', () => {
            expect(evaluateOAuthAccess({ email: 'alice@example.com', emailVerified: false }, restricted)).toEqual({
                allowed: false,
                reason: 'email_not_verified',
            });
        });

        it('should allow unverified emails when verification is not required', () => {
            const decision = evaluateOAuthAccess(
                { email: 'alice@example.com', emailVerified: false },
                { ...restricted, requireVerifiedEmail: false },
            );
            expect(decision).toEqual({ allowed: true });
        });

        it('should allow users from an allowed domain', () => {
            expect(evaluateOAuthAccess({ email: 'alice@example.com', emailVerified: true }, restricted)).toEqual({ allowed: true });
        });

        it('should allow users from subdomains of a wildcard domain', () => {
            expect(evaluateOAuthAccess({ email: 'bob@qa.corp.example.org', emailVerified: true }, restricted)).toEqual({ allowed: true });
        });

        it('should reject lookalike domains of a wildcard domain', () => {
            expect(evaluateOAuthAccess({ email: 'mallory@evilcorp.example.org', emailVerified: true }, restricted)).toEqual({
                allowed: false,
                reason: 'domain_not_allowed',
            });
        });

        it('should allow explicitly listed emails from other domains', () => {
            expect(evaluateOAuthAccess({ email: 'Contractor@Partner.io', emailVerified: true }, restricted)).toEqual({ allowed: true });
        });

        it('should reject other users from the domain of an allowed email', () => {
            expect(evaluateOAuthAccess({ email: 'someone@partner.io', emailVerified: true }, restricted)).toEqual({
                allowed: false,
                reason: 'domain_not_allowed',
            });
        });

        it('should reject users from subdomains of an exact domain', () => {
            expect(evaluateOAuthAccess({ email: 'eve@dev.example.com', emailVerified: true }, restricted)).toEqual({
                allowed: false,
                reason: 'domain_not_allowed',
            });
        });

        it('should report email_not_allowed when only emails are configured', () => {
            const emailsOnly = policy({ emails: ['alice@example.com'] });
            expect(evaluateOAuthAccess({ email: 'bob@example.com', emailVerified: true }, emailsOnly)).toEqual({
                allowed: false,
                reason: 'email_not_allowed',
            });
        });

        it('should reject addresses without a domain', () => {
            expect(evaluateOAuthAccess({ email: 'alice', emailVerified: true }, restricted)).toEqual({
                allowed: false,
                reason: 'invalid_email',
            });
        });
    });
});
