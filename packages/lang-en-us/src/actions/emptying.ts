/**
 * Language content for the emptying action (ADR-370 D3, D6): a container's
 * contents go onto the floor, or into another container or onto a supporter.
 */

export const emptyingLanguage = {
  actionId: 'if.action.emptying',

  patterns: [
    'empty [something]',
    'empty out [something]',
    'empty [something] into [something]',
    'empty [something] onto [something]'
  ],

  messages: {
    // Refusals
    'no_target': "Empty what?",
    'not_a_container': "{You} {can't} empty {the target}.",
    'container_closed': "{capitalize the target} {verb:is target} closed.",
    'already_empty': "{capitalize the target} {verb:is target} already empty.",
    'into_itself': "{You} {can't} empty {the target} into itself.",
    'cant_empty_into': "{You} {can't} empty {the target} into {the destination}.",
    'destination_closed': "{capitalize the destination} {verb:is destination} closed.",

    // Success, and the tail when the destination stops accepting
    'emptied_here': "{You} {empty} {the target} onto the floor: {items}.",
    'emptied_into': "{You} {empty} {the target} into {the destination}: {items}.",
    'destination_full': "{capitalize the destination} {verb:has destination} no room for {the item}."
  },

  help: {
    description: 'Empty a container onto the floor, or into another container.',
    examples: 'empty the bag, empty the box into the crate',
    summary: 'EMPTY - Empty a container onto the floor, or into another container. Example: EMPTY THE BOX INTO THE CRATE'
  }
};
