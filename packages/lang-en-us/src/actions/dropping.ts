/**
 * English language content for the dropping action
 */

export const droppingLanguage = {
  actionId: 'if.action.dropping',
  
  patterns: [
    'drop [something]',
    'put down [something]',
    'discard [something]',
    'release [something]',
    'let go of [something]'
  ],
  
  messages: {
    'no_target': "Drop what?",
    'not_held': "{You} aren't holding {the item}.",
    // ADR-376 D9: a thing that does not float, dropped, thrown or moved
    // into an expanse, goes offstage; worded to serve water and space alike.
    'lost_overboard': "{capitalize the item} drifts away.",
    'nothing_to_drop': "{You} aren't carrying anything.",
    'dropped': "Dropped.",
    'still_worn': "{You}'ll need to take off {the item} first.",
    'dropped_in': "{You} {put} {the item} in {the container}.",
    'dropped_on': "{You} {put} {the item} on {the surface}.",
    // Multi-drop label format: rendered without article per IF convention
    'dropped_multi': "{item}: Dropped.",
    'dropped_breaks': "{capitalize the item} {verb:hits item} the floor and {verb:breaks item}.",
    // ADR-376 D10: a floating thing dropped into the expanse floats where it falls.
    'dropped_afloat': "{capitalize the item} {verb:floats item} where {verb:it item} {verb:falls item}."
  },
  
  help: {
    description: 'Drop objects from your inventory.',
    examples: 'drop book, put down lamp, discard key',
    summary: 'DROP/PUT DOWN - Drop objects from your inventory. Example: DROP SWORD'
  }
};