/**
 * EFF Large Wordlist passcode generator (ADR-161).
 *
 * Public interface: {@link generatePasscode}, {@link isWellFormedPasscode},
 * {@link PASSCODE_PATTERN}, {@link getWordlistSize}.
 *
 * Bounded context: identity (server-internal generator used by
 * `POST /api/identities` and `POST /api/identities/upload`).
 *
 * Format: `<wordA>-<wordB>`, both words drawn uniformly at random from
 * the EFF Large Wordlist (7,776 entries — lowercase a-z, all-letter,
 * dictionary-friendly). The list is shipped as a static asset
 * `eff-large-wordlist.txt` co-located with this module; the file is the
 * canonical EFF release (CC0).
 *
 * Combinations: 7,772² ≈ 60.4 million. (The EFF release has 7,776
 * entries; we filter out four hyphenated compounds — `drop-down`,
 * `felt-tip`, `t-shirt`, `yo-yo` — because the upload parser splits a
 * passcode on `-` and would mistake those for three-word passcodes.)
 * This is adequate for an honest user combined with the per-IP rate
 * limiter from Phase 2; it is not adequate as the sole defense against
 * credential-file theft, but the file itself is a possession factor.
 *
 * The wordlist is loaded once at module init and frozen. Load failure
 * (missing file, malformed line, wrong line count) throws — the server
 * must not run with a degraded wordlist because that would silently
 * shrink the passcode space.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';

/** Total entries in the canonical EFF Large Wordlist file. */
const EFF_RAW_LINE_COUNT = 7776;

/**
 * Entries that survive the pure-lowercase-alpha filter. EFF's published
 * list contains four hyphenated compounds — `drop-down`, `felt-tip`,
 * `t-shirt`, `yo-yo` — which would break the passcode parser's
 * `split('-')` step at upload time, so we drop them on load.
 */
const EXPECTED_WORD_COUNT = EFF_RAW_LINE_COUNT - 4;

/** Canonical passcode form: two lowercase-alpha words joined by `-`. */
export const PASSCODE_PATTERN = /^[a-z]+-[a-z]+$/;

const WORDLIST_FILENAME = 'eff-large-wordlist.txt';

/**
 * Parse the EFF wordlist file format. Each line is `<digits>\t<word>`
 * (the digits are the dice-roll index in the original publication;
 * we discard them). Returns the parsed words in a frozen array.
 *
 * Throws if any line is malformed or if the total count is not exactly
 * {@link EXPECTED_WORD_COUNT}.
 */
function loadWordlist(path: string): readonly string[] {
  const text = readFileSync(path, 'utf8');
  const lines = text.split('\n').map((l) => l.replace(/\r$/, ''));
  let rawLineCount = 0;
  const words: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue; // trailing newline at EOF
    rawLineCount++;
    // Format: "11111\tabacus" — split on whitespace, take last token.
    const tokens = line.split(/\s+/).filter((t) => t.length > 0);
    if (tokens.length !== 2) {
      throw new Error(
        `EFF wordlist parse error at line ${i + 1}: expected 2 tokens, got ${tokens.length}`,
      );
    }
    const word = tokens[1];
    // Skip hyphenated/compound entries — see EXPECTED_WORD_COUNT comment.
    // We don't throw on these: the canonical EFF release does contain
    // them, and the file is shipped verbatim for provenance.
    if (/^[a-z]+$/.test(word)) {
      words.push(word);
    }
  }
  if (rawLineCount !== EFF_RAW_LINE_COUNT) {
    throw new Error(
      `EFF wordlist must have ${EFF_RAW_LINE_COUNT} raw entries; got ${rawLineCount} from ${path}`,
    );
  }
  if (words.length !== EXPECTED_WORD_COUNT) {
    throw new Error(
      `EFF wordlist must yield ${EXPECTED_WORD_COUNT} pure-alpha entries after filtering; got ${words.length} from ${path}`,
    );
  }
  return Object.freeze(words);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORDLIST_PATH = join(__dirname, WORDLIST_FILENAME);
const WORDLIST = loadWordlist(WORDLIST_PATH);

/** Number of words in the loaded wordlist. Always {@link EXPECTED_WORD_COUNT}. */
export function getWordlistSize(): number {
  return WORDLIST.length;
}

/**
 * Return a fresh passcode: two words from the EFF wordlist, joined by
 * `-`. Words are drawn uniformly at random with `crypto.randomInt`.
 * The same word may be drawn twice (e.g. `apple-apple`); this is a
 * legitimate output and not filtered.
 */
export function generatePasscode(): string {
  const a = WORDLIST[randomInt(WORDLIST.length)];
  const b = WORDLIST[randomInt(WORDLIST.length)];
  return `${a}-${b}`;
}

/**
 * True iff `value` matches {@link PASSCODE_PATTERN}. Caller is responsible
 * for any normalization (the canonical form is already all-lowercase, so
 * trimming whitespace is the only normalization the caller may need).
 *
 * Note: this only validates the *shape* — it does not check that the
 * words appear in the wordlist. A passcode that fails wordlist membership
 * but matches the shape is still a valid input syntactically; the actual
 * verification step is `argon2.verify` against the stored hash.
 */
export function isWellFormedPasscode(value: unknown): value is string {
  return typeof value === 'string' && PASSCODE_PATTERN.test(value);
}

/**
 * Test-only export: read access to the loaded wordlist for tests that
 * need to verify generated words come from the list. Production code
 * does not need this.
 */
export function _testGetWordlist(): readonly string[] {
  return WORDLIST;
}
