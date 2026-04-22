/**
 * Recording-transparency notice for the `welcome` handshake.
 *
 * Public interface: {@link RECORDING_NOTICE}, {@link getRecordingNotice}.
 * Bounded context: client-facing wire protocol (ADR-153 Decision 8).
 *
 * Every welcome message carries this string so clients can show a
 * "session is being recorded" banner on first join. The server owns the
 * wording so the notice never drifts between clients or across releases.
 * Whether to suppress the banner after the first view is a client concern.
 */

/**
 * Canonical notice text. This string is part of the server's wire contract
 * with clients — changing it is a user-visible change that should be made
 * deliberately and, for breaking phrasing changes, announced.
 */
export const RECORDING_NOTICE =
  'This session is recorded. Every command, chat message, direct message, ' +
  'and role change is logged for the lifetime of this room. This includes ' +
  'Direct Messages between the Primary Host and Co-Hosts.';

/**
 * Return the notice that goes into a welcome payload. Kept as a function
 * (rather than exporting the constant directly) so future variants — e.g.
 * locale-aware notices or stricter wording for regulated deployments — can
 * slot in without changing call sites.
 */
export function getRecordingNotice(): string {
  return RECORDING_NOTICE;
}
