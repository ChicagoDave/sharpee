/**
 * @module @sharpee/zifmia/admin-cli
 * @purpose Command implementations for the `zifmia` CLI's admin
 *   subcommands (`grant-admin`, `revoke-admin`). Bootstraps the
 *   `is_admin` bit on a fresh deployment without going through the
 *   admin-gated UI.
 * @owner Zifmia server (tools/zifmia).
 *
 * Per ADR-175 §Resolved Open Questions (2026-05-11) — OQ-3: the admin
 * surface is gated by `identities.is_admin`, but the first admin has
 * to be minted out-of-band. This module is the documented entry
 * point.
 *
 * Exit codes:
 *   - 0  on success
 *   - 1  on user-facing error (e.g. unknown handle)
 *   - 2  on usage error (missing arg, unknown subcommand)
 */

import type { StorageAdapter } from './storage/adapter';

export interface AdminCliIo {
  /** Process argv excluding the leading `node` and script path —
   * matches what the dispatcher in `cli.ts` slices off. */
  argv: readonly string[];
  adapter: StorageAdapter;
  write: (message: string) => void;
  writeErr: (message: string) => void;
}

export type AdminSubcommand = 'grant-admin' | 'revoke-admin';

const USAGE = 'usage: zifmia <grant-admin|revoke-admin> <handle>\n';

/**
 * Run an admin subcommand. Caller is responsible for closing the
 * adapter after the returned promise settles.
 *
 * @returns the exit code the dispatcher should pass to `process.exit`.
 */
export async function runAdminCli(io: AdminCliIo): Promise<number> {
  const [sub, handle, ...rest] = io.argv;

  if (sub !== 'grant-admin' && sub !== 'revoke-admin') {
    io.writeErr(`unknown subcommand: ${sub ?? '(none)'}\n${USAGE}`);
    return 2;
  }
  if (typeof handle !== 'string' || handle.length === 0) {
    io.writeErr(`missing handle\n${USAGE}`);
    return 2;
  }
  if (rest.length > 0) {
    io.writeErr(`unexpected extra arguments: ${rest.join(' ')}\n${USAGE}`);
    return 2;
  }

  const identity = await io.adapter.getIdentityByHandle(handle);
  if (!identity) {
    io.writeErr(`identity not found: ${handle}\n`);
    return 1;
  }

  const granting = sub === 'grant-admin';
  await io.adapter.setIdentityAdmin(identity.id, granting);
  io.write(
    granting
      ? `granted admin to ${handle} (${identity.id})\n`
      : `revoked admin from ${handle} (${identity.id})\n`
  );
  return 0;
}
