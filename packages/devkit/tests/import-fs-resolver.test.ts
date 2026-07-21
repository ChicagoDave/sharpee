/**
 * import-fs-resolver.test.ts — ADR-251 Phase 2 REAL-PATH test.
 *
 * Exercises the fs-backed `importResolver` (`makeFsImportResolver`) reading
 * a real sibling `.chord` fragment off disk, through the actual chord
 * compiler — no stub, no in-memory fake. Also drives `runCompose --check`,
 * the real `sharpee compose` gate path, to prove the CLI wiring passes a
 * resolver (an unwired call site would fail the import with
 * `analysis.import-unresolved`). Fixtures: tests/fixtures/import-basic/.
 *
 * Owner context: @sharpee/devkit test suite.
 */
import { describe, expect, it } from 'vitest';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import { compile } from '@sharpee/chord';
import { makeFsImportResolver } from '../src/standalone/author-game.js';
import { runCompose } from '../src/commands/compose.js';

const FIXTURES = path.resolve(__dirname, 'fixtures', 'import-basic');
const STORY = path.join(FIXTURES, 'harbor.story');

describe('fs importResolver (ADR-251 Phase 2)', () => {
  it('resolves a sibling .chord fragment off disk and splices it', () => {
    const result = compile(readFileSync(STORY, 'utf-8'), { importResolver: makeFsImportResolver(FIXTURES) });
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    // The fragment's `create the brass lantern` was spliced into the story.
    expect(result.ir.entities.map((e) => e.id)).toContain('brass-lantern');
  });

  it('the compiler appends .chord — the resolver is asked for regions/harbor.chord', () => {
    const asked: string[] = [];
    const real = makeFsImportResolver(FIXTURES);
    compile(readFileSync(STORY, 'utf-8'), {
      importResolver: (name) => { asked.push(name); return real(name); },
    });
    expect(asked).toContain('regions/harbor.chord');
  });

  it('a missing fragment resolves to null → analysis.import-unresolved', () => {
    const src = 'story "X" by "Y"\n  id: x\n  version: 0.0.1\n\nimport "does-not-exist"\n\ncreate the player\n  a room\n\n  You.\n';
    const result = compile(src, { importResolver: makeFsImportResolver(FIXTURES) });
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('analysis.import-unresolved');
  });

  it('sharpee compose --check resolves the real import and passes the gate (exit 0)', async () => {
    // The whole-CLI path: proves compose.ts wired the fs resolver — without
    // it, the import would fail the gate and this would return 1.
    const code = await runCompose([STORY, '--check']);
    expect(code).toBe(0);
  });
});
