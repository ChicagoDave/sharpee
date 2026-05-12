/**
 * @module tests/admin-cli.test
 * @purpose Behavior tests for `runAdminCli` — the implementation of
 *   `zifmia grant-admin <handle>` / `revoke-admin <handle>`. Tests
 *   call the function directly with an in-memory adapter rather than
 *   spawning a child process, so they can assert exit codes and
 *   stdout/stderr contents without waiting on the build.
 * @owner Zifmia server (tools/zifmia/tests).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runAdminCli } from '../src/admin-cli';
import { SqliteAdapter } from '../src/storage/sqlite/sqlite-adapter';

interface Capture {
  out: string[];
  err: string[];
}

function makeIo(adapter: SqliteAdapter, argv: readonly string[]) {
  const cap: Capture = { out: [], err: [] };
  return {
    cap,
    io: {
      argv,
      adapter,
      write: (m: string) => cap.out.push(m),
      writeErr: (m: string) => cap.err.push(m)
    }
  };
}

describe('runAdminCli', () => {
  let adapter: SqliteAdapter;

  beforeEach(async () => {
    adapter = new SqliteAdapter({ filename: ':memory:' });
    await adapter.migrate();
  });

  afterEach(async () => {
    await adapter.close();
  });

  it('grant-admin <handle> flips is_admin to true and exits 0', async () => {
    const created = await adapter.createIdentity({
      handle: 'first-admin',
      passcodeHash: 'hash'
    });
    expect(created.isAdmin).toBe(false);

    const { io, cap } = makeIo(adapter, ['grant-admin', 'first-admin']);
    const code = await runAdminCli(io);

    expect(code).toBe(0);
    expect(cap.err).toEqual([]);
    expect(cap.out.join('')).toContain('granted admin to first-admin');
    expect(cap.out.join('')).toContain(created.id);

    const after = await adapter.getIdentityByHandle('first-admin');
    expect(after?.isAdmin).toBe(true);
  });

  it('revoke-admin <handle> flips is_admin back to false and exits 0', async () => {
    const id = (
      await adapter.createIdentity({
        handle: 'will-revoke',
        passcodeHash: 'hash'
      })
    ).id;
    await adapter.setIdentityAdmin(id, true);

    const { io, cap } = makeIo(adapter, ['revoke-admin', 'will-revoke']);
    const code = await runAdminCli(io);

    expect(code).toBe(0);
    expect(cap.out.join('')).toContain('revoked admin from will-revoke');

    const after = await adapter.getIdentityByHandle('will-revoke');
    expect(after?.isAdmin).toBe(false);
  });

  it('exits 1 when the handle does not match any identity', async () => {
    const { io, cap } = makeIo(adapter, ['grant-admin', 'ghost']);
    const code = await runAdminCli(io);

    expect(code).toBe(1);
    expect(cap.out).toEqual([]);
    expect(cap.err.join('')).toContain('identity not found: ghost');
  });

  it('exits 2 when handle is missing', async () => {
    const { io, cap } = makeIo(adapter, ['grant-admin']);
    const code = await runAdminCli(io);

    expect(code).toBe(2);
    expect(cap.err.join('')).toContain('missing handle');
    expect(cap.err.join('')).toContain('usage: zifmia');
  });

  it('exits 2 when the subcommand is unknown', async () => {
    const { io, cap } = makeIo(adapter, ['oops', 'first-admin']);
    const code = await runAdminCli(io);

    expect(code).toBe(2);
    expect(cap.err.join('')).toContain('unknown subcommand: oops');
  });

  it('exits 2 when extra args are passed after the handle', async () => {
    await adapter.createIdentity({ handle: 'real', passcodeHash: 'h' });
    const { io, cap } = makeIo(adapter, ['grant-admin', 'real', 'extra']);
    const code = await runAdminCli(io);

    expect(code).toBe(2);
    expect(cap.err.join('')).toContain('unexpected extra arguments: extra');

    // No mutation should have happened.
    const after = await adapter.getIdentityByHandle('real');
    expect(after?.isAdmin).toBe(false);
  });

  it('grant-admin is idempotent — running twice keeps isAdmin=true', async () => {
    await adapter.createIdentity({ handle: 'idem', passcodeHash: 'h' });

    const { io: io1 } = makeIo(adapter, ['grant-admin', 'idem']);
    expect(await runAdminCli(io1)).toBe(0);
    const { io: io2 } = makeIo(adapter, ['grant-admin', 'idem']);
    expect(await runAdminCli(io2)).toBe(0);

    const after = await adapter.getIdentityByHandle('idem');
    expect(after?.isAdmin).toBe(true);
  });
});
