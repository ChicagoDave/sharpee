/**
 * save-restore-hooks-merge.test.ts — registration merges (issue #229).
 *
 * Derived from the `registerSaveRestoreHooks` Behavior Statement: a named entry
 * replaces the prior one of that name, entries the caller did not name survive,
 * and `save()`/`restore()` answer honestly when the hook they need is absent.
 *
 * The defect this pins is not "hooks were lost" in the abstract. The four hooks
 * are one object but four unrelated concerns, and two clients legitimately own
 * different ones — a harness owns `onRestartRequested`, a runner owns
 * save/restore. Wholesale assignment made the second registrant destroy the
 * first's silently, and with `onRestartRequested` gone the engine defaulted
 * `shouldRestart` to true: `restart` acked, stopped the engine, and never
 * rebooted (#227). The last case below is that exact sequence.
 *
 * Owner context: engine test suite (platform).
 */

import { describe, it, expect, vi } from 'vitest';
import { setupTestEngine } from './test-helpers/setup-test-engine';

describe('registerSaveRestoreHooks merges (#229)', () => {
  it('keeps an entry a later registration did not name', () => {
    const { engine } = setupTestEngine();
    const onRestartRequested = vi.fn(async () => true);

    engine.registerSaveRestoreHooks({ onRestartRequested });
    engine.registerSaveRestoreHooks({
      onSaveRequested: async () => {},
      onRestoreRequested: async () => null,
    });

    // The harness's restart hook survives the runner's save/restore
    // registration. Before #229 this was undefined.
    expect(engine.getSaveRestoreHooks()?.onRestartRequested).toBe(onRestartRequested);
    expect(engine.getSaveRestoreHooks()?.onSaveRequested).toBeDefined();
  });

  it('replaces an entry a later registration DOES name', () => {
    const { engine } = setupTestEngine();
    const first = vi.fn(async () => null);
    const second = vi.fn(async () => null);

    engine.registerSaveRestoreHooks({ onRestoreRequested: first });
    engine.registerSaveRestoreHooks({ onRestoreRequested: second });

    expect(engine.getSaveRestoreHooks()?.onRestoreRequested).toBe(second);
  });

  it('removes an entry named explicitly as undefined', () => {
    // Merging would otherwise make a hook unremovable. Naming it is the escape
    // hatch, and every read site treats absent and undefined alike.
    const { engine } = setupTestEngine();
    engine.registerSaveRestoreHooks({ onQuitRequested: async () => true });
    engine.registerSaveRestoreHooks({ onQuitRequested: undefined });

    expect(engine.getSaveRestoreHooks()?.onQuitRequested).toBeUndefined();
  });

  it('save() reports no capability when only unrelated hooks are registered', async () => {
    // Partial registration is now the supported shape, so `save()` must answer
    // for the hook it needs rather than calling `undefined` and reporting the
    // resulting TypeError as "Save failed".
    const { engine } = setupTestEngine();
    engine.registerSaveRestoreHooks({ onRestartRequested: async () => true });

    await expect(engine.save()).resolves.toBe(false);
  });

  it('restore() reports no capability when only unrelated hooks are registered', async () => {
    const { engine } = setupTestEngine();
    engine.registerSaveRestoreHooks({ onRestartRequested: async () => true });

    await expect(engine.restore()).resolves.toBe(false);
  });

  it('save() runs once the hook it needs is merged in', async () => {
    const { engine } = setupTestEngine();
    const onSaveRequested = vi.fn(async () => {});

    engine.registerSaveRestoreHooks({ onRestartRequested: async () => true });
    engine.registerSaveRestoreHooks({ onSaveRequested, onRestoreRequested: async () => null });
    engine.start();

    await expect(engine.save()).resolves.toBe(true);
    expect(onSaveRequested).toHaveBeenCalledOnce();
  });

  it('#227 — a runner registering save hooks leaves restart confirmation intact', async () => {
    // The original defect, at the layer that caused it: the confirmation hook
    // is still consulted after an unrelated registration, so a client that
    // wants to defer or refuse a restart still gets the chance.
    const { engine } = setupTestEngine();
    const onRestartRequested = vi.fn(async () => false);

    engine.registerSaveRestoreHooks({ onRestartRequested });
    engine.registerSaveRestoreHooks({
      onSaveRequested: async () => {},
      onRestoreRequested: async () => null,
    });
    engine.start();

    await engine.executeTurn('restart');

    expect(onRestartRequested).toHaveBeenCalledOnce();
    // It refused, so the engine is still running. That is the observable proof
    // the hook was consulted rather than defaulted past: a defaulted-true
    // restart calls stop(), and the next turn would throw "Engine is not
    // running" instead of resolving.
    await expect(engine.executeTurn('look')).resolves.toBeDefined();
  });
});
