/**
 * The parser port is one shape (game-engine-residue plan, Phase 6):
 * `adaptParser` returns a parser on which every engine-facing method
 * exists — the parser's own when it has one, a no-op otherwise — and
 * nothing else in the package asks whether the parser has a method. A
 * guard re-introduced anywhere under `src/` fails here by file.
 */

import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { IParser, IValidatedCommand, WorldModel } from '@sharpee/world-model';
import { adaptParser } from '../../src/ports/parser-interface';
import { GameEngine } from '../../src/game-engine';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { MinimalTestStory } from '../stories';

const SRC_DIR = join(__dirname, '..', '..', 'src');
const PORT = join(SRC_DIR, 'ports', 'parser-interface.ts');

/** Every `.ts` file under `src/`, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

const ok = { success: true as const, value: { action: 'if.action.looking', rawInput: 'look' } };
const bareParser = (): IParser => ({ parse: vi.fn(() => ok) } as unknown as IParser);

describe('adaptParser (Phase 6)', () => {
  it('forwards parse and makes every absent engine-facing method a no-op', () => {
    const parser = bareParser();
    const adapted = adaptParser(parser);
    expect(adapted.parse('look')).toBe(ok);
    expect(parser.parse).toHaveBeenCalledWith('look');
    expect(() => {
      adapted.setWorldContext({} as WorldModel, 'a1', 'r1');
      adapted.setPlatformEventEmitter(undefined);
      adapted.updatePronounContext({} as IValidatedCommand, 3);
      adapted.registerPronounEntity('i1', 'lamp', 3);
      adapted.resetPronounContext();
    }).not.toThrow();
  });

  it('forwards each present method with the same arguments and no-ops the rest', () => {
    const setWorldContext = vi.fn();
    const registerPronounEntity = vi.fn();
    const parser = { ...bareParser(), setWorldContext, registerPronounEntity } as unknown as IParser;
    const adapted = adaptParser(parser);
    const world = {} as WorldModel;
    adapted.setWorldContext(world, 'a1', 'r1');
    adapted.registerPronounEntity('i1', 'lamp', 7);
    adapted.updatePronounContext({} as IValidatedCommand, 7);
    adapted.resetPronounContext();
    expect(setWorldContext).toHaveBeenCalledWith(world, 'a1', 'r1');
    expect(registerPronounEntity).toHaveBeenCalledWith('i1', 'lamp', 7);
    expect(adapted).not.toBe(parser);
  });

  it('returns a parser that already offers all five methods as it is, and is idempotent', () => {
    const full = {
      ...bareParser(),
      setWorldContext: vi.fn(),
      setPlatformEventEmitter: vi.fn(),
      updatePronounContext: vi.fn(),
      registerPronounEntity: vi.fn(),
      resetPronounContext: vi.fn(),
    } as unknown as IParser;
    expect(adaptParser(full)).toBe(full);
    const adapted = adaptParser(bareParser());
    expect(adaptParser(adapted)).toBe(adapted);
  });

  it('the real parser is its own EngineParser and the engine keeps handing the raw parser to stories', () => {
    const { engine } = setupTestEngine();
    const raw = engine.getParser();
    expect(adaptParser(raw)).toBe(raw);
    expect(engine['engineParser']).toBe(raw);
  });

  it('an engine built over a bare parse-only parser starts and runs a turn', async () => {
    const { world, languageProvider } = setupTestEngine();
    const bare = bareParser();
    const engine = new GameEngine({
      world,
      parser: bare as never,
      language: languageProvider,
    });
    engine.installStory(new MinimalTestStory());
    engine.start();
    const result = await engine.executeTurn('look');
    expect(bare.parse).toHaveBeenCalledWith('look');
    expect(result.turn).toBe(1);
    engine.stop();
  });

  it('no file under src/ probes the parser for a method — the port is the only place that asks', () => {
    const probes = /hasWorldContext|hasPronounContext|hasPlatformEventEmitter|isEngineAwareParser|registerPronounEntity\?:/;
    const offenders = sourceFiles(SRC_DIR)
      .filter((file) => file !== PORT)
      .filter((file) => probes.test(readFileSync(file, 'utf-8')))
      .map((file) => file.slice(SRC_DIR.length + 1));
    expect(offenders).toEqual([]);
  });
});
