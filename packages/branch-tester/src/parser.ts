/**
 * Transcript Parser
 *
 * Parses .transcript files into a structured format for testing.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Transcript,
  TranscriptHeader,
  TranscriptCommand,
  TranscriptItem,
  TranscriptRunConfig,
  Directive,
  GoalDefinition,
  Assertion,
  ParseError
} from './types.js';

/**
 * Above this bound the parsed value no longer equals the typed digits, so the
 * echoed seed would not reproduce the run (ADR-293 AC-12 — same bound the CLI
 * enforces for `--seed`).
 */
const MAX_SEED = Number.MAX_SAFE_INTEGER;

/**
 * Header keys that carry run configuration (ADR-294 D3/D6/D8/D15/D19/D13),
 * recognized case-insensitively. Everything else in the header stays a raw
 * string in `transcript.header`.
 */
const CONFIG_KEYS = ['seed', 'seeds', 'channels', 'events', 'locale', 'forces', 'point-seed'];

/**
 * One `forces:` entry: `point[#occurrence]=CLASS` (ADR-293 D8/D9 via the
 * ruled header-field form). The point name is dotted per D2; `#N` targets one
 * 1-based firing; the class is a declared outcome class. Whitespace-free by
 * construction — entries are comma-separated.
 */
const FORCE_ENTRY = /^([^#=\s]+)\s*(?:#\s*(\d+))?\s*=\s*([^=\s]+)$/;

/** One `point-seed:` entry: `point=seed` (ADR-293 D11). */
const POINT_SEED_ENTRY = /^([^#=\s]+)\s*=\s*(\d+)$/;

/**
 * A legal `continues:` value (ADR-302 D1): a filename stem and nothing else.
 *
 * Deliberately narrow. Every rejected shape below is rejected *by name* rather
 * than by falling through to this pattern, because the whole point of D1 is
 * that a parent is a WHOLE FILE — an author reaching for `doormat at 4` is
 * asking for interior addressing, and a generic "invalid value" would leave
 * them guessing whether they got the syntax wrong or the concept.
 */
const CONTINUES_STEM = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Shapes of `continues:` that are errors naming what the author reached for
 * (ADR-302 D1, AC-2). Checked in order; the first match reports.
 */
const CONTINUES_REJECTIONS: Array<{ pattern: RegExp; message: (value: string) => string }> = [
  {
    // `doormat at 4`, `doormat#4`, `doormat:4` — interior addressing.
    pattern: /\s+at\s+\d+\s*$|#\d+\s*$|:\d+\s*$/i,
    message: (v) =>
      `continues: "${v}" addresses a point inside the parent — a parent is always a whole file (ADR-302 D1). ` +
      `There is no \`at <n>\` form: split the parent at that point into its own transcript and continue from it instead.`,
  },
  {
    pattern: /\.transcript\s*$/i,
    message: (v) =>
      `continues: "${v}" carries a file extension — name the filename STEM alone (ADR-302 D1), e.g. ` +
      `\`continues: ${v.replace(/\.transcript\s*$/i, '')}\`.`,
  },
  {
    pattern: /[\\/]/,
    message: (v) =>
      `continues: "${v}" carries a path — a parent is a transcript in the SAME story, named by stem alone (ADR-302 D1). ` +
      `A cross-story pointer is not expressible and would be rejected by tree validation anyway.`,
  },
];

/**
 * Grammar forms removed by ADR-294. Each is a parse error naming the form and
 * its replacement (AC-4) — never silently ignored, never executed. Checked
 * before header parsing so the old trap (`[SEED:]` above the `---` separator
 * being swallowed as a header key) errors loudly too.
 */
const REMOVED_FORMS: Array<{ pattern: RegExp; form: string; message: string }> = [
  {
    pattern: /^\[SEED\s*:/i,
    form: '[SEED: N]',
    message: '[SEED: N] was removed (ADR-294 D3) — declare the seed in the header instead: seed: N above the --- separator'
  },
  {
    pattern: /^\[WHILE\s*:/i,
    form: '[WHILE:]',
    message: '[WHILE:] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the loop produced'
  },
  {
    pattern: /^\[END\s+WHILE\s*\]$/i,
    form: '[END WHILE]',
    message: '[END WHILE] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the loop produced'
  },
  {
    pattern: /^\[RETRY\s*:/i,
    form: '[RETRY:]',
    message: '[RETRY:] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the retries produced'
  },
  {
    pattern: /^\[END\s+RETRY\s*\]$/i,
    form: '[END RETRY]',
    message: '[END RETRY] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the retries produced'
  },
  {
    pattern: /^\[DO\s*\]$/i,
    form: '[DO]',
    message: '[DO] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the loop produced'
  },
  {
    pattern: /^\[UNTIL\s/i,
    form: '[UNTIL]',
    message: '[UNTIL] was removed (ADR-294 D4) — output is deterministic at a pinned seed; write the fixed command list the loop produced'
  },
  {
    pattern: /^\[ENSURES\s*:/i,
    form: '[ENSURES:]',
    message: '[ENSURES:] was removed (ADR-294 D4) — durable regression protection is a golden recording; for unit intent use [OK: contains "..."] or [STATE:]'
  },
  {
    pattern: /^\[REQUIRES\s*:/i,
    form: '[REQUIRES:]',
    message: '[REQUIRES:] was removed (ADR-294 D4) — state is deterministic at a pinned seed; a precondition either always holds or the transcript is wrong'
  },
  {
    pattern: /^\[IF\s*:/i,
    form: '[IF:]',
    message: '[IF:] was removed (ADR-294 D4) — state is deterministic at a pinned seed, so a condition never varies; write the branch that actually happens'
  },
  {
    pattern: /^\[END\s+IF\s*\]$/i,
    form: '[END IF]',
    message: '[END IF] was removed (ADR-294 D4) — state is deterministic at a pinned seed, so a condition never varies; write the branch that actually happens'
  },
  {
    pattern: /^\[OK\s*:\s*contains_any\s/i,
    form: '[OK: contains_any]',
    message: '[OK: contains_any] was removed (ADR-294 D2) — output is deterministic at a pinned seed; use [OK: contains "..."] with the text that actually occurs'
  },
  {
    pattern: /^\[OK\s*:\s*matches\s/i,
    form: '[OK: matches]',
    message: '[OK: matches] was removed (ADR-294 D2) — output is deterministic at a pinned seed; use [OK: contains "..."] or a golden recording'
  },
  {
    pattern: /^\[NAVIGATE\s+TO\s*:/i,
    form: '[NAVIGATE TO:]',
    message: '[NAVIGATE TO:] was removed (ADR-294 D4) — write the literal movement commands; the runner never pathfinds'
  },
  {
    pattern: /^\[OK\s*:\s*any\s*\]$/i,
    form: '[OK: any]',
    message: '[OK: any] was removed (ADR-294 D2) — presence-only assertion masks failure; use a golden recording or [OK: contains "..."], or [SKIP] for deliberately unasserted output'
  },
  {
    pattern: /^\[EVENTS\s*:/i,
    form: '[EVENTS: N]',
    message: '[EVENTS: N] was removed (ADR-300 D5) — a bare count names no event and breaks whenever any unrelated event is added anywhere in the turn; use [EVENT: true, type="..."] to name the event you mean'
  }
];

/** Match a removed grammar form, or null when the line is not one. */
function detectRemovedForm(trimmed: string): { form: string; message: string } | null {
  for (const removed of REMOVED_FORMS) {
    if (removed.pattern.test(trimmed)) {
      return removed;
    }
  }
  return null;
}

/**
 * A literal text block opens with `text` and closes with `end text`, each on
 * its own line at column 0 (ADR-287 D1).
 *
 * Column 0 is load-bearing, not decoration: an INDENTED `end text` inside the
 * payload is content and does not close the block, which is what lets a story
 * quote the syntax at all. Only a payload line at column 0 reading exactly
 * `end text` collides — and that shape is reserved (David's ruling,
 * 2026-07-28). There is no escape, because the collision cannot be silent:
 * the block closes early, the rest of the payload falls through to the classic
 * expected-output path below, and `finalizeCommand`'s both-forms check turns it
 * into a validation error with a line number.
 */
const BLOCK_OPEN = 'text';
const BLOCK_CLOSE = 'end text';

/** Is this line a block delimiter? Column 0, trailing whitespace forgiven. */
function isBlockLine(line: string, keyword: string): boolean {
  return line.trimEnd() === keyword;
}

/** Can this assertion carry a block? `[OK]`, or `[OK: contains]` with no inline payload. */
function acceptsBlock(assertion: Assertion): boolean {
  return assertion.type === 'ok' || (assertion.type === 'ok-contains' && assertion.value === undefined);
}

/**
 * Read a literal text block whose `text` opener is at `lines[openIndex]`.
 *
 * Returns the verbatim content lines and the index of the closing `end text`,
 * or `null` when no close appears before EOF. Content is never interpreted and
 * never re-indented — that is the entire point of the form, and the reason
 * indentation was rejected as the delimiter (it cannot preserve a payload whose
 * every line is indented).
 */
function readTextBlock(
  lines: string[],
  openIndex: number
): { content: string[]; closeIndex: number } | null {
  const content: string[] = [];

  for (let i = openIndex + 1; i < lines.length; i++) {
    if (isBlockLine(lines[i], BLOCK_CLOSE)) {
      return { content, closeIndex: i };
    }
    content.push(lines[i]);
  }

  return null;
}

/**
 * Parse a transcript file from disk
 */
export function parseTranscriptFile(filePath: string): Transcript {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseTranscript(content, filePath);
}

/**
 * Parse transcript content string
 */
export function parseTranscript(content: string, filePath: string = '<inline>'): Transcript {
  const lines = content.split('\n');
  const transcript: Transcript = {
    filePath,
    header: {},
    commands: [],
    items: [],
    goals: [],
    comments: [],
    // Defaults per ADR-294: unseeded, main channel only, prose-pure, primary
    // locale, no forces. Header fields overwrite these during parsing.
    config: { seeds: [], channels: [], events: false, forces: [] }
  };

  let inHeader = true;
  let currentCommand: TranscriptCommand | null = null;
  const parseErrors: ParseError[] = [];
  /** Config keys already seen, for duplicate detection (key → line number). */
  const seenConfigKeys = new Map<string, number>();

  /**
   * The header field still being read, in case the author wrapped its value
   * across several lines.
   *
   * Held rather than stored immediately: a wrapped value is not finished until
   * the next field, the `---` separator, or the end of the file, and a field
   * like `forces:` has to be checked against the whole value. Checking the
   * first line alone would judge it on half of what the author wrote.
   */
  let pendingHeader: { key: string; value: string; lineNumber: number } | null = null;

  /**
   * Finish the open header field: store it, and check it if it configures the
   * run. Safe to call with nothing open, so every path that ends a field can
   * call it without asking first.
   */
  const flushHeader = (): void => {
    if (!pendingHeader) return;
    const { key, value, lineNumber } = pendingHeader;
    pendingHeader = null;
    transcript.header[key] = value;
    if (key === 'continues') {
      checkContinues(value, lineNumber, parseErrors);
    }
    if (CONFIG_KEYS.includes(key)) {
      parseConfigField(transcript, key, value, lineNumber, parseErrors, seenConfigKeys);
    }
  };

  // Indexed rather than for-of: a block consumes the lines that follow its
  // opening delimiter, so the loop has to be able to skip ahead (ADR-287 D1).
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Empty lines
    if (trimmed === '') {
      if (currentCommand && currentCommand.expectedOutput.length > 0) {
        // Empty line in output - preserve it
        currentCommand.expectedOutput.push('');
      }
      continue;
    }

    // Header separator
    if (trimmed === '---') {
      flushHeader();
      inHeader = false;
      continue;
    }

    // An indented line in the header continues the value above it. Always —
    // a continuation that happens to contain a colon is the author's prose, not
    // a new field. Authors wrap long descriptions this way, and until now every
    // line after the first was thrown away without a word.
    if (inHeader && pendingHeader && /^[ \t]/.test(line)) {
      pendingHeader.value += (pendingHeader.value ? ' ' : '') + trimmed;
      continue;
    }

    // Comments - add to both comments array (legacy) and items array (for annotation context)
    if (trimmed.startsWith('#') && !trimmed.startsWith('#[')) {
      const commentText = trimmed.slice(1).trim();
      transcript.comments.push(commentText);
      // Also add as item for annotation processing
      transcript.items!.push({
        type: 'comment',
        comment: { lineNumber, text: commentText },
      });
      continue;
    }

    // Removed grammar forms (ADR-294) — before the header branch, so a
    // bracket directive above the --- separator (the old silent-placement
    // trap) gets the loud error instead of being swallowed as a header key.
    if (trimmed.startsWith('[')) {
      const removed = detectRemovedForm(trimmed);
      if (removed) {
        parseErrors.push({ lineNumber, message: removed.message });
        continue;
      }
    }

    // $ directives ($save, $restore) - these are standalone directives
    if (trimmed.startsWith('$')) {
      // Save any pending command first
      if (currentCommand) {
        finalizeCommand(currentCommand, parseErrors);
        currentCommand = null;
      }

      const directive = parseDollarDirective(trimmed, lineNumber);
      if (directive) {
        transcript.items!.push({ type: 'directive', directive });
      }
      continue;
    }

    // Header lines (key: value)
    if (inHeader && trimmed.includes(':') && !trimmed.startsWith('>')) {
      const colonIndex = trimmed.indexOf(':');
      const key = trimmed.slice(0, colonIndex).trim().toLowerCase();
      const value = trimmed.slice(colonIndex + 1).trim();
      flushHeader();
      // A lone `|` is the YAML "the text is below" marker, which a few
      // transcripts picked up out of habit. It announces the value rather than
      // being part of it, so it never belongs in what the author reads back.
      pendingHeader = { key, value: value === '|' ? '' : value, lineNumber };
      continue;
    }

    // Command input
    if (trimmed.startsWith('>')) {
      if (currentCommand) {
        finalizeCommand(currentCommand, parseErrors);
      }

      currentCommand = {
        lineNumber,
        input: trimmed.slice(1).trim(),
        expectedOutput: [],
        assertions: []
      };

      // Recorded where it was read, not where it finished. A command stays open
      // until the next one starts, so a comment the author wrote underneath it
      // would otherwise be filed ahead of the command it is talking about — and
      // writing the file back out would move it there for real. Both lists hold
      // this same command, so finishing it later still completes it here.
      transcript.commands.push(currentCommand);
      transcript.items!.push({ type: 'command', command: currentCommand });
      continue;
    }

    // Directive or assertion tags (both use [ ])
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      // ADR-287 D1: a block attaches only on the IMMEDIATELY following line —
      // an intervening blank line detaches it, leaving a `text` line to parse
      // as ordinary prose exactly as it did before blocks existed (D2).
      const blockIndex = index + 1;
      const nextIsBlock =
        blockIndex < lines.length && isBlockLine(lines[blockIndex], BLOCK_OPEN);

      // Try to parse as directive first
      const directive = parseDirective(trimmed, lineNumber);
      if (directive) {
        // Close out any pending command first. It is already recorded.
        if (currentCommand) {
          finalizeCommand(currentCommand, parseErrors);
          currentCommand = null;
        }
        transcript.items!.push({ type: 'directive', directive });

        if (nextIsBlock) {
          index = skipInvalidBlock(
            lines, blockIndex, parseErrors,
            `A text block cannot follow the directive "${trimmed}" — blocks attach only to [OK] or [OK: contains]`
          );
        }
        continue;
      }

      // An assertion above the first command is about the opening — the banner
      // and the prologue, which the story says before anything is typed. It has
      // no command to attach to and used to be dropped without a word.
      if (!currentCommand) {
        const opening = parseAssertion(trimmed);
        if (opening) {
          (transcript.opening ??= []).push(opening);
        }
        continue;
      }

      // Not a directive - try as assertion (must be attached to a command)
      if (currentCommand) {
        const assertion = parseAssertion(trimmed);
        if (assertion) {
          currentCommand.assertions.push(assertion);

          if (nextIsBlock && !acceptsBlock(assertion)) {
            index = skipInvalidBlock(
              lines, blockIndex, parseErrors,
              `A text block cannot follow "${trimmed}" — blocks attach only to [OK] or payload-less [OK: contains]`
            );
          } else if (nextIsBlock) {
            const block = readTextBlock(lines, blockIndex);
            if (!block) {
              parseErrors.push({
                lineNumber: blockIndex + 1,
                message: `Unclosed text block — expected a line reading "${BLOCK_CLOSE}" before end of file`
              });
              index = lines.length;  // the author meant everything after to be literal
            } else if (block.content.length === 0) {
              parseErrors.push({
                lineNumber: blockIndex + 1,
                message: 'Empty text block — a block must contain at least one line'
              });
              index = block.closeIndex;
            } else {
              assertion.block = block.content;
              assertion.lineNumber = lineNumber;
              index = block.closeIndex;
            }
          } else if (assertion.type === 'ok-contains' && assertion.value === undefined) {
            parseErrors.push({
              lineNumber,
              message: '[OK: contains] with no inline payload requires a text block on the next line'
            });
          }
        }
      }
      continue;
    }

    // Expected output lines
    if (currentCommand) {
      currentCommand.expectedOutput.push(line);  // Preserve original indentation
      continue;
    }

    // A config field below the --- separator with no command to attach to is
    // the header-placement trap in reverse — error loudly (ADR-294 D3) rather
    // than dropping the line. Output lines under a command are untouched, so
    // story prose containing "seed:" still records verbatim.
    const strayConfig = /^([A-Za-z-]+)\s*:/.exec(trimmed);
    if (strayConfig && CONFIG_KEYS.includes(strayConfig[1].toLowerCase())) {
      parseErrors.push({
        lineNumber,
        message: `Header field "${strayConfig[1]}:" appears after the --- separator — header fields must be declared above it (ADR-294 D3)`
      });
    }
  }

  // A file whose header runs to EOF with no `---` separator still closes its
  // last field. No-op for the ordinary case, where `---` already flushed.
  flushHeader();

  // The last command is already recorded; it just never got closed out.
  if (currentCommand) {
    finalizeCommand(currentCommand, parseErrors);
  }

  // Parse goal segments from items
  transcript.goals = parseGoals(transcript.items!);

  // Attached only when non-empty: a clean transcript's AST must stay
  // byte-identical to its pre-block parse (ADR-287 D2, pinned by
  // tests/parse-baseline.test.ts).
  if (parseErrors.length > 0) {
    transcript.parseErrors = parseErrors;
  }

  return transcript;
}

/**
 * Parse and validate one header config field (ADR-294 D3) into
 * `transcript.config`, recording parse errors for invalid or conflicting
 * values. `key` is already lowercased and known to be a config key.
 */
/**
 * Check a `continues:` value and report by name what the author reached for
 * (ADR-302 D1, AC-2).
 *
 * Nothing is *derived* here — the value is stored either way, so a malformed
 * pointer still shows up in tree assembly rather than vanishing. This only
 * decides whether the file parses.
 */
function checkContinues(
  value: string,
  lineNumber: number,
  parseErrors: Array<{ lineNumber: number; message: string }>
): void {
  const trimmed = value.trim();
  if (trimmed === '') {
    parseErrors.push({
      lineNumber,
      message: 'continues: has no value — name the parent transcript\'s filename stem, or remove the field to make this a root (ADR-302 D1)',
    });
    return;
  }
  for (const rejection of CONTINUES_REJECTIONS) {
    if (rejection.pattern.test(trimmed)) {
      parseErrors.push({ lineNumber, message: rejection.message(trimmed) });
      return;
    }
  }
  if (!CONTINUES_STEM.test(trimmed)) {
    parseErrors.push({
      lineNumber,
      message: `continues: "${trimmed}" is not a filename stem — it must be a single name of letters, digits, \`.\`, \`-\` or \`_\` (ADR-302 D1)`,
    });
  }
}

/**
 * Read an expected scalar, preserving its type (ADR-300 D13).
 *
 * A quoted value is text, a bare number is a number, `true`/`false` are
 * booleans. The distinction is the point: `is 5` against a text channel
 * carrying `"5"` must fail by NAME as a wrong-type assertion rather than
 * quietly matching, so the transcript has to be able to say which it meant.
 *
 * Returns undefined for anything else, so the caller falls through and the
 * assertion reports as unrecognised rather than being silently coerced.
 */
function parseScalar(raw: string): string | number | boolean | undefined {
  const quoted = raw.match(/^"([^"]*)"$/);
  if (quoted) return quoted[1];
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (/^true$/i.test(raw)) return true;
  if (/^false$/i.test(raw)) return false;
  return undefined;
}

function parseConfigField(
  transcript: Transcript,
  key: string,
  value: string,
  lineNumber: number,
  parseErrors: ParseError[],
  seenConfigKeys: Map<string, number>
): void {
  const config: TranscriptRunConfig = transcript.config!;

  const previousLine = seenConfigKeys.get(key);
  if (previousLine !== undefined) {
    parseErrors.push({
      lineNumber,
      message: `Duplicate header field "${key}:" — already declared on line ${previousLine}`
    });
    return;
  }
  seenConfigKeys.set(key, lineNumber);
  // ADR-302 D8: record the declaration, not just its value — inheritance
  // needs to tell "said nothing" from "said the default".
  (transcript.declaredConfigKeys ??= []).push(key);

  /** Parse one seed value, recording an error and returning null when invalid. */
  const parseSeedValue = (raw: string): number | null => {
    if (!/^\d+$/.test(raw)) {
      parseErrors.push({
        lineNumber,
        message: `Invalid ${key}: value "${raw}" — must be a non-negative integer`
      });
      return null;
    }
    const parsed = Number(raw);
    if (parsed > MAX_SEED) {
      parseErrors.push({
        lineNumber,
        message: `Invalid ${key}: value "${raw}" — out of range (max ${MAX_SEED})`
      });
      return null;
    }
    return parsed;
  };

  /** Split a comma-separated value into trimmed, non-empty entries. */
  const splitList = (raw: string): string[] =>
    raw.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '');

  switch (key) {
    case 'seed': {
      if (seenConfigKeys.has('seeds')) {
        parseErrors.push({
          lineNumber,
          message: 'seed: and seeds: are mutually exclusive — use seed: N for one pin or seeds: A, B for a matrix (ADR-294 D8)'
        });
        return;
      }
      const seed = parseSeedValue(value);
      if (seed !== null) {
        transcript.seed = seed;
        transcript.seedLineNumber = lineNumber;
        config.seeds = [seed];
      }
      return;
    }

    case 'seeds': {
      if (seenConfigKeys.has('seed')) {
        parseErrors.push({
          lineNumber,
          message: 'seed: and seeds: are mutually exclusive — use seed: N for one pin or seeds: A, B for a matrix (ADR-294 D8)'
        });
        return;
      }
      const entries = splitList(value);
      if (entries.length === 0) {
        parseErrors.push({
          lineNumber,
          message: 'seeds: declares no values — expected a comma-separated list (seeds: 42, 777)'
        });
        return;
      }
      const seeds: number[] = [];
      for (const entry of entries) {
        const seed = parseSeedValue(entry);
        if (seed === null) return;
        if (seeds.includes(seed)) {
          parseErrors.push({
            lineNumber,
            message: `Duplicate seed ${seed} in seeds: — each seed gets its own recording, so each may appear once (ADR-294 D8)`
          });
          return;
        }
        seeds.push(seed);
      }
      config.seeds = seeds;
      return;
    }

    case 'channels': {
      const channels = splitList(value);
      if (channels.length === 0) {
        parseErrors.push({
          lineNumber,
          message: 'channels: declares no values — expected a comma-separated list (channels: main, status)'
        });
        return;
      }
      const duplicate = channels.find((channel, i) => channels.indexOf(channel) !== i);
      if (duplicate !== undefined) {
        parseErrors.push({
          lineNumber,
          message: `Duplicate channel "${duplicate}" in channels: — each channel may appear once`
        });
        return;
      }
      config.channels = channels;
      return;
    }

    case 'events': {
      const normalized = value.toLowerCase();
      if (normalized !== 'true' && normalized !== 'false') {
        parseErrors.push({
          lineNumber,
          message: `Invalid events: value "${value}" — must be true or false (ADR-294 D6)`
        });
        return;
      }
      config.events = normalized === 'true';
      return;
    }

    case 'locale': {
      if (value === '') {
        parseErrors.push({
          lineNumber,
          message: 'locale: declares no value — expected a locale tag (locale: en-US) or omit the field for the story\'s primary'
        });
        return;
      }
      config.locale = value;
      return;
    }

    case 'forces': {
      // ADR-293 D8/D9 (Phase C): each entry is `point[#occurrence]=CLASS`,
      // parsed to a structured spec at transcript-default mode `once`.
      // `(none)` is the explicit empty form the .golden provenance uses.
      if (value === '(none)' || value === '') {
        config.forces = [];
        return;
      }
      const entries = splitList(value);
      const canonical: string[] = [];
      const specs: NonNullable<TranscriptRunConfig['forceSpecs']> = [];
      const seenKeys = new Map<string, string>();
      for (const entry of entries) {
        const match = FORCE_ENTRY.exec(entry);
        if (!match) {
          parseErrors.push({
            lineNumber,
            message: `Invalid forces: entry "${entry}" — expected point[#occurrence]=CLASS (e.g. dungeo.thief.steal=yes or dungeo.melee.blow.villain#2=SERIOUS_WOUND)`
          });
          return;
        }
        const [, point, occurrenceDigits, cls] = match;
        const occurrence = occurrenceDigits === undefined ? undefined : Number(occurrenceDigits);
        if (occurrence !== undefined && (occurrence < 1 || occurrence > Number.MAX_SAFE_INTEGER)) {
          parseErrors.push({
            lineNumber,
            message: `Invalid forces: entry "${entry}" — occurrence index must be a positive integer (ADR-293 D9)`
          });
          return;
        }
        const key = occurrence === undefined ? point : `${point}#${occurrence}`;
        const previous = seenKeys.get(key);
        if (previous !== undefined) {
          parseErrors.push({
            lineNumber,
            message: `Duplicate force key "${key}" in forces: — duplicate keys are a load error, not last-wins (ADR-293 D9)`
          });
          return;
        }
        seenKeys.set(key, entry);
        canonical.push(`${key}=${cls}`);
        specs.push(
          occurrence === undefined
            ? { point, cls, mode: 'once' }
            : { point, occurrence, cls, mode: 'once' }
        );
      }
      if (specs.length === 0) {
        parseErrors.push({
          lineNumber,
          message: 'forces: declares no entries — expected a comma-separated list, or (none)'
        });
        return;
      }
      config.forces = canonical;
      config.forceSpecs = specs;
      config.forcesLineNumber = lineNumber;
      return;
    }

    case 'point-seed': {
      // ADR-293 D11: per-point starting-seed overrides — `point=seed` pairs.
      const entries = splitList(value);
      if (entries.length === 0) {
        parseErrors.push({
          lineNumber,
          message: 'point-seed: declares no entries — expected a comma-separated list (point-seed: dungeo.thief.steal=1234)'
        });
        return;
      }
      const pointSeeds: NonNullable<TranscriptRunConfig['pointSeeds']> = [];
      for (const entry of entries) {
        const match = POINT_SEED_ENTRY.exec(entry);
        if (!match) {
          parseErrors.push({
            lineNumber,
            message: `Invalid point-seed: entry "${entry}" — expected point=seed with a non-negative integer seed (ADR-293 D11)`
          });
          return;
        }
        const [, point, seedDigits] = match;
        const seed = Number(seedDigits);
        if (seed > MAX_SEED) {
          parseErrors.push({
            lineNumber,
            message: `Invalid point-seed: entry "${entry}" — seed out of range (max ${MAX_SEED})`
          });
          return;
        }
        if (pointSeeds.some((existing) => existing.point === point)) {
          parseErrors.push({
            lineNumber,
            message: `Duplicate point "${point}" in point-seed: — each point may be overridden once (ADR-293 D11)`
          });
          return;
        }
        pointSeeds.push({ point, seed });
      }
      config.pointSeeds = pointSeeds;
      config.pointSeedsLineNumber = lineNumber;
      return;
    }
  }
}

/**
 * Consume a text block that cannot legally attach where it appears, recording why.
 *
 * The block is swallowed rather than left in place so its literal content —
 * which may contain `>` commands or `[...]` tags — cannot be re-read as
 * transcript syntax and cascade into a second, misleading error.
 *
 * @returns the index the parse loop should resume from (EOF if never closed)
 */
function skipInvalidBlock(
  lines: string[],
  openIndex: number,
  parseErrors: ParseError[],
  message: string
): number {
  const block = readTextBlock(lines, openIndex);
  parseErrors.push({ lineNumber: openIndex + 1, message });
  return block ? block.closeIndex : lines.length;
}

/**
 * Parse a directive tag like [GOAL: name], [IF: condition], [NAVIGATE TO: "Room"]
 */
function parseDirective(tag: string, lineNumber: number): Directive | null {
  const inner = tag.slice(1, -1).trim();  // Remove [ ]

  // [GOAL: name]
  const goalMatch = inner.match(/^GOAL:\s*(.+)$/i);
  if (goalMatch) {
    return { type: 'goal', lineNumber, goalName: goalMatch[1].trim() };
  }

  // [END GOAL]
  if (inner.toUpperCase() === 'END GOAL') {
    return { type: 'end_goal', lineNumber };
  }

  // The control-flow/condition forms ([IF:], [WHILE:], [RETRY:], [DO]/[UNTIL],
  // [NAVIGATE TO:], [REQUIRES:], [ENSURES:]) are removed grammar (ADR-294 D4) —
  // the parse loop intercepts them as named errors before this function is
  // reached. GOAL survives above as a structural label only.

  // Not a directive
  return null;
}

/**
 * Parse a $ directive like $save <name>, $restore <name>, or ext-testing commands
 */
function parseDollarDirective(line: string, lineNumber: number): Directive | null {
  const trimmed = line.trim();

  // $save <name>
  const saveMatch = trimmed.match(/^\$save\s+(.+)$/i);
  if (saveMatch) {
    return { type: 'save', lineNumber, saveName: saveMatch[1].trim() };
  }

  // $restore <name>
  const restoreMatch = trimmed.match(/^\$restore\s+(.+)$/i);
  if (restoreMatch) {
    return { type: 'restore', lineNumber, saveName: restoreMatch[1].trim() };
  }

  // Any other $ directive is a test command (ext-testing)
  // Valid test commands: $teleport, $take, $move, $kill, $immortal, $mortal, $state, $describe, etc.
  const testCommandMatch = trimmed.match(/^\$(\w+)(.*)$/);
  if (testCommandMatch) {
    return { type: 'test-command', lineNumber, testCommand: trimmed };
  }

  return null;
}

/**
 * Parse goal segments from items array. Goals are structural labels only
 * (ADR-294 D4 removed the REQUIRES/ENSURES condition layer).
 */
function parseGoals(items: TranscriptItem[]): GoalDefinition[] {
  const goals: GoalDefinition[] = [];
  let currentGoal: Partial<GoalDefinition> | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type !== 'directive') continue;

    const directive = item.directive!;

    switch (directive.type) {
      case 'goal':
        if (currentGoal) {
          console.warn(`Line ${directive.lineNumber}: Nested goals not allowed. Closing previous goal.`);
          goals.push({ ...currentGoal, endIndex: i - 1 } as GoalDefinition);
        }
        currentGoal = {
          name: directive.goalName!,
          lineNumber: directive.lineNumber,
          startIndex: i + 1
        };
        break;

      case 'end_goal':
        if (currentGoal) {
          goals.push({ ...currentGoal, endIndex: i } as GoalDefinition);
          currentGoal = null;
        }
        break;
    }
  }

  // Handle unclosed goal
  if (currentGoal) {
    console.warn(`Unclosed goal: ${currentGoal.name}`);
    goals.push({ ...currentGoal, endIndex: items.length - 1 } as GoalDefinition);
  }

  return goals;
}

/**
 * Parse an assertion tag like [OK], [OK: contains "foo"], [FAIL: reason]
 */
function parseAssertion(tag: string): Assertion | null {
  const inner = tag.slice(1, -1).trim();  // Remove [ ]

  // [OK] - exact match
  if (inner === 'OK') {
    return { type: 'ok' };
  }

  // [SKIP]
  if (inner === 'SKIP') {
    return { type: 'skip' };
  }

  // [OK: any] is removed grammar (ADR-294 D2) — intercepted as a named parse
  // error before this function is reached.

  // [OK: contains] — payload-less; the fragment is the text block on the next
  // line (ADR-287 D1). Without a block this is a validation error, raised by the
  // parse loop, which is the only place that can see whether one follows.
  if (/^OK:\s*contains$/i.test(inner)) {
    return { type: 'ok-contains' };
  }

  // [OK: contains "text"]
  const containsMatch = inner.match(/^OK:\s*contains\s+"([^"]+)"$/i);
  if (containsMatch) {
    return { type: 'ok-contains', value: containsMatch[1] };
  }

  // [OK: not contains "text"]
  const notContainsMatch = inner.match(/^OK:\s*not\s+contains\s+"([^"]+)"$/i);
  if (notContainsMatch) {
    return { type: 'ok-not-contains', value: notContainsMatch[1] };
  }

  // [OK: contains_any] and [OK: matches] are removed grammar (ADR-294 D2) —
  // intercepted as named parse errors before this function is reached.

  // [FAIL: reason]
  const failMatch = inner.match(/^FAIL(?::\s*(.+))?$/i);
  if (failMatch) {
    return { type: 'fail', reason: failMatch[1] || 'Expected failure' };
  }

  // [TODO: note]
  const todoMatch = inner.match(/^TODO(?::\s*(.+))?$/i);
  if (todoMatch) {
    return { type: 'todo', reason: todoMatch[1] || 'Not implemented' };
  }

  // [EVENT: true|false, N?, type="..." key="value"]
  // Format: [EVENT: true, 1, type="if.event.pushed" target="y09"]
  //         [EVENT: false, type="if.event.destroyed"]
  const eventAssertMatch = inner.match(/^EVENT:\s*(true|false)\s*,\s*(.+)$/i);
  if (eventAssertMatch) {
    const assertTrue = eventAssertMatch[1].toLowerCase() === 'true';
    const rest = eventAssertMatch[2];

    // Check if there's a position number before the type
    const positionMatch = rest.match(/^(\d+)\s*,\s*(.+)$/);
    let eventPosition: number | undefined;
    let propsStr: string;

    if (positionMatch) {
      eventPosition = parseInt(positionMatch[1], 10);
      propsStr = positionMatch[2];
    } else {
      propsStr = rest;
    }

    // Parse key="value" pairs
    const eventData: Record<string, any> = {};
    let eventType: string | undefined;
    const propRegex = /(\w+)="([^"]+)"/g;
    let match;
    while ((match = propRegex.exec(propsStr)) !== null) {
      const [, key, value] = match;
      if (key === 'type') {
        eventType = value;
      } else {
        eventData[key] = value;
      }
    }

    if (eventType) {
      return {
        type: 'event-assert',
        assertTrue,
        eventPosition,
        eventType,
        eventData: Object.keys(eventData).length > 0 ? eventData : undefined
      };
    }
  }

  // [CHANNEL: <target>, <form>] where <target> is `id` or `id.path.into.record`
  // (ADR-300 D13). Reads a named channel instead of the turn's prose — how a
  // transcript asserts on the banner, the prologue, or anything else the story
  // says off to one side, and how it names ONE PIECE of a record rather than
  // substring-matching a flattened rendering of the whole thing.
  const channelMatch = inner.match(/^CHANNEL:\s*([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*)\s*,\s*(.+)$/i);
  if (channelMatch) {
    const [channelId, ...channelPath] = channelMatch[1].split('.');
    const rest = channelMatch[2].trim();
    const target = { channelId, ...(channelPath.length > 0 ? { channelPath } : {}) };

    // `is absent` / `is present` — sparse-channel silence is a claim a test can
    // make (D13). A channel that said nothing this turn is a fact, not a gap.
    if (/^is\s+absent$/i.test(rest)) {
      return { type: 'channel-absent', ...target };
    }
    if (/^is\s+present$/i.test(rest)) {
      return { type: 'channel-present', ...target };
    }

    const notContains = rest.match(/^not\s+contains\s+"([^"]+)"$/i);
    if (notContains) {
      return { type: 'channel-not-contains', ...target, value: notContains[1] };
    }

    const contains = rest.match(/^contains\s+"([^"]+)"$/i);
    if (contains) {
      return { type: 'channel-contains', ...target, value: contains[1] };
    }

    const isNot = rest.match(/^is\s+not\s+(.+)$/i);
    if (isNot) {
      const expected = parseScalar(isNot[1].trim());
      if (expected !== undefined) {
        return { type: 'channel-is-not', ...target, channelExpected: expected };
      }
    }

    const is = rest.match(/^is\s+(.+)$/i);
    if (is) {
      const expected = parseScalar(is[1].trim());
      if (expected !== undefined) {
        return { type: 'channel-is', ...target, channelExpected: expected };
      }
    }
  }

  // [STATE: true|false, expression]
  // Format: [STATE: true, egg.location = thief]
  //         [STATE: false, player.canSee(egg)]
  const stateAssertMatch = inner.match(/^STATE:\s*(true|false)\s*,\s*(.+)$/i);
  if (stateAssertMatch) {
    const assertTrue = stateAssertMatch[1].toLowerCase() === 'true';
    const expression = stateAssertMatch[2].trim();
    return {
      type: 'state-assert',
      assertTrue,
      stateExpression: expression
    };
  }

  console.warn(`Unknown assertion format: ${tag}`);
  return null;
}

/**
 * Clean up a command before adding to transcript
 *
 * @param command the command being closed out
 * @param parseErrors collector for structural problems only visible once the
 *   command is complete — expected-output lines can arrive after the assertion
 *   that carries the block, so the both-forms check cannot run at attach time
 */
function finalizeCommand(command: TranscriptCommand, parseErrors: ParseError[]): void {
  // Trim trailing empty lines from expected output
  while (command.expectedOutput.length > 0 &&
         command.expectedOutput[command.expectedOutput.length - 1].trim() === '') {
    command.expectedOutput.pop();
  }

  // If no explicit assertion and we have expected output, default to [OK].
  // A block assertion is an assertion, so it never acquires this default —
  // audited against ADR-287 D1's "a block or a classic block, never both".
  if (command.assertions.length === 0 && command.expectedOutput.length > 0) {
    command.assertions.push({ type: 'ok' });
  }

  // ADR-287 D1: a command may carry a text block OR a classic expected-output
  // block. This check is also what makes the reserved `end text` line safe to
  // rule with no escape: a payload containing one closes its block early and
  // the remainder lands in expectedOutput, so the collision surfaces HERE with
  // a line number instead of producing a plausible-looking assertion.
  const blocked = command.assertions.find(a => a.block !== undefined);
  if (blocked && command.expectedOutput.length > 0) {
    parseErrors.push({
      lineNumber: blocked.lineNumber ?? command.lineNumber,
      message: `Command "${command.input}" carries both a text block and a classic expected-output block — use one or the other`
    });
  }
}

/**
 * Validate a transcript for common issues
 */
export function validateTranscript(transcript: Transcript): string[] {
  const errors: string[] = [];

  // Structural parse failures first (ADR-287 AC4) — they are recorded during
  // parsing because a finished AST cannot represent them. Both consumers of
  // this function surface them: the bundle's reporter prints them, and
  // `sharpee test` turns them into a transcript-level `error` record
  // (packages/devkit/src/commands/test.ts, ADR-277 D1) — never a silent drop.
  for (const parseError of transcript.parseErrors ?? []) {
    errors.push(`Line ${parseError.lineNumber}: ${parseError.message}`);
  }

  if (transcript.commands.length === 0) {
    errors.push('Transcript has no commands');
  }

  if (!transcript.header.story && !transcript.header.title) {
    errors.push('Transcript should have a title or story in header');
  }

  for (const cmd of transcript.commands) {
    if (!cmd.input) {
      errors.push(`Line ${cmd.lineNumber}: Empty command`);
    }
    // No per-command assertion requirement here: a bare command list is the
    // golden tier's legal shape (ADR-294 D1 — the recording is the assertion).
    // The runner enforces the boundary instead: an assertion-less command in a
    // transcript with NO recording fails with a named error.
  }

  return errors;
}
