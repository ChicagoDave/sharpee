/**
 * grammar.ts — `repokit grammar`: the ADR-269 D7 standing build step.
 *
 * Compiles the Chord standard-grammar source
 * (`packages/parser-en-us/grammar/standard-en-us.story`) with the built
 * `@sharpee/chord` (built 4th, well before parser-en-us — repo.ts order) and
 * emits the GENERATED registration module `packages/parser-en-us/src/grammar.ts`
 * (keeping the `defineGrammar(grammar)` export — the parser constructor and the
 * sync tests consume it unchanged). D10: each `define action <name>` binds
 * `if.action.<name>`, validated against the stdlib action-id set read from
 * `packages/stdlib/src/actions/constants.ts` SOURCE (stdlib builds after
 * parser-en-us, so its dist cannot be consulted here; the constants file is the
 * authority and ships in the same commit). `--check` is the freshness gate:
 * regenerate and diff against the committed module, exit 1 on drift.
 *
 * ADR-272 D4/D5: the same command emits a SECOND generated artifact — the docs
 * data module `website/src/app/chord/stdlib/reference/grammar-blocks.ts`
 * (verbatim per-action block texts for <GrammarBlock>), validated loud in both
 * directions against the reference page's entry headings; `--check` covers it.
 *
 * Public interface: GrammarCommand, runGrammarStep, checkGrammarModule,
 * checkDocsBlocksModule.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { findRepoRoot } from '../repo';
import { Command } from './command';

export interface EmittedRule {
  pattern: string;
  action: string;
  defaults: Record<string, string> | null;
  slotTypes: Record<string, 'instrument' | 'topic'>;
}

/** Read the stdlib action-id set from the constants SOURCE (see header). */
export function readStdlibActionIds(root: string): Set<string> {
  const src = readFileSync(join(root, 'packages/stdlib/src/actions/constants.ts'), 'utf8');
  const ids = new Set<string>();
  for (const m of src.matchAll(/'(if\.action\.[a-z][a-z0-9_]*)'/g)) ids.add(m[1]);
  if (ids.size < 40) {
    throw new Error(
      `grammar: stdlib constants.ts yielded only ${ids.size} action ids — extraction broken or file moved`,
    );
  }
  return ids;
}

/** Levenshtein distance for the D10 did-you-mean suggestion. */
function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

/**
 * Expand a compiled grammar-file IR to the rule list the loader's emission
 * semantics produce — standard-flavored (ADR-269 D3): `if.action.*` ids, no
 * bare-verb prefix rules, no dispatch registration. Mirrors
 * story-loader/src/loader.ts extendParser (ADR-267 D12 grouping included, so
 * registration order matches the story-side precedent exactly).
 */
export function expandGrammarIr(ir: {
  actions: Array<{
    name: string;
    patterns: Array<{
      parts: Array<{ kind: string; word?: string; words?: string[]; optional?: boolean }>;
      cardinality: string[] | null;
      means?: Array<{ key: string; value: string }>;
    }>;
    constraints: Array<{ slot: string; requirement: string }>;
    greedy?: string[];
    slotTypes?: Array<{ slot: string; type: 'instrument' | 'topic' }>;
    directions?: Array<{ canonical: string; aliases: string[] }>;
  }>;
}): EmittedRule[] {
  const renderPart = (part: { kind: string; word?: string; words?: string[]; optional?: boolean }): string => {
    const core =
      part.kind === 'alt' ? (part.words ?? []).join('|')
      : part.kind === 'slot' ? `:${part.word}`
      : String(part.word);
    return part.optional ? `[${core}]` : core;
  };

  const emitted: EmittedRule[] = [];
  for (const action of ir.actions) {
    const actionId = `if.action.${action.name}`;
    const directions = action.directions ?? [];
    if ((action.constraints ?? []).length > 0) {
      throw new Error(`grammar: ${actionId} carries a scope constraint — the standard grammar defines none (ADR-269 D2); rule the divergence before adding one`);
    }
    if ((action.greedy ?? []).length > 0) {
      throw new Error(`grammar: ${actionId} declares a greedy slot — none exist in the standard grammar baseline; rule the divergence first`);
    }
    const slotTypes = Object.fromEntries((action.slotTypes ?? []).map((st) => [st.slot, st.type]));

    const emissions: Array<{ text: string; defaults: Record<string, string> | null }> = [];
    for (const pattern of action.patterns) {
      if (pattern.cardinality) {
        throw new Error(`grammar: ${actionId} uses → cardinality — not a standard-grammar construct`);
      }
      const means = pattern.means?.length
        ? Object.fromEntries(pattern.means.map((m) => [m.key, m.value]))
        : null;
      const usesDirection =
        directions.length > 0 && pattern.parts.some((p) => p.kind === 'slot' && p.word === 'direction');
      if (usesDirection) {
        const isBare = pattern.parts.length === 1;
        for (const entry of directions) {
          for (const alias of [entry.canonical, ...entry.aliases]) {
            const text = isBare
              ? alias
              : pattern.parts
                  .map((p) => (p.kind === 'slot' && p.word === 'direction' ? alias : renderPart(p)))
                  .join(' ');
            emissions.push({ text, defaults: { ...(means ?? {}), direction: entry.canonical } });
          }
        }
      } else {
        emissions.push({ text: pattern.parts.map(renderPart).join(' '), defaults: means });
      }
    }
    // Group-major registration order (loader.ts:1171-1198) — one group per
    // distinct defaults object, insertion-ordered.
    const groups = new Map<string, { defaults: Record<string, string> | null; texts: string[] }>();
    for (const e of emissions) {
      const key = JSON.stringify(e.defaults);
      const group = groups.get(key) ?? { defaults: e.defaults, texts: [] };
      group.texts.push(e.text);
      groups.set(key, group);
    }
    for (const group of groups.values()) {
      for (const text of group.texts) {
        const ruleSlotTypes: EmittedRule['slotTypes'] = {};
        for (const [slot, type] of Object.entries(slotTypes)) {
          if (text.includes(`:${slot}`)) ruleSlotTypes[slot] = type as 'instrument' | 'topic';
        }
        emitted.push({ pattern: text, action: actionId, defaults: group.defaults, slotTypes: ruleSlotTypes });
      }
    }
  }
  return emitted;
}

/**
 * ADR-269 D10: each `define action <name>` in a grammar file derives
 * `if.action.<name>`; an unknown name is a named error with a did-you-mean —
 * never a silent `chord.action.*` mint. Returns one error string per bad name.
 */
export function validateActionNames(names: string[], validIds: Set<string>): string[] {
  const errors: string[] = [];
  for (const name of names) {
    const id = `if.action.${name}`;
    if (!validIds.has(id)) {
      const candidates = [...validIds].map((v) => v.slice('if.action.'.length));
      const nearest = candidates.sort((a, b) => editDistance(name, a) - editDistance(name, b))[0];
      errors.push(
        `grammar: \`define action ${name}\` derives ${id}, which is no stdlib action — did you mean \`${nearest}\`? (ADR-269 D10)`,
      );
    }
  }
  return errors;
}

/**
 * Compile the standard-grammar Chord source with the built chord dist and
 * expand its emitted rule list — shared by the grammar step (module emission)
 * and the ADR-276 manifest step (grammar-shape slice), so both artifacts
 * derive from ONE compile + ONE expansion and cannot drift from each other.
 */
export function compileStandardGrammarRules(root: string): { rules: EmittedRule[]; actions: number } {
  const storyPath = join(root, 'packages/parser-en-us/grammar/standard-en-us.story');
  const chordDist = join(root, 'packages/chord/dist/index.js');
  if (!existsSync(chordDist)) {
    throw new Error('grammar: @sharpee/chord dist not built — run the platform build through chord first');
  }
  // Runtime require of the built compiler — outside the package graph, the
  // bundle-entry.js precedent (ADR-210 direction rule stands).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { compile } = require(chordDist) as {
    compile: (src: string, opts?: object) => {
      ok: boolean;
      ir: { grammarFile?: { name: string }; actions: Parameters<typeof expandGrammarIr>[0]['actions'] } | null;
      diagnostics: Array<{ severity: string; code: string; message: string; span?: { line: number } }>;
    };
  };
  const storySrc = readFileSync(storyPath, 'utf8');
  const grammarDir = dirname(storyPath);
  const result = compile(storySrc, {
    importResolver: (name: string) => {
      const p = join(grammarDir, name);
      return existsSync(p) ? readFileSync(p, 'utf8') : null;
    },
  });
  const errors = result.diagnostics.filter((d) => d.severity === 'error');
  if (errors.length > 0 || !result.ok || !result.ir) {
    const lines = errors.map((e) => `  ${e.code} (line ${e.span?.line ?? '?'}): ${e.message}`);
    throw new Error(`grammar: standard-en-us.story does not compile:\n${lines.join('\n')}`);
  }
  if (!result.ir.grammarFile) {
    throw new Error('grammar: standard-en-us.story carries no `grammar` header — not a grammar file (ADR-269 D8)');
  }

  // D10: derived ids validated against the stdlib set — named error with a
  // did-you-mean, never a silent chord.action.* mint.
  const errors2 = validateActionNames(result.ir.actions.map((a) => a.name), readStdlibActionIds(root));
  if (errors2.length > 0) throw new Error(errors2.join('\n'));

  return { rules: expandGrammarIr(result.ir), actions: result.ir.actions.length };
}

/** Compile the Chord source and produce the generated module's TS text. */
export function generateGrammarModule(root: string): { source: string; rules: number; actions: number } {
  const { rules, actions } = compileStandardGrammarRules(root);
  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * grammar.ts — GENERATED by `repokit grammar` from grammar/standard-en-us.story');
  lines.push(' * (ADR-269 D7). DO NOT EDIT — edit the Chord source and regenerate; the');
  lines.push(' * freshness gate (`repokit grammar --check`) fails the build on drift.');
  lines.push(' *');
  lines.push(' * The Chord file is the standard grammar\'s editable source (ADR-266 (iv));');
  lines.push(' * this module is its build-time registration form — one `.define()` per');
  lines.push(' * registered rule, in emission order (definition order is semantic,');
  lines.push(' * ADR-268). Platform-side exception rules (`?`, `trace …`) live in');
  lines.push(' * platform-grammar.ts, not here.');
  lines.push(' *');
  lines.push(' * Public interface: defineGrammar(grammar).');
  lines.push(' * Owner context: parser-en-us (generated artifact).');
  lines.push(' */');
  lines.push('');
  lines.push("import { type GrammarBuilder } from '@sharpee/if-domain';");
  lines.push('');
  lines.push('/**');
  lines.push(' * Register the standard English grammar (generated).');
  lines.push(' * @param grammar The grammar builder to use');
  lines.push(' */');
  lines.push('export function defineGrammar(grammar: GrammarBuilder): void {');
  for (const r of rules) {
    let chain = `  grammar.define(${JSON.stringify(r.pattern)}).mapsTo(${JSON.stringify(r.action)})`;
    if (r.defaults) chain += `.withDefaultSemantics(${JSON.stringify(r.defaults)})`;
    for (const [slot, type] of Object.entries(r.slotTypes)) {
      chain += type === 'instrument' ? `.instrument(${JSON.stringify(slot)})` : `.topic(${JSON.stringify(slot)})`;
    }
    chain += '.build();';
    lines.push(chain);
  }
  lines.push('}');
  lines.push('');
  return { source: lines.join('\n'), rules: rules.length, actions };
}

const MODULE_PATH = 'packages/parser-en-us/src/grammar.ts';
const DOCS_MODULE_PATH = 'website/src/app/chord/stdlib/reference/grammar-blocks.ts';
const REFERENCE_MDX_PATH = 'website/src/app/chord/stdlib/reference/content.mdx';

/** The one reference entry with no player-typed grammar (ADR-272 D4 ruled exception). */
const GRAMMARLESS_ENTRIES = new Set(['if.action.deadly_room_death']);

/**
 * Split the Chord grammar source into per-action verbatim block texts, keyed
 * by derived action id. `##` comments are top-level-only in a grammar file, so
 * a block runs from its `define action` line to the next top-level line;
 * trailing blank lines are trimmed, nothing else is reformatted (ADR-272 D4).
 */
export function extractGrammarBlocks(storySrc: string): Map<string, string> {
  const blocks = new Map<string, string>();
  let id: string | null = null;
  let acc: string[] = [];
  const flush = () => {
    if (id === null) return;
    while (acc.length > 0 && acc[acc.length - 1].trim() === '') acc.pop();
    blocks.set(id, acc.join('\n'));
    id = null;
    acc = [];
  };
  for (const line of storySrc.split('\n')) {
    const m = /^define action ([a-z][a-z0-9_]*)\s*$/.exec(line);
    if (m) {
      flush();
      id = `if.action.${m[1]}`;
      acc = [line];
    } else if (id !== null) {
      if (/^\S/.test(line)) flush();
      else acc.push(line);
    }
  }
  flush();
  return blocks;
}

/** Read the `if.action.*` ids from the reference page's `##` entry headings. */
export function readReferenceEntryIds(root: string): string[] {
  const mdx = readFileSync(join(root, REFERENCE_MDX_PATH), 'utf8');
  const ids: string[] = [];
  for (const m of mdx.matchAll(/^## .*`(if\.action\.[a-z][a-z0-9_]*)`/gm)) ids.push(m[1]);
  if (ids.length < 40) {
    throw new Error(
      `grammar docs: ${REFERENCE_MDX_PATH} yielded only ${ids.length} entry ids — heading extraction broken or file moved`,
    );
  }
  return ids;
}

/**
 * ADR-272 D4 both-directions loudness: an entry without a block (beyond the
 * ruled exception) and a block without an entry are errors, never silence.
 * Returns one error string per violation.
 */
export function validateDocsCoverage(blockIds: Iterable<string>, entryIds: Iterable<string>): string[] {
  const blockSet = new Set(blockIds);
  const entrySet = new Set(entryIds);
  const errors: string[] = [];
  for (const entryId of entrySet) {
    if (!blockSet.has(entryId) && !GRAMMARLESS_ENTRIES.has(entryId)) {
      errors.push(`grammar docs: reference entry ${entryId} has no block in standard-en-us.story (ADR-272 D4)`);
    }
  }
  for (const blockId of blockSet) {
    if (!entrySet.has(blockId)) {
      errors.push(`grammar docs: source block ${blockId} has no entry in stdlib/reference/content.mdx (ADR-272 D4)`);
    }
  }
  for (const exceptionId of GRAMMARLESS_ENTRIES) {
    if (blockSet.has(exceptionId)) {
      errors.push(`grammar docs: ${exceptionId} is ruled grammarless but now has a source block — retire the exception (ADR-272 D4)`);
    }
  }
  return errors;
}

/** ADR-272 D4/D5: derive the committed docs data module from the shipped Chord source. */
export function generateDocsBlocksModule(root: string): { source: string; blocks: number } {
  const storySrc = readFileSync(join(root, 'packages/parser-en-us/grammar/standard-en-us.story'), 'utf8');
  const blocks = extractGrammarBlocks(storySrc);
  const errors = validateDocsCoverage(blocks.keys(), readReferenceEntryIds(root));
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const lines: string[] = [];
  lines.push('/**');
  lines.push(' * grammar-blocks.ts — GENERATED by `repokit grammar` from');
  lines.push(' * packages/parser-en-us/grammar/standard-en-us.story (ADR-272 D4/D5).');
  lines.push(' * DO NOT EDIT — edit the Chord source and regenerate; the freshness gate');
  lines.push(' * (`repokit grammar --check`, run by `repokit verify`) fails the build on drift.');
  lines.push(' *');
  lines.push(' * Each entry is the action\'s `define action` block VERBATIM from the shipped');
  lines.push(' * standard grammar, in definition order. Rendered by <GrammarBlock>.');
  lines.push(' *');
  lines.push(' * Public interface: grammarBlocks (action id -> block text).');
  lines.push(' * Owner context: website stdlib reference (generated artifact).');
  lines.push(' */');
  lines.push('');
  lines.push('export const grammarBlocks: Record<string, string> = {');
  for (const [blockId, text] of blocks) {
    lines.push(`  ${JSON.stringify(blockId)}: ${JSON.stringify(text)},`);
  }
  lines.push('};');
  lines.push('');
  return { source: lines.join('\n'), blocks: blocks.size };
}

/** Generate and write both generated artifacts (the build-step entry, called before parser-en-us compiles). */
export function runGrammarStep(root: string, quiet = false): void {
  const { source, rules, actions } = generateGrammarModule(root);
  writeFileSync(join(root, MODULE_PATH), source);
  if (!quiet) console.log(`grammar: ${MODULE_PATH} regenerated — ${rules} rules, ${actions} actions`);
  const docs = generateDocsBlocksModule(root);
  writeFileSync(join(root, DOCS_MODULE_PATH), docs.source);
  if (!quiet) console.log(`grammar: ${DOCS_MODULE_PATH} regenerated — ${docs.blocks} blocks`);
}

/** The freshness gate: regenerated text must match the committed module byte-for-byte. */
export function checkGrammarModule(root: string): boolean {
  const { source } = generateGrammarModule(root);
  const committed = readFileSync(join(root, MODULE_PATH), 'utf8');
  return source === committed;
}

/** ADR-272 D5 freshness gate: the committed docs data module matches the Chord source. */
export function checkDocsBlocksModule(root: string): boolean {
  const { source } = generateDocsBlocksModule(root);
  const docsPath = join(root, DOCS_MODULE_PATH);
  if (!existsSync(docsPath)) return false;
  return source === readFileSync(docsPath, 'utf8');
}

export class GrammarCommand implements Command {
  readonly name = 'grammar';
  readonly summary = 'Regenerate the generated grammar artifacts from the Chord source (--check: freshness gate)';

  run(args: string[]): number {
    const root = findRepoRoot();
    if (args.includes('--check')) {
      let ok = true;
      if (checkGrammarModule(root)) {
        console.log('grammar --check: committed module matches the Chord source');
      } else {
        console.error(
          'grammar --check: STALE — packages/parser-en-us/src/grammar.ts does not match ' +
            'grammar/standard-en-us.story. Run `repokit grammar` and commit the result.',
        );
        ok = false;
      }
      if (checkDocsBlocksModule(root)) {
        console.log('grammar --check: committed docs blocks match the Chord source');
      } else {
        console.error(
          'grammar --check: STALE — website .../reference/grammar-blocks.ts does not match ' +
            'grammar/standard-en-us.story. Run `repokit grammar` and commit the result.',
        );
        ok = false;
      }
      return ok ? 0 : 1;
    }
    runGrammarStep(root);
    return 0;
  }
}
