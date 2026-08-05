/**
 * channel-assert.ts — evaluating channel assertions against structured values
 * (ADR-300 D13, D14).
 *
 * v1 could only substring-match a flattened rendering of a channel, so a test
 * about the banner's title had to match text that also contained the version
 * lines and the credits. D7 made a channel's value real structure; this is the
 * assertion tier catching up to it.
 *
 * Three things are load-bearing here and none is obvious:
 *
 *  - **A path onto a list matches any element.** `banner.credits` has no index
 *    a test could usefully name, and asserting on position would break every
 *    time an author adds a name.
 *  - **Type mismatches fail by name.** `is 5` against a channel carrying the
 *    string `"5"` is a wrong-type failure, not a match. Coercing would make the
 *    assertion vocabulary weaker than the values it reads.
 *  - **Absence is assertable and distinct from emptiness.** A sparse channel
 *    that stayed quiet is a fact worth pinning; conflating it with a channel
 *    that emitted `""` hides a cue that stopped firing.
 *
 * Public interface: `resolveChannelPath`, `checkChannelAssertion`,
 * `channelsReferencedBy`.
 * Owner context: branch-tester (testing tooling).
 *
 * @see ADR-300 — Addressable Channels — D13, D14
 */

import { Assertion, AssertionResult } from './types.js';

/** Outcome of walking a dotted path into a channel's value. */
export interface PathResolution {
  /** True when the path landed somewhere — even on `null`. */
  readonly found: boolean;
  /**
   * Every value the path resolved to. More than one when a segment crossed a
   * list: `banner.credits` yields each credit, so a `contains` matches if any
   * element does.
   */
  readonly values: unknown[];
}

/**
 * Walk a dotted path into a channel's emitted values (ADR-300 D13).
 *
 * `emissions` is what the channel emitted this turn, in order — one entry per
 * emission, so an append-mode channel that fired twice has two. An empty path
 * resolves to the emissions themselves.
 *
 * Crossing a list fans out rather than failing: every element is carried
 * forward, and a later segment applies to each.
 */
export function resolveChannelPath(emissions: unknown[], path: readonly string[]): PathResolution {
  let current: unknown[] = emissions.flatMap((value) => (Array.isArray(value) ? value : [value]));

  for (const segment of path) {
    const next: unknown[] = [];
    for (const value of current) {
      if (value === null || typeof value !== 'object') continue;
      if (Array.isArray(value)) {
        // A list reached mid-path: apply the segment to each element.
        for (const element of value) {
          if (element && typeof element === 'object' && segment in element) {
            next.push((element as Record<string, unknown>)[segment]);
          }
        }
        continue;
      }
      if (segment in (value as Record<string, unknown>)) {
        next.push((value as Record<string, unknown>)[segment]);
      }
    }
    if (next.length === 0) return { found: false, values: [] };
    current = next;
  }

  // A terminal list fans out, so `contains` reads "any element contains".
  const values = current.flatMap((value) => (Array.isArray(value) ? value : [value]));
  return { found: true, values };
}

/**
 * Evaluate one channel assertion against the turn's structured captures.
 *
 * @param assertion the assertion, already parsed
 * @param captured channel id → that channel's emissions this turn. A channel
 *   absent from the map emitted nothing.
 */
export function checkChannelAssertion(
  assertion: Assertion,
  captured: Record<string, unknown[]> | undefined,
): AssertionResult {
  const id = assertion.channelId!;
  const path = assertion.channelPath ?? [];
  const target = path.length > 0 ? `${id}.${path.join('.')}` : id;
  const emissions = captured?.[id];

  const fail = (message: string): AssertionResult => ({ assertion, passed: false, message });
  const pass = (): AssertionResult => ({ assertion, passed: true });

  // ── Absence and presence ───────────────────────────────────────────
  const silent = emissions === undefined || emissions.length === 0;
  const resolved = silent
    ? { found: false, values: [] as unknown[] }
    : resolveChannelPath(emissions, path);

  if (assertion.type === 'channel-absent') {
    return resolved.found
      ? fail(`Channel "${target}" is present (${describe(resolved.values)}), expected absent`)
      : pass();
  }
  if (assertion.type === 'channel-present') {
    return resolved.found
      ? pass()
      : fail(`Channel "${target}" said nothing this turn, expected present`);
  }

  if (silent) {
    return fail(
      `Channel "${id}" said nothing this turn — if that is the claim, write ` +
        `[CHANNEL: ${target}, is absent]`,
    );
  }
  if (!resolved.found) {
    return fail(
      `Channel "${id}" emitted no "${path.join('.')}" — it carries ${describe(
        resolveChannelPath(emissions, []).values,
      )}`,
    );
  }

  // ── contains / not contains ────────────────────────────────────────
  if (assertion.type === 'channel-contains' || assertion.type === 'channel-not-contains') {
    const want = assertion.value!.toLowerCase();
    const found = resolved.values.some((value) => textOf(value).toLowerCase().includes(want));
    const wantContains = assertion.type === 'channel-contains';
    if (wantContains === found) return pass();
    return fail(
      wantContains
        ? `Channel "${target}" does not contain "${assertion.value}" (${describe(resolved.values)})`
        : `Channel "${target}" should not contain "${assertion.value}"`,
    );
  }

  // ── is / is not, type-checked ──────────────────────────────────────
  const expected = assertion.channelExpected;
  const wantEqual = assertion.type === 'channel-is';

  // A wrong-type comparison fails by NAME rather than by never matching, so an
  // author who wrote `is 5` against text learns which mistake they made.
  const mismatched = resolved.values.filter((value) => typeof value !== typeof expected);
  if (mismatched.length === resolved.values.length) {
    return fail(
      `Channel "${target}" carries ${typeName(resolved.values[0])} (${describe(
        resolved.values,
      )}), but the assertion compares it to ${typeName(expected)} — ` +
        `write ${suggest(expected, resolved.values[0])} to compare like with like`,
    );
  }

  const equal = resolved.values.some((value) => value === expected);
  if (wantEqual === equal) return pass();
  return fail(
    wantEqual
      ? `Channel "${target}" is ${describe(resolved.values)}, expected ${JSON.stringify(expected)}`
      : `Channel "${target}" is ${JSON.stringify(expected)}, expected anything else`,
  );
}

/**
 * Every channel id a transcript's assertions read (ADR-300 D14).
 *
 * This is the capture set. A transcript does not separately declare which
 * channels to record — what it asserts about is what gets captured, so a
 * `channels:` header cannot drift out of step with the assertions beneath it,
 * and an assertion about an undeclared channel stops being an error about
 * bookkeeping.
 */
export function channelsReferencedBy(assertions: Iterable<Assertion>): string[] {
  const ids = new Set<string>();
  for (const assertion of assertions) {
    if (assertion.channelId) ids.add(assertion.channelId);
  }
  return [...ids].sort();
}

/** A value as text, for `contains`. Objects render as stable JSON. */
function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Short rendering of resolved values, for a failure message. */
function describe(values: unknown[]): string {
  if (values.length === 0) return 'nothing';
  if (values.length === 1) return JSON.stringify(values[0]);
  return JSON.stringify(values);
}

function typeName(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a list';
  return `a ${typeof value}`;
}

/** The form the author probably meant, given what the channel actually holds. */
function suggest(expected: unknown, actual: unknown): string {
  return typeof actual === 'string' ? `is "${String(expected)}"` : `is ${String(expected)}`;
}
