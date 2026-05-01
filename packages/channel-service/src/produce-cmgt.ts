/**
 * @sharpee/channel-service — CMGT manifest producer
 *
 * Owner context: platform package. Produces the per-client CMGT
 * manifest from the session's registered channels, filtered by the
 * client's declared capabilities (ADR-163 §11, decision 12).
 *
 * Bootstrap-order invariants enforced (ADR-163 §11, AC-4, AC-11):
 *  - Throws if no hello has been registered for the session.
 *  - Marks the registry frozen on success — subsequent
 *    `registerChannel` / `addRule` calls throw.
 *
 * Filtering rule (AC-5, §6):
 *  - Channels with no gating registered always pass through.
 *  - Channels gated by a `ClientCapabilities` flag pass through only
 *    when that flag is `true` for the passed capabilities.
 *
 * @see ADR-163 — Channel-Service Platform — decisions 6, 11, 12
 */

import type { CmgtPacket, ChannelDefinition, ClientCapabilities } from './wire';
import {
  _peekCapabilities,
  _isManifestFrozen,
  _freezeManifest,
  _getGating,
  getChannelRegistry,
} from './registry';

/**
 * Wire protocol version. Bumped on breaking shape changes to packet
 * kinds or `ChannelDefinition` fields. Additive channels do not bump
 * the version.
 */
export const PROTOCOL_VERSION = 1;

/**
 * Produce the CMGT manifest for a client (ADR-163 §11, decision 12).
 *
 * The `capabilities` argument names this client's declared
 * capabilities. The function filters gated channels accordingly and
 * returns a fresh manifest. Multi-user sessions call this once per
 * connecting client; single-user sessions call it once per process
 * boot.
 *
 * Side effect: freezes the session registry. After this returns,
 * `registerChannel` and `addRule` throw for the remainder of the
 * session (until `resetSession()`).
 *
 * Throws:
 *  - if no hello has been registered (AC-4 / bootstrap-order invariant)
 *  - if called twice in the same session — the registry is already
 *    frozen and a second call would imply a re-bootstrap, which must
 *    go through `resetSession()` first.
 */
export function produceCmgtManifest(
  capabilities: ClientCapabilities,
): CmgtPacket {
  if (_peekCapabilities() === null) {
    throw new Error(
      'channel-service: produceCmgtManifest() called before registerHello(). ' +
        'Bootstrap order invariant (ADR-163 §11): hello must precede CMGT.',
    );
  }
  if (_isManifestFrozen()) {
    throw new Error(
      'channel-service: produceCmgtManifest() called after manifest already produced. ' +
        'Call resetSession() before producing a second manifest.',
    );
  }

  const registered = getChannelRegistry();
  const filtered: ChannelDefinition[] = [];
  for (const def of registered) {
    const gate = _getGating(def.id);
    if (gate !== undefined && !capabilities[gate]) {
      continue;
    }
    filtered.push(def);
  }

  _freezeManifest();

  return {
    kind: 'cmgt',
    protocol_version: PROTOCOL_VERSION,
    channels: filtered,
  };
}
