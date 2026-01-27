/**
 * Balloon State Trait
 *
 * Trait for tracking the hot air balloon's state in the volcano region.
 * Used by the balloon entity to persist state through checkpoint save/restore.
 *
 * Replaces the anti-pattern of (balloon as any).balloonState = {...}.
 * This trait persists through checkpoint save/restore, unlike custom properties.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

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
 * Configuration for the balloon state trait
 */
export interface BalloonStateTraitConfig {
  /** Current position in the volcano shaft */
  position: BalloonPosition;
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
 * - Position in the volcano shaft (ground, mid-air, ledge)
 * - Tether state (tied to hook or free)
 * - Burning object providing heat
 * - Daemon enabled state
 *
 * The balloon daemon and handlers check this trait to determine
 * movement behavior and operational state.
 */
export class BalloonStateTrait implements ITrait {
  static readonly type = 'dungeo.trait.balloon_state' as const;

  readonly type = BalloonStateTrait.type;

  /** Current position in the volcano shaft */
  position: BalloonPosition;

  /** Which hook the balloon is tied to, or null if untethered */
  tetheredTo: 'hook1' | 'hook2' | null;

  /** ID of the burning object in the receptacle, or null */
  burningObject: string | null;

  /** Whether the balloon movement daemon is enabled */
  daemonEnabled: boolean;

  constructor(config: BalloonStateTraitConfig) {
    this.position = config.position;
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
