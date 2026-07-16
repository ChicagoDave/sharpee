/**
 * Wired-action registry — ADR-228 D5 pinning tests.
 *
 * The registry is the loader-facing contract: `interceptorConsultingActionIds`
 * is derived mechanically from the descriptor table, and the table covers
 * every entity-keyed standard action (33 per ADR-228 Consequences). The
 * completeness test scans the source tree so an action added with a
 * descriptor but never listed in the table fails here, not silently in Chord.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  actionLifecycleDescriptors,
  interceptorConsultingActionIds
} from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';

describe('wired-action registry (ADR-228 D5)', () => {
  test('covers all 33 entity-keyed standard actions with unique primary ids', () => {
    expect(actionLifecycleDescriptors).toHaveLength(33);
    const primaryIds = actionLifecycleDescriptors.map((d) => d.actionId);
    expect(new Set(primaryIds).size).toBe(33);
    for (const descriptor of actionLifecycleDescriptors) {
      expect(descriptor.slots.length).toBeGreaterThan(0);
      for (const slot of descriptor.slots) {
        expect(slot.actionIds.length).toBeGreaterThan(0);
      }
    }
  });

  test('every descriptor export in the source tree is listed in the table', () => {
    // Mechanical completeness gate: a 34th action whose author forgets the
    // registry line would break table.length === export-count here.
    const standardDir = path.join(__dirname, '../../../src/actions/standard');
    let exportCount = 0;
    for (const dir of fs.readdirSync(standardDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const file of fs.readdirSync(path.join(standardDir, dir.name))) {
        if (!file.endsWith('.ts')) continue;
        const source = fs.readFileSync(path.join(standardDir, dir.name, file), 'utf8');
        exportCount += (source.match(/export const \w+Lifecycle: ActionLifecycleDescriptor/g) ?? []).length;
      }
    }
    expect(exportCount).toBe(actionLifecycleDescriptors.length);
  });

  test('the id set is exactly the union of all slot actionIds', () => {
    const union = new Set(
      actionLifecycleDescriptors.flatMap((d) => d.slots.flatMap((s) => s.actionIds))
    );
    expect(interceptorConsultingActionIds).toEqual(union);
  });

  test('contains the primary, delegation-seam, and implicit-entity ids', () => {
    expect(interceptorConsultingActionIds.has(IFActions.TAKING)).toBe(true);
    expect(interceptorConsultingActionIds.has(IFActions.TALKING)).toBe(true);
    // D6 both-ids seams contribute the delegated id through removing's slots
    expect(interceptorConsultingActionIds.has(IFActions.REMOVING)).toBe(true);
    // ADR-126 room-entry consultation comes from going's destination slot
    expect(interceptorConsultingActionIds.has(IFActions.ENTERING_ROOM)).toBe(true);
  });

  test('excludes full-delegation capability actions and unimplemented constants', () => {
    expect(interceptorConsultingActionIds.has(IFActions.LOWERING)).toBe(false);
    expect(interceptorConsultingActionIds.has(IFActions.RAISING)).toBe(false);
    expect(interceptorConsultingActionIds.has('if.action.tasting')).toBe(false);
    expect(interceptorConsultingActionIds.has('if.action.looking')).toBe(false);
  });
});
