/**
 * manifest.ts — `repokit manifest`: the ADR-276 D2 standing build step.
 *
 * Generates the locale-keyed stdlib manifest module
 * (`packages/chord/src/stdlib-manifest.ts`) — the DATA that lets the Chord
 * analyzer gate stdlib-referencing constructs at compile time while the chord
 * package stays platform-free (it imports nothing; the generator runs out
 * here, outside the runtime graph, exactly like `repokit grammar`). Facts are
 * split per ADR-276 Q-2: locale-neutral (action ids; setting schemas in
 * Phase 5) at top level, locale-owned (grammar shapes, direction words —
 * Phases 4/6) under `locales`, `en-US` the sole entry today.
 *
 * Slices: the stdlib action-id set, read from
 * `packages/stdlib/src/actions/constants.ts` SOURCE (the `readStdlibActionIds`
 * mechanism `repokit grammar` already uses — stdlib builds after chord, so no
 * dist exists to consult); and the per-action standard grammar pattern shapes
 * (locale-owned), derived from the SAME `compileStandardGrammarRules`
 * expansion that emits parser-en-us/src/grammar.ts. `--check` is the
 * freshness gate: regenerate and diff against the committed module, exit 1 on
 * drift; `repokit verify` and the platform build both run it.
 *
 * Second module (ADR-310 Phase 3): `packages/chord/src/character-manifest.ts`
 * — the descriptive character vocabulary (personality, intensities, moods,
 * dispositions, threats, confidences, fact sources, resistance modes,
 * cognitive dimensions) from world-model's built
 * `character-vocabulary.js`, plus the profile presets from character's built
 * `cognitive-presets.js`. Same generate-and-gate lifecycle as the stdlib
 * module; the vocabulary itself is frozen author surface (contracts.md §6),
 * so the gate catches any platform-side list change the language didn't take.
 *
 * The dist gate (GH #358): the generators `require()` built modules from
 * world-model, character, story-loader and chord. The step runs BEFORE those
 * packages compile in the platform build, so what it finds is whatever the
 * previous build left — which may be missing (a cold host) or STALE (a host
 * whose last successful build predates the exports the generator now reads).
 * Both must fall back to the committed modules; only a dist that loads and
 * carries every export the generators read is used. A stale dist that was
 * merely present used to be required, blow up on `undefined.length`, and kill
 * the build three packages in — before world-model's own compile, the one
 * thing that would have refreshed it, ever ran. plover sat in that state from
 * 2026-08-14 to 2026-09-04 and served a Chord 3.0.0 playground the whole time.
 *
 * Public interface: ManifestCommand, runManifestStep, checkManifestModule,
 * probeDistModules, DIST_MODULES.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRepoRoot } from '../repo';
import { Command } from './command';
import { compileStandardGrammarRules, readStdlibActionIds } from './grammar';

const MODULE_PATH = 'packages/chord/src/stdlib-manifest.ts';
const CHARACTER_MODULE_PATH = 'packages/chord/src/character-manifest.ts';

/**
 * Chord (kebab-case) dimension spelling ↔ the CognitiveProfile camelCase
 * field, in declaration order — the preset emitter's key translation.
 */
const DIMENSION_FIELDS: ReadonlyArray<[string, string]> = [
  ['perception', 'perception'],
  ['belief-formation', 'beliefFormation'],
  ['coherence', 'coherence'],
  ['lucidity', 'lucidity'],
  ['self-model', 'selfModel'],
];

/** Produce the generated module's TS text from the stdlib sources of truth. */
export function generateManifestModule(root: string): { source: string; actionIds: number; shapedActions: number } {
  const actionIds = [...readStdlibActionIds(root)].sort();

  // Grammar-shape slice (ADR-276 Phase 4, census 3): the per-action pattern
  // shapes the loader's removeRules compares by EXACT string equality —
  // derived from the same compileStandardGrammarRules expansion that emits
  // parser-en-us/src/grammar.ts, so the manifest and the registered rules
  // cannot drift. The platform-side exception rules (platform-grammar.ts:
  // `?`, `trace …`) are deliberately absent: `?` is unlexable in Chord and
  // `trace` derives no stdlib id, so neither is expressible as a removal —
  // the Chord grammar source IS the removable surface.
  const { rules } = compileStandardGrammarRules(root);
  const grammarShapes = new Map<string, string[]>();
  for (const rule of rules) {
    const list = grammarShapes.get(rule.action) ?? [];
    if (!list.includes(rule.pattern)) list.push(rule.pattern);
    grammarShapes.set(rule.action, list);
  }

  // Setting-schema slice (ADR-276 Phase 5, census 4–6): the Q-3 declarative
  // table, required from story-loader's BUILT dist — the module composes its
  // data (NPC_SHARED reuse), so source-regexing would be fragile where a
  // dist require is exact; the chord-dist precedent above. Locale-NEUTRAL:
  // setting value types are platform facts, not language facts.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { SETTING_SCHEMA, HIDING_POSITIONS } = require(join(root, 'packages/story-loader/dist/setting-schema.js')) as {
    SETTING_SCHEMA: ReadonlyMap<string, ReadonlyMap<string, { value: string }>>;
    HIDING_POSITIONS: readonly string[];
  };
  const settingSchema: Array<[string, Array<[string, string]>]> = [];
  for (const [trait, entries] of SETTING_SCHEMA) {
    settingSchema.push([trait, [...entries].map(([key, spec]) => [key, spec.value])]);
  }

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * stdlib-manifest.ts — GENERATED by `repokit manifest` (ADR-276 D2).');
  lines.push(' * DO NOT EDIT — edit the stdlib source and regenerate; the freshness gate');
  lines.push(' * (`repokit manifest --check`, run by `repokit verify` and the platform');
  lines.push(' * build) fails the build on drift.');
  lines.push(' *');
  lines.push(' * The stdlib facts the analyzer gates against at compile time. Data only —');
  lines.push(' * chord stays platform-FREE (imports nothing) while no longer being');
  lines.push(' * stdlib-IGNORANT (ADR-276 D1). Locale-neutral facts sit at top level;');
  lines.push(' * locale-owned facts (grammar shapes, direction words) go under `locales`,');
  lines.push(' * keyed from day one (Q-2), `en-US` the sole entry.');
  lines.push(' *');
  lines.push(' * Public interface: STDLIB_MANIFEST, StdlibManifest, StdlibLocaleFacts.');
  lines.push(' * Owner context: @sharpee/chord (generated artifact; browser-safe).');
  lines.push(' */');
  lines.push('');
  lines.push('/** Locale-owned stdlib facts (direction words join in a later ADR-276 phase). */');
  lines.push('export interface StdlibLocaleFacts {');
  lines.push('  /**');
  lines.push("   * Standard grammar pattern shapes per action id — the loader's removable");
  lines.push('   * surface (ADR-270 D3), rendered exactly as the registered rule patterns');
  lines.push('   * (`take :item`); removal matching is string equality on these.');
  lines.push('   */');
  lines.push('  grammarShapes: Readonly<Record<string, readonly string[]>>;');
  lines.push('}');
  lines.push('');
  lines.push('export interface StdlibManifest {');
  lines.push('  /** Full stdlib action-id set (`if.action.*`), from stdlib actions/constants.ts. */');
  lines.push('  actionIds: ReadonlySet<string>;');
  lines.push('  /**');
  lines.push('   * Platform trait setting value types (trait adjective → key → type) —');
  lines.push("   * the Q-3 declarative table from story-loader's setting-schema.ts.");
  lines.push("   * Keyless v1 entity refs (`lockable with the iron key`) appear under");
  lines.push("   * their message label (`key`/`tool`). Locale-neutral: platform facts.");
  lines.push('   */');
  lines.push("  settingSchema: Readonly<Record<string, Readonly<Record<string, 'boolean' | 'number' | 'entity-ref' | 'rooms'>>>>;");
  lines.push('  /** The closed hiding-position domain (ratchet G3) — listing order is the message order. */');
  lines.push('  hidingPositions: readonly string[];');
  lines.push('  /** Locale-owned facts, keyed by locale id (ADR-276 Q-2). */');
  lines.push('  locales: Readonly<Record<string, StdlibLocaleFacts>>;');
  lines.push('}');
  lines.push('');
  lines.push('export const STDLIB_MANIFEST: StdlibManifest = {');
  lines.push('  actionIds: new Set([');
  for (const id of actionIds) {
    lines.push(`    ${JSON.stringify(id)},`);
  }
  lines.push('  ]),');
  lines.push('  settingSchema: {');
  for (const [trait, entries] of settingSchema) {
    lines.push(
      `    ${JSON.stringify(trait)}: { ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ')} },`,
    );
  }
  lines.push('  },');
  lines.push(`  hidingPositions: [${HIDING_POSITIONS.map((p) => JSON.stringify(p)).join(', ')}],`);
  lines.push('  locales: {');
  lines.push("    'en-US': {");
  lines.push('      grammarShapes: {');
  for (const [action, shapes] of [...grammarShapes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`        ${JSON.stringify(action)}: [${shapes.map((s) => JSON.stringify(s)).join(', ')}],`);
  }
  lines.push('      },');
  lines.push('    },');
  lines.push('  },');
  lines.push('};');
  lines.push('');
  return { source: lines.join('\n'), actionIds: actionIds.length, shapedActions: grammarShapes.size };
}

/**
 * Produce the generated character-manifest module's TS text from the
 * world-model vocabulary and character preset sources of truth (both read
 * from built dists — the values live in runtime consts, not regexable
 * source; the setting-schema precedent above). ADR-310 Phase 3.
 */
export function generateCharacterManifestModule(root: string): { source: string; words: number; presets: number } {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const vocab = require(join(root, 'packages/world-model/dist/traits/character-model/character-vocabulary.js')) as {
    PERSONALITY_TRAITS: readonly string[];
    INTENSITY_WORDS: readonly string[];
    MOODS: readonly string[];
    MOOD_MODIFIERS: readonly string[];
    DISPOSITION_WORDS: readonly string[];
    THREAT_LEVELS: readonly string[];
    CONFIDENCE_WORDS: readonly string[];
    FACT_SOURCES: readonly string[];
    RESISTANCE_MODES: readonly string[];
    COGNITIVE_DIMENSIONS: Readonly<Record<string, readonly string[]>>;
    FORCES: readonly string[];
    ACT_CATEGORIES: readonly string[];
    OBLIGATION_WORDS: readonly string[];
    FACE_ACTS: readonly string[];
    PRESSURE_BANDS: readonly string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { COGNITIVE_PRESETS } = require(join(root, 'packages/character/dist/cognitive-presets.js')) as {
    COGNITIVE_PRESETS: Readonly<Record<string, Readonly<Record<string, string>>>>;
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PROPAGATION_AUDIENCES } = require(join(root, 'packages/character/dist/propagation/propagation-types.js')) as {
    PROPAGATION_AUDIENCES: readonly string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GOAL_PRIORITIES } = require(join(root, 'packages/character/dist/goals/goal-types.js')) as {
    GOAL_PRIORITIES: readonly string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { INFLUENCE_MODES, INFLUENCE_RANGES } = require(join(root, 'packages/character/dist/influence/influence-types.js')) as {
    INFLUENCE_MODES: readonly string[];
    INFLUENCE_RANGES: readonly string[];
  };

  const wordLists: Array<[key: string, doc: string, words: readonly string[]]> = [
    ['personality', 'Personality adjectives (ADR-310 D2) — includes ADR-318 D8 conscience sensitivity.', vocab.PERSONALITY_TRAITS],
    ['intensities', 'Intensity modifiers a personality adjective may carry (`very honest`).', vocab.INTENSITY_WORDS],
    ['moods', 'Platform mood words (`mood nervous`, ADR-310 D3).', vocab.MOODS],
    ['moodModifiers', 'Custom-mood nudge words (`define mood … like <mood>, but <modifier>`, ADR-310 D5).', vocab.MOOD_MODIFIERS],
    ['dispositions', 'Disposition words (`feels wary of …`, ADR-310 D3) — some are two words.', vocab.DISPOSITION_WORDS],
    ['threats', 'Threat words (runtime state; predicate vocabulary, never declared).', vocab.THREAT_LEVELS],
    ['confidences', 'Confidence words in ascending order (`knows`/`thinks` comma slot, ADR-310 D14).', vocab.CONFIDENCE_WORDS],
    ['factSources', 'Fact sources (`knows the murder, witnessed`, ADR-310 D3).', vocab.FACT_SOURCES],
    ['resistanceModes', 'Belief resistance modes (ADR-310 D14 fold).', vocab.RESISTANCE_MODES],
    ['audiences', 'Propagation audiences (`spreads … to <audience>`, ADR-310 D10).', PROPAGATION_AUDIENCES],
    ['goalPriorities', 'Goal priorities (`goal <name>, <priority>`, ADR-310 D8).', GOAL_PRIORITIES],
    ['influenceModes', 'Influence modes (the `influence` header, ADR-310 D9).', INFLUENCE_MODES],
    ['influenceRanges', 'Influence ranges (the `influence` header, ADR-310 D9).', INFLUENCE_RANGES],
    ['forces', 'The five arbiter forces (`<force> over <force>` temperament pairs, ADR-318 D1/D3).', vocab.FORCES],
    ['actCategories', 'Act categories principle lines gate (`never <category>`, ADR-318 D4) — some are multi-word.', vocab.ACT_CATEGORIES],
    ['obligationWords', 'Obligation words (`protects <scope>` / `answers honestly`, ADR-318 D4/D5).', vocab.OBLIGATION_WORDS],
    ['faceActs', 'Face-acts — the closed honor vocabulary (`honor before <scope>` / `define honor`, ADR-318 D7).', vocab.FACE_ACTS],
    ['pressureBands', 'Conscience pressure bands in monotonic order (predicate vocabulary, ADR-318 D8).', vocab.PRESSURE_BANDS],
  ];
  const words = wordLists.reduce((n, [, , list]) => n + list.length, 0);

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * character-manifest.ts — GENERATED by `repokit manifest` (ADR-310 Phase 3).');
  lines.push(' * DO NOT EDIT — edit the world-model character-vocabulary / character');
  lines.push(' * cognitive-presets sources and regenerate; the freshness gate');
  lines.push(' * (`repokit manifest --check`, run by `repokit verify` and the platform');
  lines.push(' * build) fails the build on drift.');
  lines.push(' *');
  lines.push(' * The character vocabulary the analyzer gates ADR-310 D2-D5/D14');
  lines.push(' * (descriptive) and ADR-318 D3-D9 (normative) constructs against at');
  lines.push(' * compile time. Data only — chord stays');
  lines.push(' * platform-FREE. These word lists are frozen author-facing compatibility');
  lines.push(' * surface (freeze review: David, 2026-08-15 — docs/work/archive/adr-310/');
  lines.push(' * contracts.md §6): removing a word breaks stories, additions stay possible.');
  lines.push(' *');
  lines.push(' * Public interface: CHARACTER_MANIFEST, CharacterManifest.');
  lines.push(' * Owner context: @sharpee/chord (generated artifact; browser-safe).');
  lines.push(' */');
  lines.push('');
  lines.push('export interface CharacterManifest {');
  for (const [key, doc] of wordLists) {
    lines.push(`  /** ${doc} */`);
    lines.push(`  ${key}: readonly string[];`);
  }
  lines.push('  /** The five cognitive dimensions (kebab spelling) and their closed value sets (ADR-310 D4). */');
  lines.push('  cognitiveDimensions: Readonly<Record<string, readonly string[]>>;');
  lines.push('  /** Profile presets (ADR-310 D5 behavioral names) — preset name → dimension (kebab) → value. */');
  lines.push('  profilePresets: Readonly<Record<string, Readonly<Record<string, string>>>>;');
  lines.push('}');
  lines.push('');
  lines.push('export const CHARACTER_MANIFEST: CharacterManifest = {');
  for (const [key, , list] of wordLists) {
    lines.push(`  ${key}: [${list.map((w) => JSON.stringify(w)).join(', ')}],`);
  }
  lines.push('  cognitiveDimensions: {');
  for (const [dimension] of DIMENSION_FIELDS) {
    const values = vocab.COGNITIVE_DIMENSIONS[dimension] ?? [];
    lines.push(`    ${JSON.stringify(dimension)}: [${values.map((v) => JSON.stringify(v)).join(', ')}],`);
  }
  lines.push('  },');
  lines.push('  profilePresets: {');
  for (const [preset, profile] of Object.entries(COGNITIVE_PRESETS)) {
    const entries = DIMENSION_FIELDS.map(([kebab, field]) => `${JSON.stringify(kebab)}: ${JSON.stringify(profile[field])}`);
    lines.push(`    ${JSON.stringify(preset)}: { ${entries.join(', ')} },`);
  }
  lines.push('  },');
  lines.push('};');
  lines.push('');
  return { source: lines.join('\n'), words, presets: Object.keys(COGNITIVE_PRESETS).length };
}

/**
 * Every built module the two generators `require()`, with the exports each
 * one reads. This is the contract a dist must meet to be USABLE; a module that
 * is present but lacks any listed export is stale and is treated exactly like
 * a missing one. Keep in step with the `require()` calls in
 * `generateManifestModule` and `generateCharacterManifestModule` — an export
 * read there but absent here is the GH #358 crash waiting to recur.
 */
export const DIST_MODULES: ReadonlyArray<[path: string, exports: readonly string[]]> = [
  // The grammar-shape slice compiles the standard grammar with chord itself;
  // any prior build's compiler will do, so only loading is required.
  ['packages/chord/dist/index.js', []],
  ['packages/story-loader/dist/setting-schema.js', ['SETTING_SCHEMA', 'HIDING_POSITIONS']],
  [
    'packages/world-model/dist/traits/character-model/character-vocabulary.js',
    [
      'PERSONALITY_TRAITS',
      'INTENSITY_WORDS',
      'MOODS',
      'MOOD_MODIFIERS',
      'DISPOSITION_WORDS',
      'THREAT_LEVELS',
      'CONFIDENCE_WORDS',
      'FACT_SOURCES',
      'RESISTANCE_MODES',
      'COGNITIVE_DIMENSIONS',
      'FORCES',
      'ACT_CATEGORIES',
      'OBLIGATION_WORDS',
      'FACE_ACTS',
      'PRESSURE_BANDS',
    ],
  ],
  ['packages/character/dist/cognitive-presets.js', ['COGNITIVE_PRESETS']],
  ['packages/character/dist/propagation/propagation-types.js', ['PROPAGATION_AUDIENCES']],
  ['packages/character/dist/goals/goal-types.js', ['GOAL_PRIORITIES']],
  ['packages/character/dist/influence/influence-types.js', ['INFLUENCE_MODES', 'INFLUENCE_RANGES']],
];

/**
 * Decide whether the built modules under `root` are usable by the generators.
 *
 * @returns `null` when every module in `DIST_MODULES` exists, loads, and
 *   exports every name the generators read; otherwise one sentence naming
 *   the first module that fails and why (not built / failed to load / stale
 *   with the missing exports listed) — the text `runManifestStep` prints when
 *   it falls back to the committed modules.
 */
export function probeDistModules(root: string): string | null {
  for (const [rel, names] of DIST_MODULES) {
    const abs = join(root, rel);
    if (!existsSync(abs)) return `${rel} not built yet`;
    let mod: Record<string, unknown>;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mod = require(abs) as Record<string, unknown>;
    } catch (error) {
      return `${rel} failed to load: ${error instanceof Error ? error.message : String(error)}`;
    }
    const missing = names.filter((n) => mod[n] === undefined);
    if (missing.length > 0) {
      return `${rel} is stale — missing export(s) ${missing.join(', ')} (built before the source that defines them)`;
    }
  }
  return null;
}

/**
 * Generate and write both manifest modules (runs before chord compiles in
 * the platform build). The generators read built modules from a PRIOR build;
 * when those are missing (cold build) or stale (a host whose last build
 * predates what the generators now read — GH #358), the committed modules
 * stand in and the step says why. The verify gate still proves freshness once
 * a current dist exists.
 *
 * @throws when the dist is unusable AND no committed modules exist to fall
 *   back on — the platform has to be built once before `repokit manifest`.
 */
export function runManifestStep(root: string, quiet = false): void {
  const unusable = probeDistModules(root);
  if (unusable) {
    if (existsSync(join(root, MODULE_PATH)) && existsSync(join(root, CHARACTER_MODULE_PATH))) {
      if (!quiet) console.log(`manifest: ${unusable} — using the committed modules`);
      return;
    }
    throw new Error(
      `manifest: ${unusable}, and no committed manifest module to fall back on — build the platform once, then run \`repokit manifest\``,
    );
  }
  const { source, actionIds, shapedActions } = generateManifestModule(root);
  writeFileSync(join(root, MODULE_PATH), source);
  const character = generateCharacterManifestModule(root);
  writeFileSync(join(root, CHARACTER_MODULE_PATH), character.source);
  if (!quiet) {
    console.log(`manifest: ${MODULE_PATH} regenerated — ${actionIds} action ids, ${shapedActions} shaped actions`);
    console.log(`manifest: ${CHARACTER_MODULE_PATH} regenerated — ${character.words} vocabulary words, ${character.presets} presets`);
  }
}

/** The freshness gate: both regenerated modules must match the committed files byte-for-byte. */
export function checkManifestModule(root: string): boolean {
  const stdlibPath = join(root, MODULE_PATH);
  const characterPath = join(root, CHARACTER_MODULE_PATH);
  if (!existsSync(stdlibPath) || !existsSync(characterPath)) return false;
  if (generateManifestModule(root).source !== readFileSync(stdlibPath, 'utf8')) return false;
  return generateCharacterManifestModule(root).source === readFileSync(characterPath, 'utf8');
}

export class ManifestCommand implements Command {
  readonly name = 'manifest';
  readonly summary = 'Regenerate the chord stdlib + character manifests from platform source (--check: freshness gate)';

  run(args: string[]): number {
    const root = findRepoRoot();
    if (args.includes('--check')) {
      if (checkManifestModule(root)) {
        console.log('manifest --check: committed modules match the platform sources');
        return 0;
      }
      console.error(
        'manifest --check: STALE — packages/chord/src/stdlib-manifest.ts or ' +
          'character-manifest.ts does not match the platform sources. Run `repokit manifest` and commit the result.',
      );
      return 1;
    }
    runManifestStep(root);
    return 0;
  }
}
