/**
 * registry.test.ts — the ~/.sharpee/devkit location registry (ADR-180 U3).
 * Uses SHARPEE_DEVKIT_REGISTRY to point at a temp file (never touches the real one).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { registerStory, listStories, lookupStory, readRegistry } from './registry';

describe('registry', () => {
  let home: string;
  let storyDir: string;

  beforeEach(() => {
    home = mkdtempSync(join(tmpdir(), 'devkit-reg-'));
    process.env.SHARPEE_DEVKIT_REGISTRY = join(home, 'devkit');
    storyDir = join(home, 'my-game');
    mkdirSync(storyDir, { recursive: true });
  });
  afterEach(() => {
    delete process.env.SHARPEE_DEVKIT_REGISTRY;
    rmSync(home, { recursive: true, force: true });
  });

  it('register upserts a name→path entry (default name = basename) and persists it', () => {
    const entry = registerStory(storyDir);
    expect(entry).toEqual({ name: 'my-game', path: storyDir });
    expect(existsSync(process.env.SHARPEE_DEVKIT_REGISTRY!)).toBe(true);
    expect(readRegistry().stories['my-game'].path).toBe(storyDir);
  });

  it('register honors an explicit --name', () => {
    const entry = registerStory(storyDir, 'zork');
    expect(entry.name).toBe('zork');
    expect(lookupStory('zork')).toBe(storyDir);
  });

  it('register throws when the path does not exist', () => {
    expect(() => registerStory(join(home, 'nope'))).toThrow(/does not exist/);
  });

  it('lookupStory returns null for an unregistered name', () => {
    expect(lookupStory('ghost')).toBeNull();
  });

  it('lookupStory throws (never silently skips) when a registered path goes missing', () => {
    registerStory(storyDir, 'gone');
    rmSync(storyDir, { recursive: true, force: true });
    expect(() => lookupStory('gone')).toThrow(/missing path/);
  });

  it('list flags stale entries', () => {
    registerStory(storyDir, 'live');
    const removed = join(home, 'removed');
    mkdirSync(removed);
    registerStory(removed, 'dead');
    rmSync(removed, { recursive: true, force: true });
    const entries = listStories();
    expect(entries.find((e) => e.name === 'live')!.stale).toBe(false);
    expect(entries.find((e) => e.name === 'dead')!.stale).toBe(true);
  });
});
