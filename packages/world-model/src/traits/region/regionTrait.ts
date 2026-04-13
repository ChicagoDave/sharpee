/**
 * Region trait for geographic groupings of rooms (ADR-149).
 *
 * Entities with this trait represent named spatial regions. Rooms declare
 * membership via RoomTrait.regionId. Regions can be nested via parentRegionId.
 *
 * Public interface: RegionTrait, IRegionData.
 * Owner context: @sharpee/world-model — traits / spatial
 */

import { ITrait } from '../trait';
import { TraitType } from '../trait-types';

/**
 * Data interface for RegionTrait construction.
 *
 * @param name - Human-readable region name (required).
 * @param parentRegionId - Optional parent region entity ID for nesting.
 * @param ambientSound - Region-wide ambient sound propagated to rooms.
 * @param ambientSmell - Region-wide ambient smell propagated to rooms.
 * @param defaultDark - Whether rooms in this region default to dark.
 */
export interface IRegionData {
  name: string;
  parentRegionId?: string;
  ambientSound?: string;
  ambientSmell?: string;
  defaultDark?: boolean;
}

/**
 * Marks an entity as a spatial region that groups rooms.
 *
 * Rooms reference their region via `RoomTrait.regionId`. Regions can form
 * a hierarchy through `parentRegionId` — a room in a child region is
 * implicitly in all ancestor regions.
 */
export class RegionTrait implements ITrait, IRegionData {
  static readonly type = TraitType.REGION;
  readonly type = TraitType.REGION;

  /** Human-readable region name. */
  name: string;

  /** Parent region entity ID for nesting (optional). */
  parentRegionId?: string;

  /** Region-wide ambient sound propagated to contained rooms. */
  ambientSound?: string;

  /** Region-wide ambient smell propagated to contained rooms. */
  ambientSmell?: string;

  /** Whether rooms in this region default to dark. */
  defaultDark: boolean;

  constructor(data: IRegionData) {
    this.name = data.name;
    this.parentRegionId = data.parentRegionId;
    this.ambientSound = data.ambientSound;
    this.ambientSmell = data.ambientSmell;
    this.defaultDark = data.defaultDark ?? false;
  }
}
