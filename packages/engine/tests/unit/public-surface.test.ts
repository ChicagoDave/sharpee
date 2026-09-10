/**
 * The package's public surface is pinned by name (ADR-342 D5): the export
 * set of `src/index.ts`, resolved through the TypeScript checker so
 * type-only exports count, equals the contract ADR-342 D1 lists. A name
 * that appears or disappears fails here by name, and `index.ts` carries
 * no `export *` (ADR-342 D4), so a module added under `src/` stays
 * internal until someone adds it to the list — and to this fixture.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

const PACKAGE_ROOT = join(__dirname, '..', '..');
const ENTRY = join(PACKAGE_ROOT, 'src', 'index.ts');

/** ADR-342 D1 (as amended by ADR-343): the contract, one name at a time. */
const CONTRACT = [
  // The facade
  'GameEngine',
  'EngineConfig',
  'DEFAULT_TEXT_CAPABILITIES',
  // What a story author writes against
  'Story',
  'StoryConfig',
  'StoryWithEvents',
  'validateStoryConfig',
  'CustomVocabulary',
  'StoryEngine',
  'NarrativeConfig',
  'ParsedCommandTransformer',
  'InputModeHandler',
  'SharedDataKeys',
  // What a turn hands back
  'GameContext',
  'TurnResult',
  // The turn as a named list (ADR-334)
  'TURN_STAGES',
  'META_STAGES',
  'SHARED_STAGES',
  'TurnStage',
  // Services a host or a test drives directly
  'CommandExecutor',
  'createCommandExecutor',
  'EngineRandomService',
  'SaveRestoreService',
  'ISaveRestoreStateProvider',
  'SAVE_FORMAT_VERSION',
  'VocabularyManager',
  // Plugins
  'ActorTurnPlugin',
  'ACTOR_TURN_PLUGIN_ID',
  'PluginRegistry',
  // Seams another package calls by name
  'phrasebookTemplateKey',
  'PhrasebookResolution',
  'lintUnusedSnippetEntries',
].sort();

/** The export names of `src/index.ts` as the checker sees them, sorted. */
function exportedNames(): string[] {
  const configPath = join(PACKAGE_ROOT, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, PACKAGE_ROOT);
  const program = ts.createProgram([ENTRY], { ...parsed.options, noEmit: true });
  const checker = program.getTypeChecker();
  const source = program.getSourceFile(ENTRY);
  if (!source) throw new Error(`no source file for ${ENTRY}`);
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) throw new Error(`no module symbol for ${ENTRY}`);
  return checker.getExportsOfModule(moduleSymbol).map((s) => s.name).sort();
}

describe('the engine package contract (ADR-342)', () => {
  it('index.ts carries no export * (D4)', () => {
    const text = readFileSync(ENTRY, 'utf-8');
    const wildcards = text.split('\n').filter((line) => /^\s*export\s+\*/.test(line));
    expect(wildcards).toEqual([]);
  });

  it('exports exactly the names ADR-342 D1 lists (D5)', () => {
    const names = exportedNames();
    const unexpected = names.filter((n) => !CONTRACT.includes(n));
    const missing = CONTRACT.filter((n) => !names.includes(n));
    expect({ unexpected, missing }).toEqual({ unexpected: [], missing: [] });
    expect(names).toEqual(CONTRACT);
  });
});
