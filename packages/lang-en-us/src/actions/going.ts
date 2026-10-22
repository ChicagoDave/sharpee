/**
 * English language content for the going action
 */

export const goingLanguage = {
  actionId: 'if.action.going',
  
  patterns: [
    'go [direction]',
    '[direction]',
    'walk [direction]',
    'head [direction]',
    'move [direction]',
    'travel [direction]'
  ],
  
  messages: {
    'room_description': "{name}\n{verbatim:description}",
    'contents_list': "{You} can {see} {items} here.",
    'no_exit': "{You} {can't} go that way.",
    'no_exit_that_way': "{You} {can't} go that way.",
    'door_closed': "{capitalize the door} {verb:is door} closed.",
    'door_locked': "{capitalize the door} {verb:is door} locked.",
    'too_dark': "It is pitch dark. {You} {be} likely to be eaten by a grue.",
    'moved': "{You} {go} {direction:direction}.",
    'cant_go_through': "{You} {can't} go through {obstacle}.",
    'already_there': "{You're} already there.",
    'nowhere_to_go': "{You}'ll have to say which compass direction to go in.",
    'no_direction': "{You}'ll have to say which direction to go.",
    'not_in_room': "{You're} not in a place where {you} can go anywhere.",
    // Vehicle refusals (ADR-366 D7a): name nothing the author did not, and
    // never explain the world's reason.
    'vehicle_ride': "{You're} riding, not walking.",
    'vehicle_cannot_walk': "{You} {can't} go anywhere from {the vehicle}.",
    'vehicle_cannot_go': "{capitalize the vehicle} {can't} go that way.",
    'vehicle_under_way': "{capitalize the vehicle} is under way.",
    // The vehicle's machine reports (ADR-366 D5e, D7a): a vehicle it moved
    // reaches a room; a vehicle with no way on halts, once.
    'vehicle_arrived': "{capitalize the vehicle} arrives at {the stop}.",
    'vehicle_stopped': "{capitalize the vehicle} comes to a stop.",
    // A watcher in the room a vehicle leaves sees it go.
    'vehicle_departed': "{capitalize the vehicle} pulls away.",
    // ADR-366 D7a: `start` on a one-way line at its end (GH #600).
    'vehicle_at_end': "{capitalize the vehicle} is at the end of its line.",
    // ADR-376 D8, D10: the open model's reports — an unwritten edge, plain
    // because the base serves space as well as water; coming alongside a
    // floating thing.
    'expanse_edge': "{You} can go no farther that way.",
    'vehicle_alongside': "{capitalize the vehicle} comes alongside {the thing}.",
    // ADR-376 D10: a floating thing seen drifting, and seen washing up in a landmark's room.
    'thing_drifted': "{capitalize the thing} drifts.",
    'thing_washed_up': "{capitalize the thing} washes up here.",
    // ADR-375 D5, D6: a sailing vehicle lies in irons; an unwritten edge of a sea under sail.
    'vehicle_in_irons': "{capitalize the vehicle} {verb:is vehicle} in irons.",
    'sailing_edge': "Wind and sea drive {you} back.",
    'no_exits': "There are no obvious exits.",
    'movement_blocked': "{verbatim:message}",
    'destination_not_found': "{You} {can't} go that way.",
    'need_light': "It's too dark to go that way safely.",
    'went': "{You} {go} {direction:direction}.",
    'arrived': "{You} {arrive}.",
    // A witnessed mover (ADR-328 D3/D4): emitted only for a non-player
    // actor, so `{You}` always renders as the mover's name.
    'departs': "{You} {leave} to the {direction:direction}.",
    'arrives': "{You} {enter} from the {direction:direction}.",
    'cant_go': "{You} {can't} go that way.",
    // ADR-376 D9: out of the vehicle in an expanse, the player stays by it.
    'stays_by_vehicle': "{You} {stay} where {you} {are}, by the vehicle."
  },
  
  help: {
    description: 'Move in compass directions or to connected locations.',
    examples: 'go north, n, walk east, head south, go upstairs',
    summary: 'GO/N/S/E/W - Move in compass directions or to connected locations. Example: GO NORTH or N'
  }
};