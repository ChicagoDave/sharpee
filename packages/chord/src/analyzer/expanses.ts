/**
 * expanses.ts — the expanse declarations an analysis pass reads across
 * entities (ADR-376 D2): which blocks are expanses, their size, and the
 * landmark rows that name rooms, so a room's builder can tell it is a
 * landmark and a vehicle's can tell its placement names an expanse.
 *
 * Public interface: collectExpanses(), isExpanseDecl(), ExpanseDecl.
 * Owner context: @sharpee/chord analyzer (language frontend; browser-safe).
 *
 * References:
 * - ADR-376 D2 — `expanse` is a kind with `size:` and a `landmarks` block.
 * - ADR-376 D10 — `drift:`, read by a floating thing's placement check.
 */
import type { CreateDecl, LandmarkRowDecl } from '../ast.js';
import { vehicleLineOf } from './vehicles.js';

export interface ExpanseDecl {
  /** The entity id the block's name derives. */
  readonly id: string;
  readonly name: string;
  readonly decl: CreateDecl;
  /** `size: <w> by <h>`, or null when the line is missing (the builder reports it). */
  readonly size: { width: number; height: number } | null;
  readonly landmarks: readonly LandmarkRowDecl[];
  /** True when the expanse writes `drift:`. */
  readonly drifts: boolean;
}

/** True for a block composed `an expanse`. */
export function isExpanseDecl(decl: CreateDecl): boolean {
  return decl.compositions.some((c) => c.article !== null && c.words.join(' ').toLowerCase() === 'expanse');
}

/**
 * Collect every expanse block's declaration, keyed by the entity id its name
 * derives.
 * @param decls the story's declarations, room groups already expanded
 */
export function collectExpanses(decls: readonly { kind: string }[]): Map<string, ExpanseDecl> {
  const out = new Map<string, ExpanseDecl>();
  for (const decl of decls) {
    if (decl.kind !== 'create') continue;
    const create = decl as CreateDecl;
    if (!isExpanseDecl(create)) continue;
    const id = create.name.words.join('-').toLowerCase();
    const sizeLine = vehicleLineOf(create, 'size');
    out.set(id, {
      id,
      name: create.name.words.join(' '),
      decl: create,
      size: sizeLine ? { width: sizeLine.width, height: sizeLine.height } : null,
      landmarks: create.landmarksBlock?.rows ?? [],
      drifts: vehicleLineOf(create, 'drift') !== undefined,
    });
  }
  return out;
}
