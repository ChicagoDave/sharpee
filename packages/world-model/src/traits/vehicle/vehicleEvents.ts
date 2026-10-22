/**
 * Vehicle events — the facts a vehicle's machine, an expanse's drift and
 * the driving statements record, and the stock lines they render through.
 *
 * One home below every emitter and reader: the vehicle machine (plugin-
 * state-machine), going and the vehicle actions (stdlib), the story
 * loader's driving statements and its `when <thing> moves` clauses. None of
 * those may depend on another, and all depend on world-model, which owns
 * the vehicle domain. Every type is a past-tense fact (alignment findings
 * F4, D13; David's Q11 d answer).
 *
 * Public interface: `VEHICLE_EVENT_TYPES`, `VehicleEventType`,
 * `VEHICLE_REPORT_MESSAGES`.
 * Owner context: world-model — vehicles (ADR-366, ADR-375, ADR-376).
 */

/** The semantic-event types of the vehicle domain. */
export const VEHICLE_EVENT_TYPES = {
  /** A vehicle reached a room (ADR-366 D5e). */
  ARRIVED: 'if.event.vehicle_arrived',
  /** A vehicle left the room it was in (Q5). */
  DEPARTED: 'if.event.vehicle_departed',
  /** A vehicle ran out of way and halted. */
  STOPPED: 'if.event.vehicle_stopped',
  /** An open vehicle stopped alongside a floating thing (ADR-376 D10). */
  ALONGSIDE: 'if.event.vehicle_alongside',
  /** An open vehicle reached an edge of its expanse (ADR-376 D8). */
  EDGE_REACHED: 'if.event.expanse_edge_reached',
  /** A sailing vehicle was caught in irons (ADR-375 D5), once. */
  CAUGHT_IN_IRONS: 'if.event.vehicle_caught_in_irons',
  /** A line vehicle reached the end of its line on `send` (ADR-366 D5f). */
  REACHED_END: 'if.event.vehicle_reached_end',
  /** A floating thing drifted one cell (ADR-376 D10; D11, David's answer a). */
  DRIFTED: 'if.event.drifted',
  /** A floating thing drifted into a landmark and washed up in its room (ADR-376 D10). */
  WASHED_UP: 'if.event.washed_up',
} as const;

export type VehicleEventType = typeof VEHICLE_EVENT_TYPES[keyof typeof VEHICLE_EVENT_TYPES];

/**
 * The stock lines vehicle reports render through (ADR-366 D7a, ADR-375,
 * ADR-376 D8, D10). They live in going's message set; every emitter and
 * every action that words the same fact reads them here, so none spells a
 * literal and lang holds each line once.
 */
export const VEHICLE_REPORT_MESSAGES = {
  ARRIVED: 'if.action.going.vehicle_arrived',
  DEPARTED: 'if.action.going.vehicle_departed',
  STOPPED: 'if.action.going.vehicle_stopped',
  ALONGSIDE: 'if.action.going.vehicle_alongside',
  /** The stock line for an edge with no phrase: steering, setting a course and the machine alike. */
  EXPANSE_EDGE: 'if.action.going.expanse_edge',
  /** ADR-375 D6: the unwritten edge of a sea under sail is weather. */
  SAILING_EDGE: 'if.action.going.sailing_edge',
  IN_IRONS: 'if.action.going.vehicle_in_irons',
  AT_END: 'if.action.going.vehicle_at_end',
  /** Going's line for an authored refusal, rendering the phrase verbatim (an edge's phrase). */
  MOVEMENT_BLOCKED: 'if.action.going.movement_blocked',
  DRIFTED: 'if.action.going.thing_drifted',
  WASHED_UP: 'if.action.going.thing_washed_up',
} as const;
