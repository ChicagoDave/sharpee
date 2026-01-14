/**
 * Language content for touching action
 */

export const touchingLanguage = {
  actionId: 'if.action.touching',
  
  patterns: [
    'touch [something]',
    'feel [something]',
    'pat [something]',
    'stroke [something]',
    'poke [something]',
    'prod [something]'
  ],
  
  messages: {
    // Error messages
    'no_target': "Touch what?",
    'not_visible': "{You} {can't} see {target} to touch it.",
    'not_reachable': "{You} {can't} reach {target}.",

    // Success messages - textures
    'feels_normal': "{target} feels as {you}'d expect.",
    'feels_warm': "{target} feels warm to the touch.",
    'feels_hot': "{target} is hot! {You} {pull} {your} hand back quickly.",
    'feels_cold': "{target} feels cold.",
    'feels_soft': "{target} feels soft.",
    'feels_hard': "{target} feels hard and solid.",
    'feels_smooth': "{target} feels smooth.",
    'feels_rough': "{target} feels rough.",
    'feels_wet': "{target} feels damp.",

    // Success messages - specific objects
    'device_vibrating': "{target} is vibrating slightly.",
    'immovable_object': "{target} is solid and immovable.",
    'liquid_container': "{You} {feel} liquid sloshing inside {target}.",

    // Generic touching
    'touched': "{You} {touch} {target}.",
    'touched_gently': "{You} gently {touch} {target}.",
    'poked': "{You} {poke} {target}.",
    'prodded': "{You} {prod} {target}.",
    'patted': "{You} {pat} {target}.",
    'stroked': "{You} {stroke} {target}."
  },
  
  help: {
    description: 'Touch objects to discover their texture, temperature, or other tactile properties.',
    examples: 'touch wall, feel fabric, pat dog, poke button',
    summary: 'TOUCH/FEEL - Touch objects to discover their texture, temperature, or other tactile properties. Example: TOUCH STONE'
  }
};
