/**
 * claim.ts — `sharpee claim`: lock a reached state of a played line as a
 * claim, its necessary set proposed from the line (ADR-367 D7, the CLI).
 *
 * `sharpee claim <line> ["<fact>"] [--at <turn>] [--name "<name>"]
 * [--propose] [--verbose] [name|dir|file.story]`
 *
 * The line is a segment id of the project's test tree (`<story-id>.tests/`,
 * ADR-355 D5), or a line's first typed command when exactly one line starts
 * with it. Without a fact the command prints the facts true at the card
 * that were not true at boot, each as a sentence the claims fragment
 * accepts (D1), and writes nothing. With a fact it prints the proposed set
 * (D2) and writes the claim into the manifest's fragment and its name onto
 * the card (D4, D5) — or, under `--propose`, prints only. A project with no
 * fragment gets one, and its manifest the `claims` key.
 *
 * All of the reading and proposing is branch-tester's `proposeLock`; this
 * module owns the arguments, the file system, and the words.
 *
 * Public interface: runClaimCommand(rest) → process exit code.
 * Owner context: @sharpee/devkit (author tool).
 */
import * as path from 'node:path';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { lookupStory } from '../registry.js';
import { compileChordStory, findStoryFile, loadAuthorGame, makeFsImportResolver } from '../standalone/author-game.js';
import { findTreeDirectory, readTreeFiles } from './test-tree-document.js';

const USAGE =
  'usage: sharpee claim <line> ["<fact>"] [--at <turn>] [--name "<claim name>"] [--propose] [--verbose|-v] [name|dir|file.story]';

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
  let propose = false;
  let verbose = false;
  let projectDir: string | undefined;

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg === '--at') {
      const value = Number(rest[++i]);
      if (!Number.isInteger(value) || value < 1) {
        console.error(`claim: --at takes a turn number (1 or more)\n${USAGE}`);
        return 2;
      }
      turn = value;
    } else if (arg === '--name') {
      name = rest[++i];
      if (!name) {
        console.error(`claim: --name takes the claim's name\n${USAGE}`);
        return 2;
      }
    } else if (arg === '--propose') propose = true;
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
  if (line === undefined) {
    console.error(`claim: name the line to lock from (a segment id of the test tree)\n${USAGE}`);
    return 2;
  }

  // Lazy require (the test.ts pattern): the harness loads only when needed.
  const { assembleTree, checkCanonicalTree, diffTreeFiles, freshFragmentWith, pinLockOnCard, proposeLock, segmentTree, spliceLockIntoFragment } =
    require('@sharpee/branch-tester') as typeof import('@sharpee/branch-tester');
  const { compileClaims } = require('@sharpee/chord') as typeof import('@sharpee/chord');

  const dir = path.resolve(projectDir ?? process.cwd());
  let storyFile: string | null;
  try {
    storyFile = findStoryFile(dir);
  } catch (error) {
    console.error(`claim: ${error instanceof Error ? error.message : error}`);
    return 3;
  }
  if (storyFile === null) {
    console.error(`claim: ${dir} has no .story file`);
    return 2;
  }
  const treePath = findTreeDirectory(dir);
  if (treePath === undefined) {
    console.error(`claim: no test tree found in ${dir} — expected a <story-id>.tests/ directory beside the .story file`);
    return 2;
  }
  const treeName = `${path.basename(treePath)}/`;
  const files = readTreeFiles(treePath);
  const read = assembleTree(files);
  if (read.status !== 'ok') {
    console.error(`claim: ${treeName}: ${read.message}`);
    return 2;
  }
  const gate = checkCanonicalTree(files);
  if (gate.status === 'non-canonical') {
    console.error(`claim: ${treeName} has files not in canonical form (re-save them from the Testing tab):\n${gate.files.map((f) => `  ${f}`).join('\n')}`);
    return 2;
  }
  const document = read.document;

  let ir: ReturnType<typeof compileChordStory>;
  try {
    ir = compileChordStory(storyFile);
  } catch (error) {
    console.error(`claim: ${error instanceof Error ? error.message : error}`);
    return 3;
  }
  const storyDir = path.dirname(storyFile);
  const storySource = readFileSync(storyFile, 'utf-8');
  const storyId = path.basename(storyFile, '.story');
  const claimsFile = document.claims ?? `${storyId}.claims.chord`;
  const fragmentPath = path.resolve(storyDir, claimsFile);
  const existing = document.claims !== undefined && existsSync(fragmentPath) ? readFileSync(fragmentPath, 'utf-8') : undefined;
  if (document.claims !== undefined && existing === undefined) {
    console.error(`claim: claims file '${document.claims}' named by manifest.json: not found (${fragmentPath})`);
    return 2;
  }

  let proposal: Awaited<ReturnType<typeof proposeLock>>;
  try {
    proposal = await proposeLock({
      ir,
      document,
      line,
      ...(turn !== undefined ? { turn } : {}),
      ...(fact !== undefined ? { fact } : {}),
      ...(name !== undefined ? { name } : {}),
      loadGame: () => loadAuthorGame(storyFile!, { seed: document.seed }),
      compileCandidate: (block) => compileClaims(storySource, block, { importResolver: makeFsImportResolver(storyDir), claimsFile }),
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (error) {
    console.error(`claim: ${error instanceof Error ? error.message : error}`);
    return 2;
  }

  const where = `turn ${proposal.turn} of line ${proposal.line.id} "${proposal.line.label}"`;
  if (proposal.fact === undefined) {
    console.log(`At ${where}, true now and not at boot:`);
    if (proposal.offer.length === 0) console.log('  (nothing the line changed that a claim can state)');
    for (const offer of proposal.offer) console.log(`  ${offer.sentence}`);
    console.log(`\nLock one with: sharpee claim ${proposal.line.id} "<fact>" --at ${proposal.turn}`);
    return 0;
  }

  console.log(`Locking at ${where}: ${proposal.fact}`);
  console.log('');
  console.log(`  needs rooms: ${proposal.rooms?.join(', ') || '(none)'}`);
  console.log(`  needs things: ${proposal.things?.join(', ') || '(none)'}`);
  if (proposal.trimmed && proposal.trimmed.length > 0) {
    console.log(`    (trimmed: ${proposal.trimmed.join(', ')} — the claim cannot depend on them)`);
  }
  if (verbose) for (const kept of proposal.kept ?? []) console.log(`    kept ${kept.thing}: ${kept.reason}`);
  console.log(`  needs verbs: ${proposal.verbs?.join(', ') || '(none)'}`);
  console.log('');

  if (propose) {
    console.log('Proposed block (not written):');
    console.log(proposal.block);
    return 0;
  }

  // Everything that can refuse does so before the first write, so a lock is
  // never half on disk: the card must carry an id, and the fragment must not
  // already declare the name (a duplicate would be two claims with one name).
  if (proposal.cardId === undefined) {
    console.error('claim: the card carries no id, so the lock cannot be pinned (re-save the tree from the Testing tab)');
    return 2;
  }
  const declared = existing === undefined ? undefined : existing.split('\n').map((l) => l.trim()).find((l) => l === `claim ${proposal.name}` || l === `never ${proposal.name}`);
  if (declared !== undefined) {
    console.error(`claim: ${claimsFile} already declares \`${declared}\` — give this lock another name with --name, or lock a different fact; nothing written`);
    return 2;
  }

  // The fragment: spliced, or created with the manifest key (ADR-367 D4).
  const fragmentText = existing !== undefined ? spliceLockIntoFragment(existing, proposal.block!) : freshFragmentWith(ir.meta.title, proposal.block!);
  const written: string[] = [];
  writeFileSync(fragmentPath, fragmentText);
  written.push(`${existing !== undefined ? 'appended to' : 'created'} ${path.relative(process.cwd(), fragmentPath)}`);

  // The pin (D5), and the manifest key when the fragment is new, through the tree's one writer.
  if (document.claims === undefined) document.claims = claimsFile;
  pinLockOnCard(document, proposal.cardId, proposal.name!);
  const changed = diffTreeFiles(files, segmentTree(document));
  for (const [fileName, content] of Object.entries(changed.written)) {
    writeFileSync(path.join(treePath, fileName), content);
    written.push(`${treeName}${fileName}`);
  }
  for (const entry of written) console.log(`Written: ${entry}`);
  console.log(`Pinned "${proposal.name}" on card ${proposal.cardId}.`);
  return 0;
}
