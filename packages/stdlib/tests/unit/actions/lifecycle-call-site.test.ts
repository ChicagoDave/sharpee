/**
 * Structural pins for ADR-337 D1: the actions carry no lifecycle hook calls
 * except the ones their descriptors declare, every descriptor names the
 * two event types the executor's phase runner targets, and the four
 * multi-object actions each call all three per-item primitives (ADR-228
 * D4, the declared remainder) while no other action imports them.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { actionLifecycleDescriptors } from '../../../src/actions/lifecycle/registry';

const HOOKS = ['resolveLifecycle', 'getLifecycleState', 'runPreValidate', 'runPostValidate', 'runPostExecute', 'runPostReport', 'runOnBlocked'];
const PRIMITIVES = ['runMultiObjectValidate', 'runMultiObjectExecute', 'runMultiObjectReport'];

/**
 * Actions whose source may still name a hook, and why. Every entry is
 * backed by a descriptor declaration this test checks; a new name here
 * without one fails below.
 */
const DECLARED_HOOK_CALLERS: Record<string, 'runsOwnHooks' | 'handlesMultiObject' | 'delegation'> = {
  attacking: 'runsOwnHooks',      // postExecute is the combat resolution; postReport precedes death events
  answering: 'runsOwnHooks',      // post hooks only when the exchange has not gripped the response
  asking: 'runsOwnHooks',
  talking: 'runsOwnHooks',
  telling: 'runsOwnHooks',
  taking: 'handlesMultiObject',   // blocked() notifies the first failed item's consultations (D4)
  dropping: 'handlesMultiObject',
  putting: 'handlesMultiObject',
  removing: 'handlesMultiObject',
  inserting: 'delegation'         // runs PUTTING's hooks around the phases it delegates into
};

function actionSources(): Map<string, string> {
  const standardDir = path.join(__dirname, '../../../src/actions/standard');
  const sources = new Map<string, string>();
  for (const dir of fs.readdirSync(standardDir, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of fs.readdirSync(path.join(standardDir, dir.name))) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
      sources.set(`${dir.name}/${file}`, fs.readFileSync(path.join(standardDir, dir.name, file), 'utf8'));
    }
  }
  return sources;
}

function callsIn(source: string, names: string[]): string[] {
  return names.filter(name => new RegExp(`\\b${name}\\(`).test(source));
}

describe('the lifecycle call site is the executor (ADR-337 D1)', () => {
  test('every descriptor names its report and blocked event types', () => {
    for (const descriptor of actionLifecycleDescriptors) {
      const kind = typeof descriptor.reportEventType;
      expect(kind === 'string' || kind === 'function', `${descriptor.actionId} reportEventType`).toBe(true);
      expect(typeof descriptor.blockedEventType, `${descriptor.actionId} blockedEventType`).toBe('string');
      expect(descriptor.blockedEventType.startsWith('if.event.'), `${descriptor.actionId} blockedEventType`).toBe(true);
    }
  });

  test('no action calls a lifecycle hook unless its descriptor declares why', () => {
    const byDir = new Map(actionLifecycleDescriptors.map(d => [d.actionId, d]));
    const callers: string[] = [];
    for (const [file, source] of actionSources()) {
      const calls = callsIn(source, HOOKS);
      if (calls.length === 0) continue;
      const dir = file.split('/')[0];
      callers.push(dir);
      const reason = DECLARED_HOOK_CALLERS[dir];
      expect(reason, `${file} calls ${calls.join(', ')} without a declared reason`).toBeDefined();
      const idMatch = source.match(/actionId: IFActions\.(\w+)/);
      const descriptor = actionLifecycleDescriptors.find(d => d.actionId === `if.action.${dir}`)
        ?? [...byDir.values()].find(d => idMatch && d.actionId.endsWith(idMatch[1].toLowerCase()));
      expect(descriptor, `${file} has no descriptor`).toBeDefined();
      if (reason === 'runsOwnHooks') {
        const expected = dir === 'attacking' ? ['postExecute', 'postReport'] : ['postValidate', 'postExecute', 'postReport'];
        expect(descriptor!.contracts?.runsOwnHooks, `${file} must declare contracts.runsOwnHooks`).toEqual(expected);
      } else if (reason === 'handlesMultiObject') {
        expect(descriptor!.contracts?.handlesMultiObject, `${file} must declare contracts.handlesMultiObject`).toBe(true);
      }
    }
    // The other direction: every declared caller still calls something
    // (a stale entry here would hide a future regression).
    for (const dir of Object.keys(DECLARED_HOOK_CALLERS)) {
      expect(callers, `${dir} is declared but calls no hook`).toContain(dir);
    }
  });

  test('the four multi-object actions call all three per-item primitives; no other action imports them', () => {
    const importers: string[] = [];
    for (const [file, source] of actionSources()) {
      if (!PRIMITIVES.some(p => source.includes(p))) continue;
      const dir = file.split('/')[0];
      importers.push(dir);
      expect(callsIn(source, PRIMITIVES), `${file} must call all three D4 primitives`).toEqual(PRIMITIVES);
      const descriptor = actionLifecycleDescriptors.find(d => d.actionId === `if.action.${dir}`);
      expect(descriptor?.contracts?.handlesMultiObject, `${file} must declare contracts.handlesMultiObject`).toBe(true);
    }
    expect(importers.sort()).toEqual(['dropping', 'putting', 'removing', 'taking']);
  });
});
