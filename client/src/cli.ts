#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { KoumaClient } from './client.js';

const HELP = `
kouma - Kouma visual regression testing CLI

Usage:
  kouma <command> [options]

Commands:
  new-build-staged    Create build, upload screenshots, and trigger analysis (recommended)
  create-build        Create a new build without triggering analysis
  upload-screenshot   Upload a screenshot to a specific build
  finalize-build      Trigger analysis for a previously created build
  new-build           Upload screenshots and trigger a new build (deprecated)
  new-build-sync      Upload and build in a single synchronous request (deprecated)
  build-stats         Get statistics for a specific build
  latest-build-stats  Get latest build statistics for a project

Global Options:
  --host <url>        Kouma service URL          (env: KOUMA_HOST)
  --api-key <key>     API key for authentication (env: KOUMA_API_KEY)
  --help              Show this help message

Command Options:
  new-build-staged / new-build / new-build-sync:
    --pid <id>                  Project ID               (env: KOUMA_PID)
    --build-version <version>   Build version (e.g. git commit)
    --screenshots-dir <path>    Path to screenshots directory
    --meta <key=value>          Custom metadata (can be used multiple times)

  create-build:
    --pid <id>                  Project ID               (env: KOUMA_PID)
    --build-version <version>   Build version (e.g. git commit)
    --meta <key=value>          Custom metadata (can be used multiple times)

  upload-screenshot:
    --bid <id>                  Build ID
    --file <path>               Path to screenshot file

  finalize-build:
    --bid <id>                  Build ID

  build-stats:
    --bid <id>                  Build ID

  latest-build-stats:
    --pid <id>                  Project ID               (env: KOUMA_PID)

Environment Variables:
  KOUMA_HOST       Default value for --host
  KOUMA_API_KEY    Default value for --api-key
  KOUMA_PID        Default value for --pid

Examples:
  kouma new-build-staged --pid proj1 --build-version v1.0 --screenshots-dir ./screenshots
  kouma create-build --pid proj1 --build-version v1.0
  kouma upload-screenshot --bid build123 --file ./screenshots/login.png
  kouma finalize-build --bid build123
  kouma build-stats --bid build123
  kouma latest-build-stats --pid proj1
`.trim();

function fail(message: string): never {
    console.error(`Error: ${message}\n`);
    console.error("Run 'kouma --help' for usage information.");
    process.exit(1);
}

function requireOption(value: string | undefined, name: string): string {
    if (!value) {
        fail(`Missing required option: --${name}`);
    }
    return value;
}

function parseMetadata(metaStrings: string[] | undefined): Record<string, string> | undefined {
    if (!metaStrings || metaStrings.length === 0) return undefined;
    const metadata: Record<string, string> = {};
    for (const s of metaStrings) {
        const [key, ...valueParts] = s.split('=');
        if (key && valueParts.length > 0) {
            metadata[key] = valueParts.join('=');
        }
    }
    return metadata;
}

async function main(): Promise<void> {
    const { values, positionals } = parseArgs({
        allowPositionals: true,
        options: {
            host: { type: 'string' },
            'api-key': { type: 'string' },
            pid: { type: 'string' },
            bid: { type: 'string' },
            'build-version': { type: 'string' },
            'screenshots-dir': { type: 'string' },
            file: { type: 'string' },
            meta: { type: 'string', multiple: true },
            help: { type: 'boolean' },
        },
    });

    if (values.help || positionals.length === 0) {
        console.log(HELP);
        process.exit(0);
    }

    const command = positionals[0];
    const host = values.host ?? process.env.KOUMA_HOST;
    const apiKey = values['api-key'] ?? process.env.KOUMA_API_KEY;
    const pid = values.pid ?? process.env.KOUMA_PID;
    const metadata = parseMetadata(values.meta as string[] | undefined);

    const client = new KoumaClient({ host: requireOption(host, 'host'), apiKey: requireOption(apiKey, 'api-key') });

    switch (command) {
        case 'new-build-staged': {
            const resolvedPid = requireOption(pid, 'pid');
            const buildVersion = requireOption(values['build-version'], 'build-version');
            const screenshotsDir = requireOption(values['screenshots-dir'], 'screenshots-dir');

            const result = await client.newBuildStaged({ pid: resolvedPid, buildVersion, screenshotsDirectory: screenshotsDir, metadata });
            if (result) {
                console.log(JSON.stringify(result, null, 2));
            }
            break;
        }

        case 'create-build': {
            const resolvedPid = requireOption(pid, 'pid');
            const buildVersion = requireOption(values['build-version'], 'build-version');

            const result = await client.createBuild({ pid: resolvedPid, buildVersion, metadata });
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'upload-screenshot': {
            const bid = requireOption(values.bid, 'bid');
            const filePath = requireOption(values.file, 'file');

            const result = await client.uploadBuildScreenshot(bid, filePath);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'finalize-build': {
            const bid = requireOption(values.bid, 'bid');

            const result = await client.finalizeBuild(bid);
            console.log(JSON.stringify(result, null, 2));
            break;
        }

        case 'new-build': {
            const resolvedPid = requireOption(pid, 'pid');
            const buildVersion = requireOption(values['build-version'], 'build-version');
            const screenshotsDir = requireOption(values['screenshots-dir'], 'screenshots-dir');

            const result = await client.newBuild({ pid: resolvedPid, buildVersion, screenshotsDirectory: screenshotsDir, metadata });
            if (result) {
                console.log(JSON.stringify(result, null, 2));
            }
            break;
        }

        case 'new-build-sync': {
            const resolvedPid = requireOption(pid, 'pid');
            const buildVersion = requireOption(values['build-version'], 'build-version');
            const screenshotsDir = requireOption(values['screenshots-dir'], 'screenshots-dir');

            const result = await client.newBuildSync({ pid: resolvedPid, buildVersion, screenshotsDirectory: screenshotsDir, metadata });
            if (result) {
                console.log(JSON.stringify(result, null, 2));
            }
            break;
        }

        case 'build-stats': {
            const bid = requireOption(values.bid, 'bid');
            const stats = await client.getBuildStats(bid);
            console.log(JSON.stringify(stats, null, 2));
            break;
        }

        case 'latest-build-stats': {
            const resolvedPid = requireOption(pid, 'pid');
            const stats = await client.getLatestBuildStats(resolvedPid);
            console.log(JSON.stringify(stats, null, 2));
            break;
        }

        default:
            fail(`Unknown command: ${command}`);
    }
}

main().catch((error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
});
