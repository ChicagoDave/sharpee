/**
 * Carousel exit trait (ADR-295 computed exits).
 *
 * Declares a room's scrambled exits as data: every statically-exposed
 * direction becomes a computed exit over the declared candidate set while
 * the room is spinning. One trait type serves both carousel rooms — the
 * Round Room (CAROU) and the Low Room (MAGNE) — parameterized by instance
 * data; the shared resolver lives in handlers/carousel-exit-resolver.ts.
 *
 * Public interface: `CarouselExitTrait`, `CarouselExitConfig`.
 * Owner context: dungeo story — carousel/magnet puzzle.
 */

import { ITrait, IComputedExitDeclaration } from '@sharpee/world-model';

export interface CarouselExitConfig {
  /** Room entity ids a scrambled traversal may land in (ADR-295 D3 candidates). */
  candidates: string[];
  /** ADR-293 named point the scramble draw uses (e.g. 'dungeo.low-room.exit'). */
  pointName: string;
  /** Message ids narrated on every scrambled traversal, in order. */
  alwaysMessageIds?: string[];
  /** Additional message ids narrated only when the traversal lands somewhere other than the static destination. */
  redirectedMessageIds?: string[];
  /** Spin gate: the room scrambles while this world state key is true (Low Room: 'dungeo.carousel.active'). */
  spinsWhenStateKeyTrue?: string;
  /** Spin gate: the room scrambles while its RoundRoomTrait.isFixed is false (Round Room). */
  spinsWhenNotFixed?: boolean;
}

export class CarouselExitTrait implements ITrait {
  static readonly type = 'dungeo.trait.carousel_exit';
  readonly type = CarouselExitTrait.type;

  /** ADR-295 D3 overlay declaration: governs every statically-exposed direction. */
  computedExitsAll: IComputedExitDeclaration;
  pointName: string;
  alwaysMessageIds: string[];
  redirectedMessageIds: string[];
  spinsWhenStateKeyTrue?: string;
  spinsWhenNotFixed?: boolean;

  constructor(config: CarouselExitConfig) {
    this.computedExitsAll = { candidates: config.candidates };
    this.pointName = config.pointName;
    this.alwaysMessageIds = config.alwaysMessageIds ?? [];
    this.redirectedMessageIds = config.redirectedMessageIds ?? [];
    this.spinsWhenStateKeyTrue = config.spinsWhenStateKeyTrue;
    this.spinsWhenNotFixed = config.spinsWhenNotFixed;
  }
}
