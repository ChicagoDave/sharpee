/**
 * auto-assertion.ts — the auto-assertion policy's synthesis engine, shared by
 * the runner and the Testing tab's record-time synthesis (ADR-307).
 *
 * The runner calls this at the ADR-294 D2 tier boundary (a bare command run
 * under a policy); the tab calls it when a turn lands, persisting the result
 * into the tree document. Anything either writer records comes from HERE — a
 * second spelling of the synthesis is drift. The policy synthesis itself and
 * the prose reader live in the assertion core (`@sharpee/transcript-tester`'s
 * `assertion-core`, ADR-340 D1) and are re-exported here, so the IDE surface's
 * `@sharpee/branch-tester/auto-assertion` import keeps its shape (D5); the
 * opening defaults and the wire rendering are this package's own.
 *
 * Public interface: `synthesizePolicyAssertions(policy, actualOutput,
 * channelValues)`, `synthesizeOpeningAssertions(policy, bootChannelValues)`,
 * `proseTextLinesOf(values)`, `describeAssertion`, `streamableCommandResult`,
 * `DEFAULT_AUTO_ASSERTION_POLICY`.
 * Owner context: @sharpee/branch-tester (test authoring infrastructure).
 */
import { proseTextLinesOf } from '@sharpee/transcript-tester/assertion-core';
import type { Assertion, AutoAssertionPolicy } from './types.js';

export { synthesizePolicyAssertions, proseTextLinesOf } from '@sharpee/transcript-tester/assertion-core';

/**
 * The platform's effective policy when a story declares no `auto-assertion:`
 * header (David's ruling, 2026-08-10: "auto assertion is the default" —
 * extending the 2026-08-09 authoring-surface ruling to the whole document
 * world). A declared header wins; the default applies to TREE-DOCUMENT runs
 * only — the transcript world keeps ADR-294 D2's "absent = let me decide"
 * boundary until the cutover retires it. The IDE surface reads this same
 * constant for in-page synthesis; there is deliberately no second spelling.
 */
export const DEFAULT_AUTO_ASSERTION_POLICY: AutoAssertionPolicy =
  'room-name-and-description';

/**
 * A human, one-line rendering of an assertion — the vocabulary the Testing
 * tab's claim lines use (`contains "…"`, `channel info.title is "…"`), so the
 * run detail view and the cards read as one language. Consumed by the wire's
 * `assertionResults` (run detail, David 2026-08-10).
 *
 * @param assertion the runner-shape assertion.
 * @returns the display line, never empty.
 */
export function describeAssertion(assertion: Assertion): string {
  const quoted = (text: unknown): string => `"${text}"`;
  const channel = (): string =>
    (assertion.channelPath?.length ?? 0) > 0
      ? `${assertion.channelId}.${assertion.channelPath!.join('.')}`
      : `${assertion.channelId}`;
  switch (assertion.type) {
    case 'ok':
      return assertion.block !== undefined
        ? `exact output (${assertion.block.length} lines)`
        : '[OK]';
    case 'ok-contains':
      return assertion.value !== undefined
        ? `contains ${quoted(assertion.value)}`
        : `contains (${assertion.block?.length ?? 0} lines)`;
    case 'ok-not-contains':
      return assertion.value !== undefined
        ? `not contains ${quoted(assertion.value)}`
        : `not contains (${assertion.block?.length ?? 0} lines)`;
    case 'state-assert':
      return `state ${assertion.stateExpression ?? ''}`.trimEnd();
    case 'event-assert':
      return `event ${assertion.eventType ?? ''}`.trimEnd();
    case 'channel-contains':
      return `channel ${channel()} contains ${quoted(assertion.value)}`;
    case 'channel-not-contains':
      return `channel ${channel()} not contains ${quoted(assertion.value)}`;
    case 'channel-is':
      return `channel ${channel()} is ${quoted(assertion.channelExpected)}`;
    case 'channel-is-not':
      return `channel ${channel()} is not ${quoted(assertion.channelExpected)}`;
    case 'channel-absent':
      return `channel ${channel()} absent`;
    case 'channel-present':
      return `channel ${channel()} present`;
    case 'skip':
      return '[SKIP]';
    case 'fail':
      return '[FAIL]';
    case 'todo':
      return '[TODO]';
  }
}

/**
 * A command result in the run-event stream's shape: the raw result with its
 * `assertionResults` rendered into wire verdicts (`description`/`passed`/
 * `message`) via {@link describeAssertion}. The one spelling every stream
 * emitter uses — the run detail view (David 2026-08-10) reads these rows.
 *
 * @param command any runner command result.
 * @returns the same result, wire-shaped assertion verdicts substituted.
 */
export function streamableCommandResult<
  T extends { assertionResults: { assertion: Assertion; passed: boolean; message?: string }[] },
>(command: T): Omit<T, 'assertionResults'> & {
  assertionResults: { description: string; passed: boolean; message?: string }[];
} {
  return {
    ...command,
    assertionResults: command.assertionResults.map((entry) => ({
      description: describeAssertion(entry.assertion),
      passed: entry.passed,
      ...(entry.message !== undefined ? { message: entry.message } : {}),
    })),
  };
}

/**
 * The opening card's default claims (ADR-307 open question D, resolved by
 * David 2026-08-10): the story's **prologue, title, and description** — who
 * and what this story is, checked where the story first says it. Synthesized
 * LIVE from the boot's channel captures and never persisted (D2); both
 * consumers (the Testing tab and `sharpee test --tree`) derive the same
 * claims through this one function.
 *
 * Each piece self-gates on its capture: a story with no prologue contributes
 * no prologue claim, and a boot that never captured `info` contributes no
 * title/description claim — so a session that does not declare these
 * channels (the v1 transcript path) synthesizes nothing and is unchanged.
 *
 * @param policy the story's declared policy — no policy, no defaults
 * @param bootChannelValues structured channel captures from BOOT
 *   (`prologue` prose, the `info` JSON payload)
 * @returns the opening's default claims — possibly empty, never a skip
 */
export function synthesizeOpeningAssertions(
  policy: AutoAssertionPolicy | undefined,
  bootChannelValues: Record<string, unknown[]> | undefined,
): Assertion[] {
  if (policy === undefined || bootChannelValues === undefined) return [];
  const assertions: Assertion[] = [];

  const prologueLines = proseTextLinesOf(bootChannelValues['prologue']);
  if (prologueLines.length > 0) {
    assertions.push({
      type: 'channel-contains',
      channelId: 'prologue',
      value: prologueLines[0],
    });
  }

  // The `info` channel is a JSON payload; its `title`/`description` string
  // properties are read as dotted-path channel claims (ADR-300 D13:
  // `channelId` base + `channelPath` into the structured capture).
  const info = bootChannelValues['info']?.[0];
  if (info !== null && typeof info === 'object' && !Array.isArray(info)) {
    const payload = info as { title?: unknown; description?: unknown };
    if (typeof payload.title === 'string' && payload.title.length > 0) {
      assertions.push({
        type: 'channel-is',
        channelId: 'info',
        channelPath: ['title'],
        channelExpected: payload.title,
      });
    }
    if (typeof payload.description === 'string' && payload.description.length > 0) {
      assertions.push({
        type: 'channel-is',
        channelId: 'info',
        channelPath: ['description'],
        channelExpected: payload.description,
      });
    }
  }

  return assertions;
}
