/**
 * Glacier Trait
 *
 * Tracks the state of the glacier in the Glacier Room.
 * The glacier can be melted by throwing a lit torch at it,
 * revealing the north passage to Volcano View.
 */

import { ITrait, ITraitConstructor } from '@sharpee/world-model';

/**
 * Configuration for the GlacierTrait
 */
export interface GlacierTraitConfig {
  /** Whether the glacier has been melted */
  melted?: boolean;
  /** Room ID to connect north when melted */
  northDestination: string;
  /** Room ID of the glacier room itself */
  glacierRoomId: string;
  /** Room ID where torch ends up after melting */
  torchDestination: string;
}

/**
 * Glacier Trait - tracks glacier state and melting
 */
export class GlacierTrait implements ITrait {
  static readonly type = 'dungeo.trait.glacier';
  readonly type = GlacierTrait.type;

  /** Whether the glacier has been melted */
  melted: boolean;
  /** Room ID to connect north when melted */
  northDestination: string;
  /** Room ID of the glacier room itself */
  glacierRoomId: string;
  /** Room ID where torch ends up after melting */
  torchDestination: string;

  constructor(config: GlacierTraitConfig) {
    this.melted = config.melted ?? false;
    this.northDestination = config.northDestination;
    this.glacierRoomId = config.glacierRoomId;
    this.torchDestination = config.torchDestination;
  }
}

/**
 * Type guard for GlacierTrait
 */
export interface GlacierTraitConstructor extends ITraitConstructor<GlacierTrait> {
  readonly type: 'dungeo.trait.glacier';
}
