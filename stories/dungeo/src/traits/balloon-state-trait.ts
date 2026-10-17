/**
 * Balloon State Trait
 *
 * Trait for tracking the hot air balloon's state in the volcano region.
 * Used by the balloon entity to persist state through checkpoint save/restore.
 *
 * Replaces the anti-pattern of balloon['balloonState'] = {...}.
 * This trait persists through checkpoint save/restore, unlike custom properties.
 */

import { type IFEntity, type ITrait, type ITraitConstructor, type WorldModel, VehicleTrait } from '@sharpee/world-model';

/**
 * Balloon position in the volcano shaft
 */
export type BalloonPosition =
  | 'vlbot'   // Volcano Bottom - ground level
  | 'vair1'   // Mid-air 1 - just above bottom
  | 'vair2'   // Mid-air 2 - near Narrow Ledge
  | 'vair3'   // Mid-air 3
  | 'vair4'   // Mid-air 4 - TOP, crash zone!
  | 'ledg2'   // Ledge 2 - dockable, W to Narrow Ledge
  | 'ledg3'   // Ledge 3 - dockable
  | 'ledg4';  // Ledge 4 - dockable, W to Wide Ledge

/**
 * The balloon's positions in the order its line lists their rooms: the
 * line's stops are written in this order, so a position names a stop by
 * index and no position is stored anywhere.
 */
export const BALLOON_POSITIONS: readonly BalloonPosition[] = [
  'vlbot', 'vair1', 'vair2', 'vair3', 'vair4', 'ledg2', 'ledg3', 'ledg4'
];

function balloonStops(balloon: IFEntity): string[] | undefined {
  const model = balloon.get(VehicleTrait)?.model;
  return model?.kind === 'line' ? model.stops : undefined;
}

/**
 * The balloon's position, read from its location.
 *
 * @returns the position, or null when the balloon is not at one of its stops
 */
export function balloonPosition(world: WorldModel, balloon: IFEntity): BalloonPosition | null {
  const index = balloonStops(balloon)?.indexOf(world.getLocation(balloon.id) ?? '') ?? -1;
  return index >= 0 ? BALLOON_POSITIONS[index] : null;
}

/**
 * The room id of one of the balloon's positions.
 *
 * @returns the stop's room id, or undefined when the balloon has no line
 */
export function balloonPositionRoom(balloon: IFEntity, position: BalloonPosition): string | undefined {
  return balloonStops(balloon)?.[BALLOON_POSITIONS.indexOf(position)];
}

/**
 * Configuration for the balloon state trait
 */
export interface BalloonStateTraitConfig {
  /** Which hook the balloon is tied to, or null if untethered */
  tetheredTo: 'hook1' | 'hook2' | null;
  /** ID of the burning object in the receptacle, or null */
  burningObject: string | null;
  /** Whether the balloon movement daemon is enabled */
  daemonEnabled: boolean;
}

/**
 * Balloon State Trait
 *
 * Tracks the balloon's:
 * - Tether state (tied to hook or free)
 * - Burning object providing heat
 * - Daemon enabled state
 *
 * Position is the balloon's location on its line (`balloonPosition`).
 * The balloon daemon and handlers check this trait for non-position state.
 */
export class BalloonStateTrait implements ITrait {
  static readonly type = 'dungeo.trait.balloon_state' as const;

  readonly type = BalloonStateTrait.type;

  /** Which hook the balloon is tied to, or null if untethered */
  tetheredTo: 'hook1' | 'hook2' | null;

  /** ID of the burning object in the receptacle, or null */
  burningObject: string | null;

  /** Whether the balloon movement daemon is enabled */
  daemonEnabled: boolean;

  constructor(config: BalloonStateTraitConfig) {
    this.tetheredTo = config.tetheredTo;
    this.burningObject = config.burningObject;
    this.daemonEnabled = config.daemonEnabled;
  }
}

// Ensure the class implements ITraitConstructor
export const BalloonStateTraitConstructor: ITraitConstructor<BalloonStateTrait> = BalloonStateTrait;

/**
 * Check if position is at a dockable ledge
 */
export function isLedgePosition(pos: BalloonPosition): boolean {
  return pos === 'ledg2' || pos === 'ledg3' || pos === 'ledg4';
}

/**
 * Check if position is in mid-air (not ground or ledge)
 */
export function isMidairPosition(pos: BalloonPosition): boolean {
  return pos === 'vair1' || pos === 'vair2' || pos === 'vair3' || pos === 'vair4';
}

/**
 * Get the next position when rising (with heat)
 */
export function nextPositionUp(pos: BalloonPosition): BalloonPosition | null {
  const upMap: Record<BalloonPosition, BalloonPosition | null> = {
    'vlbot': 'vair1',
    'vair1': 'vair2',
    'vair2': 'vair3',
    'vair3': 'vair4',
    'vair4': null,      // Crash!
    'ledg2': 'vair2',
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return upMap[pos];
}

/**
 * Get the next position when falling (no heat)
 */
export function nextPositionDown(pos: BalloonPosition): BalloonPosition | null {
  const downMap: Record<BalloonPosition, BalloonPosition | null> = {
    'vlbot': null,
    'vair1': 'vlbot',
    'vair2': 'vair1',
    'vair3': 'vair2',
    'vair4': 'vair3',
    'ledg2': 'vair2',
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return downMap[pos];
}

/**
 * Convert a ledge position to its corresponding mid-air position
 */
export function ledgeToMidair(pos: BalloonPosition): BalloonPosition {
  const ledgeMap: Record<string, BalloonPosition> = {
    'ledg2': 'vair2',
    'ledg3': 'vair3',
    'ledg4': 'vair4',
  };
  return ledgeMap[pos] || pos;
}
