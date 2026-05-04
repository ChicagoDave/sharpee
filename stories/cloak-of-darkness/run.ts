#!/usr/bin/env node

/**
 * Cloak of Darkness — interactive runner.
 *
 * Delegates to the platform CLI bundle (`dist/cli/sharpee.js --play`),
 * which loads this story by path and provides the REPL, parser, and
 * channel-driven output rendering. The previous direct invocation of
 * `createCLIPlatform` from the deprecated `@sharpee/platform-cli-en-us`
 * is removed (R8 — ADR-163 channel-I/O cleanup).
 */

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');
const cliBundle = resolve(repoRoot, 'dist/cli/sharpee.js');
const storyPath = resolve(here);

const child = spawn(process.execPath, [cliBundle, '--play', '--story', storyPath], {
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
