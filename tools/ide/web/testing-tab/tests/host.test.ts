/**
 * host.test.ts — the bridge's inbound wiring (Phase 6e's addition).
 *
 * `installHost` installs `window.__sharpeeTesting`; Swift calls its functions.
 * The `autoAssertion` message is the one new cross-boundary hop Phase 6e adds,
 * so its wiring is pinned here: the value Swift sends is the value the page
 * handler receives, null included. The full hop against a REAL webview lives
 * in AutoAssertionMenuTests (Swift); this is the cheap half that fails fast.
 *
 * Owner context: tools/ide — the Testing tab's web bundle (tests).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { installHost, type PageHandlers } from '../src/host';

/** A handler set that records what arrived; only the fields under test matter. */
function recordingHandlers(): { handlers: PageHandlers; policies: (string | null)[] } {
  const policies: (string | null)[] = [];
  const nothing = (): void => {};
  const handlers: PageHandlers = {
    onEvent: nothing,
    onUndecodable: nothing,
    onReset: nothing,
    onStatus: nothing,
    onDiscovered: nothing,
    onGoldens: nothing,
    onRestoreMode: nothing,
    onAutoAssertion: (policy) => policies.push(policy),
    onFinished: nothing,
    onSource: nothing,
    onSourceFailed: nothing,
    onSaved: nothing,
    onSaveFailed: nothing,
    onCreated: nothing,
    onCreateFailed: nothing,
    onTrashed: nothing,
    onTrashFailed: nothing,
    onGoldenRestored: nothing,
    onGoldenRestoreFailed: nothing,
  };
  return { handlers, policies };
}

type Inbound = { autoAssertion(policy: string | null): void };

describe('the autoAssertion inbound message (Phase 6e)', () => {
  beforeEach(() => {
    // `installHost` needs a `window` to install onto; node has none. The
    // outbound half degrades to no-ops without `window.webkit`, which is the
    // browser-outside-the-IDE path the module already promises.
    (globalThis as Record<string, unknown>).window = globalThis;
  });

  it('delivers the policy Swift sent to the page handler, verbatim', () => {
    const { handlers, policies } = recordingHandlers();
    installHost(handlers);
    const inbound = (globalThis as Record<string, unknown>).__sharpeeTesting as Inbound;

    inbound.autoAssertion('room-description');
    inbound.autoAssertion('all-emitted-text');
    expect(policies).toEqual(['room-description', 'all-emitted-text']);
  });

  it('delivers null — "let me decide" is a value, not a dropped call', () => {
    const { handlers, policies } = recordingHandlers();
    installHost(handlers);
    const inbound = (globalThis as Record<string, unknown>).__sharpeeTesting as Inbound;

    inbound.autoAssertion(null);
    expect(policies).toEqual([null]);
  });
});
