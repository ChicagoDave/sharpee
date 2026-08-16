/**
 * story-config.ts — the tool-owned story config sidecar (ADR-309).
 *
 * `{story-name}.config.json` beside the `.story` file is the CANONICAL home
 * of the story's IFID (D1): the header's `ifid:` line is the tool's
 * rendering of the config value, never an input. This module owns the
 * schema, the read/write/validate logic, and `reconcileHeader` — the one
 * function every host write-moment calls (`init` after minting, `build`'s
 * chord and browser entries, `publish`'s gate with minting disabled).
 * Read-only surfaces (`compose`, `test`, `play`) never call it: they may be
 * fed unsaved-buffer snapshots, and a writing read path would mint configs
 * beside files that are not the story.
 *
 * Public interface: STORY_CONFIG_VERSION, StoryConfig, StoryConfigError,
 *   configPathFor, readStoryConfig, writeStoryConfig, mintStoryConfig,
 *   reconcileHeader.
 * Owner context: @sharpee/devkit (author tool). Chord Writer implements the
 *   same schema and reconciliation on its save path — byte-identical config
 *   shape, one behavior in two hosts (ADR-309 D2).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { generateIfid } from '@sharpee/core';

/** Schema version this tool writes; a reader refuses newer (designed-open, D1). */
export const STORY_CONFIG_VERSION = 1 as const;

/** The config sidecar's shape — minimal by ruling: no speculative fields. */
export interface StoryConfig {
  version: typeof STORY_CONFIG_VERSION;
  /**
   * The story's Treaty of Babel identifier (ADR-074). Stored verbatim —
   * deliberately NOT format-validated: legacy (pre-UUID) IFIDs are valid
   * Treaty identities, and identity preservation outranks format hygiene.
   */
  ifid: string;
}

/** A config that exists but cannot serve as identity — named, never guessed over (D5). */
export class StoryConfigError extends Error {
  readonly code = 'story-config.broken';
  constructor(
    readonly configPath: string,
    detail: string,
  ) {
    super(
      `${path.basename(configPath)} is broken — ${detail}. The story config is the ` +
        `canonical home of the story's IFID (ADR-309); fix or restore it (it is ` +
        `committed — check version control), never re-mint over it.`,
    );
    this.name = 'StoryConfigError';
  }
}

/** `harbor.story` → `<dir>/harbor.config.json` (the tests.json naming precedent). */
export function configPathFor(storyFile: string): string {
  const resolved = path.resolve(storyFile);
  const stem = path.basename(resolved, '.story');
  return path.join(path.dirname(resolved), `${stem}.config.json`);
}

/** The three states a config path can be in. ABSENT and BROKEN are different (D5). */
export type StoryConfigRead =
  | { status: 'absent' }
  | { status: 'ok'; config: StoryConfig }
  | { status: 'broken'; message: string };

/**
 * Read a config sidecar without guessing. Malformed JSON, a non-object, an
 * unknown version, or a missing/empty `ifid` are all BROKEN — distinct from
 * ABSENT, which is the adoption/minting trigger (D2).
 */
export function readStoryConfig(configPath: string): StoryConfigRead {
  if (!fs.existsSync(configPath)) return { status: 'absent' };
  let text: string;
  try {
    text = fs.readFileSync(configPath, 'utf-8');
  } catch (error) {
    return { status: 'broken', message: `unreadable: ${error instanceof Error ? error.message : error}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: 'broken', message: 'not valid JSON' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { status: 'broken', message: 'not a JSON object' };
  }
  const record = parsed as Record<string, unknown>;
  if (record.version !== STORY_CONFIG_VERSION) {
    return { status: 'broken', message: `unknown version ${JSON.stringify(record.version)} (this tool reads version ${STORY_CONFIG_VERSION})` };
  }
  if (typeof record.ifid !== 'string' || record.ifid.trim() === '') {
    return { status: 'broken', message: 'carries no usable `ifid`' };
  }
  return { status: 'ok', config: { version: STORY_CONFIG_VERSION, ifid: record.ifid.trim() } };
}

/**
 * Write the config deterministically: 2-space indent, keys SORTED, trailing
 * newline. The sort is what keeps this byte-identical to Chord Writer's
 * writer (Foundation's `.sortedKeys`) — a story that moves between the two
 * hosts must never produce a spurious diff on the file that holds its
 * identity. `StoryConfigTests`/`story-config.test.ts` pin the same bytes on
 * both sides, so a format change on either host fails a test rather than
 * showing up in someone's git status.
 */
export function writeStoryConfig(configPath: string, config: StoryConfig): void {
  const sorted = { ifid: config.ifid, version: config.version };
  fs.writeFileSync(configPath, `${JSON.stringify(sorted, null, 2)}\n`);
}

/** Mint a fresh identity into a new config beside `storyFile` (D2's birth moment). */
export function mintStoryConfig(storyFile: string, ifid: string = generateIfid()): StoryConfig {
  const config: StoryConfig = { version: STORY_CONFIG_VERSION, ifid };
  writeStoryConfig(configPathFor(storyFile), config);
  return config;
}

/** What `reconcileHeader` did, for callers that report. */
export interface ReconcileResult {
  /** The story's identity after reconciliation; undefined only under `mint: false` with no identity anywhere. */
  ifid: string | undefined;
  /** True when the `.story` file was rewritten (line inserted or overwritten). */
  headerChanged: boolean;
  /** Set when this call created the config: from the header's value, or a fresh mint. */
  configCreated?: 'adopted' | 'minted';
}

/**
 * Reconcile a story's header to its config — the one shared function of
 * ADR-309 D3/D6. Covers all four config states:
 *
 * - BROKEN → throws {@link StoryConfigError}; no mint, no reconcile (D5).
 * - ABSENT → adoption (D2): the header's existing value is recorded into a
 *   new config verbatim; a header with none mints once — unless
 *   `options.mint` is false (publish: identity must already exist; minting
 *   at publish would silently fork a story whose config was lost).
 * - PRESENT → the header line is spliced to the config's value: inserted
 *   after `id:` when missing, overwritten in place when diverged, untouched
 *   when consistent. The config's bytes are never touched on this path.
 *
 * @param storyFile path to the `.story` file (resolved internally).
 * @param options `mint: false` disables fresh minting (publish's gate).
 * @returns what happened — see {@link ReconcileResult}.
 * @throws StoryConfigError when the config exists but is broken.
 */
export function reconcileHeader(
  storyFile: string,
  options: { mint?: boolean } = {},
): ReconcileResult {
  const mint = options.mint !== false;
  const resolved = path.resolve(storyFile);
  const configPath = configPathFor(resolved);
  const read = readStoryConfig(configPath);
  if (read.status === 'broken') throw new StoryConfigError(configPath, read.message);

  const source = fs.readFileSync(resolved, 'utf-8');
  const headerIfid = headerIfidOf(source);

  let ifid: string;
  let configCreated: ReconcileResult['configCreated'];
  if (read.status === 'ok') {
    ifid = read.config.ifid;
  } else if (headerIfid !== undefined) {
    // Adoption: recording existing identity, not author choice (D2).
    writeStoryConfig(configPath, { version: STORY_CONFIG_VERSION, ifid: headerIfid });
    ifid = headerIfid;
    configCreated = 'adopted';
  } else if (mint) {
    ifid = mintStoryConfig(resolved).ifid;
    configCreated = 'minted';
  } else {
    // No identity anywhere and minting disabled: the caller owns the refusal
    // (ADR-284's backstop is exactly this case).
    return { ifid: undefined, headerChanged: false };
  }

  const spliced = spliceHeaderIfid(source, ifid);
  const headerChanged = spliced !== undefined && spliced !== source;
  if (headerChanged) fs.writeFileSync(resolved, spliced);
  return { ifid, headerChanged, ...(configCreated !== undefined ? { configCreated } : {}) };
}

// ---------------------------------------------------------------------------
// Header-line mechanics — the devkit twin of the IDE's StoryHeaderIFID:
// fields are `  key: value` lines directly under the top-level `story`
// keyword; a deeper-indented non-blank line is a field's indented-list
// continuation (the names under `authors:`) and belongs to the field above
// it; scanning stops at the first line that is neither (`use`/`on` open
// nested blocks, and an `ifid:` inside one is not a header field).
// ---------------------------------------------------------------------------

/** Split into lines, each keeping its trailing newline (except possibly the last). */
function linesOf(source: string): string[] {
  return source.split(/(?<=\n)/);
}

const FIELD_PATTERN = /^(\s+)([a-z][a-z0-9-]*):\s?(.*?)\r?\n?$/;

/**
 * True when `line` continues the field above it: non-blank and indented
 * deeper than the header's field indent (the chord parser's own rule for
 * indented list values).
 */
function isFieldContinuation(line: string, fieldIndent: string | undefined): boolean {
  if (fieldIndent === undefined) return false;
  const match = /^(\s+)\S/.exec(line);
  return match !== null && match[1].length > fieldIndent.length;
}

/** The header's current `ifid:` value, or undefined when the block has none. */
function headerIfidOf(source: string): string | undefined {
  const lines = linesOf(source);
  const storyIndex = lines.findIndex((line) => /^story\s*$/.test(line.trimEnd()));
  if (storyIndex === -1) return undefined;
  let fieldIndent: string | undefined;
  for (let index = storyIndex + 1; index < lines.length; index++) {
    const field = FIELD_PATTERN.exec(lines[index]);
    if (!field || (fieldIndent !== undefined && field[1] !== fieldIndent)) {
      if (isFieldContinuation(lines[index], fieldIndent)) continue;
      break;
    }
    fieldIndent ??= field[1];
    if (field[2] === 'ifid') {
      const value = field[3].trim();
      return value === '' ? undefined : value;
    }
  }
  return undefined;
}

/**
 * The source with its header `ifid:` line rendered from the config value:
 * overwritten in place when present, inserted directly after `id:` (the two
 * identity fields belong together — the IDE's rule and the init template's
 * order) or after the last header field otherwise. Undefined when the
 * source has no top-level `story` block to carry the line (a grammar file —
 * nothing to reconcile).
 */
function spliceHeaderIfid(source: string, ifid: string): string | undefined {
  const lines = linesOf(source);
  const storyIndex = lines.findIndex((line) => /^story\s*$/.test(line.trimEnd()));
  if (storyIndex === -1) return undefined;

  let idIndex: number | undefined;
  let idIndent: string | undefined;
  let lastFieldIndex: number | undefined;
  let lastIndent = '  ';
  let fieldIndent: string | undefined;

  for (let index = storyIndex + 1; index < lines.length; index++) {
    const field = FIELD_PATTERN.exec(lines[index]);
    if (!field || (fieldIndent !== undefined && field[1] !== fieldIndent)) {
      // An indented-list continuation extends the field above it — the
      // insertion anchor must land after the whole value, never inside it.
      if (isFieldContinuation(lines[index], fieldIndent)) {
        lastFieldIndex = index;
        continue;
      }
      break;
    }
    fieldIndent ??= field[1];
    if (field[2] === 'ifid') {
      if (field[3].trim() === ifid) return source;
      const newline = lines[index].endsWith('\n') ? '\n' : '';
      lines[index] = `${field[1]}ifid: ${ifid}${newline}`;
      return lines.join('');
    }
    if (field[2] === 'id' && idIndex === undefined) {
      idIndex = index;
      idIndent = field[1];
    }
    lastFieldIndex = index;
    lastIndent = field[1];
  }

  const insertAfter = idIndex ?? lastFieldIndex ?? storyIndex;
  const indent = idIndent ?? lastIndent;
  // Ensure the anchor line ends in a newline before splicing after it.
  if (!lines[insertAfter].endsWith('\n')) lines[insertAfter] += '\n';
  lines.splice(insertAfter + 1, 0, `${indent}ifid: ${ifid}\n`);
  return lines.join('');
}
