/**
 * build-target.test.ts — `sharpee build <target>` takes a project
 * directory as well as a registered name (GH #718). Runs the real
 * resolver over real directories and a real registry file in a scratch
 * location; nothing is stubbed.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { projectDirectoryFor } from '../src/build-target.js';
import { registerStory } from '../src/registry.js';

const SCRATCH = mkdtempSync(join(tmpdir(), 'build-target-test-'));
const PROJECT = join(SCRATCH, 'relighting');
const REGISTERED = join(SCRATCH, 'elsewhere', 'lodge');
const previousRegistry = process.env.SHARPEE_DEVKIT_REGISTRY;

beforeAll(() => {
  process.env.SHARPEE_DEVKIT_REGISTRY = join(SCRATCH, 'registry');
  mkdirSync(PROJECT, { recursive: true });
  writeFileSync(join(PROJECT, 'relighting.story'), 'story\n  title: Relighting\n');
  mkdirSync(REGISTERED, { recursive: true });
  writeFileSync(join(REGISTERED, 'lodge.story'), 'story\n  title: Lodge\n');
  registerStory(REGISTERED, 'lodge');
});

afterAll(() => {
  if (previousRegistry === undefined) delete process.env.SHARPEE_DEVKIT_REGISTRY;
  else process.env.SHARPEE_DEVKIT_REGISTRY = previousRegistry;
  rmSync(SCRATCH, { recursive: true, force: true });
});

describe('projectDirectoryFor', () => {
  it('takes an unregistered project directory as the project', () => {
    expect(projectDirectoryFor(PROJECT)).toBe(resolve(PROJECT));
  });

  it('resolves a relative directory against the working directory', () => {
    // vitest workers cannot chdir, so the relative path is taken from where they run.
    const fromHere = relative(process.cwd(), PROJECT);
    expect(isAbsolute(fromHere)).toBe(false);
    expect(projectDirectoryFor(fromHere)).toBe(resolve(PROJECT));
  });

  it('still resolves a registered name that is not a directory here', () => {
    expect(projectDirectoryFor('lodge')).toBe(resolve(REGISTERED));
  });

  it('refuses a target that is neither, naming both ways to fix it', () => {
    expect(() => projectDirectoryFor('no-such-story')).toThrow(
      /'no-such-story' is not a directory or a registered story — run `sharpee register <location>`, or run `sharpee build` from the project directory/,
    );
  });

  it('refuses a file that is not a directory', () => {
    expect(() => projectDirectoryFor(join(PROJECT, 'relighting.story'))).toThrow(/is not a directory or a registered story/);
  });
});
