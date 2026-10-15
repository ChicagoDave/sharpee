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
import { actionLifecycleDescriptors, lifecycleDescriptorFor } from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';

const HOOKS = ['resolveLifecycle', 'getLifecycleState', 'runPreValidate', 'runPostValidate', 'runPostExecute', 'runPostReport', 'runOnBlocked'];
const PRIMITIVES = ['runMultiObjectValidate', 'runMultiObjectExecute', 'runMultiObjectReport'];

/**
 * Actions whose source may still name a hook, and why. Every entry is
 * backed by a descriptor declaration this test checks; a new name here
 * without one fails below.
 */
const DECLARED_HOOK_CALLERS: Record<string, 'runsOwnHooks' | 'handlesMultiObject' | 'consequence'> = {
  attacking: 'runsOwnHooks',      // postExecute is the combat resolution; postReport precedes death events
  answering: 'runsOwnHooks',      // post hooks only when the exchange has not gripped the response
  asking: 'runsOwnHooks',
  talking: 'runsOwnHooks',
  telling: 'runsOwnHooks',
  taking: 'handlesMultiObject',   // blocked() notifies the first failed item's consultations (D4)
  dropping: 'handlesMultiObject',
  putting: 'handlesMultiObject',
  removing: 'handlesMultiObject',
  breaking: 'consequence'         // runBreakingLifecycle: fired by the action that broke the thing (ADR-373 D3)
};

/**
 * Actions carried out by another action (ADR-228 D6-B). They call no hook
 * themselves: the inner action's hooks run in `delegation-shared.ts`, the one
 * module outside the executor that may, and these actions call its three
 * phases. A new delegating action is listed here and nowhere else.
 */
const DELEGATING_ACTIONS = ['inserting', 'lighting', 'extinguishing'];
const DELEGATION_PHASES = ['delegateValidate', 'delegateExecute', 'delegateReport'];

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
      } else if (reason === 'consequence') {
        expect(descriptor!.contracts?.firedAsConsequence?.causes.length, `${file} must declare contracts.firedAsConsequence with its causes`).toBeGreaterThan(0);
      }
    }
    // The other direction: every declared caller still calls something
    // (a stale entry here would hide a future regression).
    for (const dir of Object.keys(DECLARED_HOOK_CALLERS)) {
      expect(callers, `${dir} is declared but calls no hook`).toContain(dir);
    }
  });

  test('delegation runs through its one seam (ADR-228 D6-B)', () => {
    const delegators: string[] = [];
    for (const [file, source] of actionSources()) {
      if (callsIn(source, DELEGATION_PHASES).length === 0) continue;
      const dir = file.split('/')[0];
      delegators.push(dir);
      expect(callsIn(source, DELEGATION_PHASES), `${file} must run all three delegated phases`).toEqual(DELEGATION_PHASES);
    }
    expect(delegators.sort()).toEqual([...DELEGATING_ACTIONS].sort());
    const seam = fs.readFileSync(path.join(__dirname, '../../../src/actions/standard/delegation-shared.ts'), 'utf8');
    expect(callsIn(seam, HOOKS), 'delegation-shared.ts runs the inner action\'s hooks').toEqual(
      ['resolveLifecycle', 'getLifecycleState', 'runPreValidate', 'runPostValidate', 'runPostExecute', 'runPostReport'],
    );
  });

  test('exactly the declared breaking causes fire the breaking lifecycle (ADR-373 D3)', () => {
    const callers = new Set<string>();
    for (const [file, source] of actionSources()) {
      if (/\brunBreakingLifecycle\(/.test(source) && !file.startsWith('breaking/')) callers.add(file.split('/')[0]);
    }
    const declared = lifecycleDescriptorFor(IFActions.BREAKING)!.contracts!.firedAsConsequence!.causes;
    expect([...callers].sort()).toEqual(declared.map((id) => id.replace('if.action.', '')).sort());
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
