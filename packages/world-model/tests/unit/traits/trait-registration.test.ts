/**
 * Pins trait registration as a whole: every TraitType key has an
 * implementation whose class reports that type, and every trait class and
 * behavior under src/traits is reachable through both barrels. A new trait
 * added in fewer than all of those places fails here by name, instead of
 * surfacing later as an entity that will not deserialize or a symbol a
 * consumer cannot import.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/world-model — traits.
 *
 * References:
 *   ADR-338 D4 — trait registration is pinned by a test, not a checklist.
 *   ADR-218 — root-barrel discipline; consumers import from the package root.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as rootBarrel from '../../../src';
import * as traitsBarrel from '../../../src/traits';
import { TraitType, TRAIT_IMPLEMENTATIONS } from '../../../src';

/** The three TraitCategory constants that live beside the trait keys. */
const CATEGORY_CONSTANTS = new Set(['STANDARD', 'INTERACTIVE', 'ADVANCED']);

const TRAITS_DIR = fileURLToPath(new URL('../../../src/traits', import.meta.url));

/** Every *Trait.ts and *Behavior.ts under src/traits, as "<dir>/<file>". */
function traitSourceFiles(dir: string, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...traitSourceFiles(full, `${prefix}${entry}/`));
    } else if (/(Trait|Behavior)\.ts$/.test(entry)) {
      found.push(`${prefix}${entry}`);
    }
  }
  return found.sort();
}

/** A source file's exported classes and behavior objects, by export name. */
async function exportedValuesOf(file: string): Promise<Array<[string, unknown]>> {
  const mod = (await import(join(TRAITS_DIR, file))) as Record<string, unknown>;
  return Object.entries(mod).filter(([, value]) => typeof value === 'function' || (typeof value === 'object' && value !== null));
}

describe('trait registration (ADR-338 D4)', () => {
  const traitKeys = Object.entries(TraitType).filter(([key]) => !CATEGORY_CONSTANTS.has(key));

  it('every TraitType key has an implementation whose class reports that type', () => {
    const missing: string[] = [];
    const mismatched: string[] = [];
    for (const [key, value] of traitKeys) {
      const ctor = TRAIT_IMPLEMENTATIONS[value as TraitType];
      if (!ctor) {
        missing.push(`TraitType.${key} ('${value}')`);
        continue;
      }
      if (ctor.type !== value) {
        mismatched.push(`TraitType.${key}: ${ctor.name}.type is '${String(ctor.type)}', not '${value}'`);
      }
    }
    expect(missing, `no TRAIT_IMPLEMENTATIONS entry for: ${missing.join(', ')}`).toEqual([]);
    expect(mismatched, mismatched.join('; ')).toEqual([]);
  });

  it('every implementation class is exported by the root barrel and the traits barrel', () => {
    const rootValues = new Set(Object.values(rootBarrel));
    const traitValues = new Set(Object.values(traitsBarrel));
    const notInRoot: string[] = [];
    const notInTraits: string[] = [];
    for (const [key, value] of traitKeys) {
      const ctor = TRAIT_IMPLEMENTATIONS[value as TraitType];
      if (!ctor) continue;
      if (!rootValues.has(ctor)) notInRoot.push(`${ctor.name} (TraitType.${key})`);
      if (!traitValues.has(ctor)) notInTraits.push(`${ctor.name} (TraitType.${key})`);
    }
    expect(notInRoot, `not exported from src/index.ts: ${notInRoot.join(', ')}`).toEqual([]);
    expect(notInTraits, `not exported from src/traits/index.ts: ${notInTraits.join(', ')}`).toEqual([]);
  });

  it('every class and behavior a trait source file exports is exported by both barrels', async () => {
    const files = traitSourceFiles(TRAITS_DIR);
    expect(files.length).toBeGreaterThan(0);
    const rootValues = new Set(Object.values(rootBarrel));
    const traitValues = new Set(Object.values(traitsBarrel));
    const notInRoot: string[] = [];
    const notInTraits: string[] = [];
    for (const file of files) {
      for (const [name, value] of await exportedValuesOf(file)) {
        if (!rootValues.has(value)) notInRoot.push(`${name} (${file})`);
        if (!traitValues.has(value)) notInTraits.push(`${name} (${file})`);
      }
    }
    expect(notInRoot, `not exported from src/index.ts: ${notInRoot.join(', ')}`).toEqual([]);
    expect(notInTraits, `not exported from src/traits/index.ts: ${notInTraits.join(', ')}`).toEqual([]);
  });
});
