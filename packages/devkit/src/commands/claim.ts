/**
 * claim.ts — `sharpee claim`: lock a reached state of a played line as a
 * claim, its necessary set proposed from the line (ADR-367 D7, the CLI).
 *
 * `sharpee claim <line> ["<fact>"] [--at <turn>] [--name "<name>"]
 * [--rooms "<a, b>"] [--things "<a, b>"] [--verbs "<a, b>"]
 * [--propose] [--fragment-only] [--json] [--verbose] [name|dir|file.story]`
 *
 * The line is a segment id of the project's test tree (`<story-id>.tests/`,
 * ADR-355 D5), or a line's first typed command when exactly one line starts
 * with it. Without a fact the command prints the facts true at the card
 * that were not true at boot, each as a sentence the claims fragment
 * accepts (D1), and writes nothing. With a fact it prints the proposed set
 * (D2) and writes the claim into the manifest's fragment and its name onto
 * the card (D4, D5) — or, under `--propose`, prints only. A project with no
 * fragment gets one, and its manifest the `claims` key. The three list
 * flags are the author's edited lists (D7's chips), written instead of the
 * proposal's.
 *
 * **The Testing tab's path.** The tab locks through this command, exactly as
 * Run goes through `sharpee test` (D7: two surfaces, one path). `--json`
 * prints one JSON object on stdout — `offer`, `proposal`, `written`, or
 * `error` — with the exit codes unchanged. `--fragment-only` writes the
 * fragment and touches no tree file: the page is the tree's writer while it
 * is open, so it locks the card itself through the same `lockOnCard` and
 * posts the files it changed; the object names the manifest key the tree
 * then needs.
 *
 * All of the reading and proposing is branch-tester's `proposeLock`; this
 * module owns the arguments, the file system, and the words.
 *
 * Public interface: runClaimCommand(rest) → process exit code,
 *   ClaimJsonOutput (the `--json` shapes, re-exported from ide-protocol).
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { LockOffer } from '@sharpee/branch-tester';
import type { ClaimJsonOutput, ClaimJsonWhere } from '@sharpee/ide-protocol';
import { lookupStory } from '../registry.js';
import { compileChordStory, findStoryFile, loadAuthorGame, makeFsImportResolver } from '../standalone/author-game.js';
import { findTreeDirectory, readTreeFiles } from './test-tree-document.js';

const USAGE =
  'usage: sharpee claim <line> ["<fact>"] [--at <turn>] [--name "<claim name>"] [--rooms "<a, b>"] [--things "<a, b>"] [--verbs "<a, b>"] [--propose] [--fragment-only] [--json] [--verbose|-v] [name|dir|file.story]';

/** The `--json` shapes are the wire contract the Testing tab decodes (`@sharpee/ide-protocol`'s `claim-output`). */
export type { ClaimJsonOutput } from '@sharpee/ide-protocol';

/** A comma-separated list flag, trimmed, empties dropped. */
function listOf(value: string | undefined): string[] | undefined {
  if (value === undefined) return undefined;
  return value.split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0);
}

/**
 * Run `sharpee claim`.
 *
 * @param rest CLI args after the subcommand
 * @returns process exit code — 0 the offer was printed or the lock written
 *   (or printed under `--propose`); 2 a usage error, a tree or fragment the
 *   command cannot read, or a line, turn or fact it cannot use; 3 the story
 *   would not boot. Never calls `process.exit()`.
 */
export async function runClaimCommand(rest: string[]): Promise<number> {
  let line: string | undefined;
  let fact: string | undefined;
  let name: string | undefined;
  let turn: number | undefined;
  let rooms: string | undefined;
  let things: string | undefined;
  let verbs: string | undefined;
  let propose = false;
  let fragmentOnly = false;
  let json = false;
  let verbose = false;
  let projectDir: string | undefined;

  /** A refusal: one line on stderr, or the `error` object under `--json`. */
  const refuse = (message: string, code: number): number => {
    if (json) console.log(JSON.stringify({ kind: 'error', message } satisfies ClaimJsonOutput));
    else console.error(`claim: ${message}`);
    return code;
  };
  /** A success: the object under `--json`, else the given lines. */
  const emit = (object: ClaimJsonOutput, lines: () => string[]): number => {
    if (json) console.log(JSON.stringify(object));
    else for (const text of lines()) console.log(text);
    return 0;
  };

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--at') {
      const value = Number(rest[++i]);
      if (!Number.isInteger(value) || value < 1) {
        console.error(`claim: --at takes a turn number (1 or more)\n${USAGE}`);
        return 2;
      }
      turn = value;
    } else if (arg === '--name' || arg === '--rooms' || arg === '--things' || arg === '--verbs') {
      const value = rest[++i];
      if (value === undefined || value.startsWith('--')) {
        console.error(`claim: ${arg} takes a value\n${USAGE}`);
        return 2;
      }
      if (arg === '--name') name = value;
      else if (arg === '--rooms') rooms = value;
      else if (arg === '--things') things = value;
      else verbs = value;
    } else if (arg === '--propose') propose = true;
    else if (arg === '--fragment-only') fragmentOnly = true;
    else if (arg === '--json') json = true;
    else if (arg === '--verbose' || arg === '-v') verbose = true;
    else if (arg.startsWith('-')) {
      console.error(`claim: unknown flag '${arg}'\n${USAGE}`);
      return 2;
    } else if (arg.endsWith('.story')) {
      if (!existsSync(arg) || !statSync(arg).isFile()) {
        console.error(`claim: story file '${arg}' not found`);
        return 2;
      }
      projectDir = path.dirname(path.resolve(arg));
    } else if (existsSync(arg) && statSync(arg).isDirectory()) projectDir = arg;
    else if (line === undefined) line = arg;
    else if (fact === undefined) fact = arg;
    else {
      const registered = lookupStory(arg);
      if (!registered) {
        console.error(`claim: unexpected argument '${arg}'\n${USAGE}`);
        return 2;
      }
      projectDir = registered;
    }
  }
  if (line === undefined) return refuse(`name the line to lock from (a segment id of the test tree)\n${USAGE}`, 2);
  if (propose && fragmentOnly) return refuse('--propose writes nothing, so --fragment-only has nothing to narrow; pass one of them', 2);
  if ((rooms !== undefined || things !== undefined || verbs !== undefined) && fact === undefined) {
    return refuse('--rooms, --things and --verbs edit a lock\'s set, so they need the fact to lock', 2);
  }

  // Lazy require (the test.ts pattern): the harness loads only when needed.
  const { assembleTree, checkCanonicalTree, diffTreeFiles, lockOnCard, proposeLock, segmentTree } =
    require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  const { claimsFragmentWith, compileClaims, spliceClaimIntoFragment } = require('@sharpee/chord') as typeof import('@sharpee/chord');

  const dir = path.resolve(projectDir ?? process.cwd());
  let storyFile: string | null;
  try {
    storyFile = findStoryFile(dir);
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error), 3);
  }
  if (storyFile === null) return refuse(`${dir} has no .story file`, 2);
  const treePath = findTreeDirectory(dir);
  if (treePath === undefined) return refuse(`no test tree found in ${dir} — expected a <story-id>.tests/ directory beside the .story file`, 2);
  const treeName = `${path.basename(treePath)}/`;
  const files = readTreeFiles(treePath);
  const read = assembleTree(files);
  if (read.status !== 'ok') return refuse(`${treeName}: ${read.message}`, 2);
  const gate = checkCanonicalTree(files);
  if (gate.status === 'non-canonical') {
    return refuse(`${treeName} has files not in canonical form (re-save them from the Testing tab):\n${gate.files.map((f) => `  ${f}`).join('\n')}`, 2);
  }
  const document = read.document;

  let ir: ReturnType<typeof compileChordStory>;
  try {
    ir = compileChordStory(storyFile);
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error), 3);
  }
  const storyDir = path.dirname(storyFile);
  const storySource = readFileSync(storyFile, 'utf-8');
  const storyId = path.basename(storyFile, '.story');
  const claimsFile = document.claims ?? `${storyId}.claims.chord`;
  const fragmentPath = path.resolve(storyDir, claimsFile);
  // Read from disk whether or not the manifest names it yet: under
  // `--fragment-only` the page writes the manifest key after this command
  // returns, and a second lock in between must append, never overwrite.
  const existing = existsSync(fragmentPath) ? readFileSync(fragmentPath, 'utf-8') : undefined;
  if (document.claims !== undefined && existing === undefined) {
    return refuse(`claims file '${document.claims}' named by manifest.json: not found (${fragmentPath})`, 2);
  }

  const needs = {
    ...(listOf(rooms) !== undefined ? { rooms: listOf(rooms)! } : {}),
    ...(listOf(things) !== undefined ? { things: listOf(things)! } : {}),
    ...(listOf(verbs) !== undefined ? { verbs: listOf(verbs)! } : {}),
  };
  let proposal: Awaited<ReturnType<typeof proposeLock>>;
  try {
    proposal = await proposeLock({
      ir,
      document,
      line,
      ...(turn !== undefined ? { turn } : {}),
      ...(fact !== undefined ? { fact } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(Object.keys(needs).length > 0 ? { needs } : {}),
      loadGame: () => loadAuthorGame(storyFile!, { seed: document.seed }),
      compileCandidate: (block) => compileClaims(storySource, block, { importResolver: makeFsImportResolver(storyDir), claimsFile }),
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    return refuse(error instanceof Error ? error.message : String(error), 2);
  }

  const where: ClaimJsonWhere = { line: proposal.line, turn: proposal.turn, ...(proposal.cardId !== undefined ? { cardId: proposal.cardId } : {}) };
  const whereText = `turn ${proposal.turn} of line ${proposal.line.id} "${proposal.line.label}"`;
  if (proposal.fact === undefined) {
    return emit({ kind: 'offer', ...where, offer: proposal.offer.map((offer: LockOffer) => offer.sentence) }, () => [
      `At ${whereText}, true now and not at boot:`,
      ...(proposal.offer.length === 0 ? ['  (nothing the line changed that a claim can state)'] : proposal.offer.map((offer) => `  ${offer.sentence}`)),
      '',
      `Lock one with: sharpee claim ${proposal.line.id} "<fact>" --at ${proposal.turn}`,
    ]);
  }

  const setLines = (): string[] => {
    const lines = [
      `Locking at ${whereText}: ${proposal.fact}`,
      '',
      `  needs rooms: ${proposal.rooms?.join(', ') || '(none)'}`,
      `  needs things: ${proposal.things?.join(', ') || '(none)'}`,
    ];
    if (proposal.trimmed && proposal.trimmed.length > 0) lines.push(`    (trimmed: ${proposal.trimmed.join(', ')} — the claim cannot depend on them)`);
    if (verbose) for (const kept of proposal.kept ?? []) lines.push(`    kept ${kept.thing}: ${kept.reason}`);
    lines.push(`  needs verbs: ${proposal.verbs?.join(', ') || '(none)'}`, '');
    return lines;
  };
  const shape = {
    name: proposal.name!,
    fact: proposal.fact,
    rooms: [...(proposal.rooms ?? [])],
    things: [...(proposal.things ?? [])],
    trimmed: [...(proposal.trimmed ?? [])],
    verbs: [...(proposal.verbs ?? [])],
    block: proposal.block!,
  };

  if (propose) {
    return emit({ kind: 'proposal', ...where, ...shape }, () => [...setLines(), 'Proposed block (not written):', proposal.block!]);
  }

  // Everything that can refuse does so before the first write, so a lock is
  // never half on disk: the card must carry an id, and the fragment must not
  // already declare the name (a duplicate would be two claims with one name).
  if (proposal.cardId === undefined) return refuse('the card carries no id, so the lock cannot be recorded on it (re-save the tree from the Testing tab)', 2);
  const declared = existing === undefined ? undefined : existing.split('\n').map((l) => l.trim()).find((l) => l === `claim ${proposal.name}` || l === `never ${proposal.name}`);
  if (declared !== undefined) {
    return refuse(`${claimsFile} already declares \`${declared}\` — give this lock another name with --name, or lock a different fact; nothing written`, 2);
  }

  // The fragment: spliced, or created with the manifest key (ADR-367 D4).
  const fragmentText = existing !== undefined ? spliceClaimIntoFragment(existing, proposal.block!) : claimsFragmentWith(ir.meta.title, proposal.block!);
  const written: string[] = [];
  writeFileSync(fragmentPath, fragmentText);
  written.push(path.relative(dir, fragmentPath));
  const narrated = [`${existing !== undefined ? 'appended to' : 'created'} ${path.relative(process.cwd(), fragmentPath)}`];

  // The card's lock (D5), and the manifest key when the fragment is new, through
  // the tree's one writer — unless the page is the tree's writer (`--fragment-only`).
  const manifestKey = document.claims === undefined ? claimsFile : undefined;
  if (!fragmentOnly) {
    if (document.claims === undefined) document.claims = claimsFile;
    lockOnCard(document, proposal.cardId, proposal.name!);
    const changed = diffTreeFiles(files, segmentTree(document));
    for (const [fileName, content] of Object.entries(changed.written)) {
      writeFileSync(path.join(treePath, fileName), content);
      written.push(path.relative(dir, path.join(treePath, fileName)));
      narrated.push(`${treeName}${fileName}`);
    }
  }
  return emit(
    {
      kind: 'written',
      ...where,
      name: shape.name,
      fact: shape.fact,
      claimsFile,
      created: existing === undefined,
      pinned: !fragmentOnly,
      ...(fragmentOnly && manifestKey !== undefined ? { manifestKey } : {}),
      files: written,
    },
    () => [
      ...setLines(),
      ...narrated.map((entry) => `Written: ${entry}`),
      fragmentOnly
        ? `Not pinned: the tree is the caller's to write (card ${proposal.cardId}${manifestKey !== undefined ? `, manifest claims: ${manifestKey}` : ''}).`
        : `Pinned "${proposal.name}" on card ${proposal.cardId}.`,
    ],
  );
}
