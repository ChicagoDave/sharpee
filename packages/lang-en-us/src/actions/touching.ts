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
    'not_visible': "{You} {can't} see {the:target} to touch it.",
    'not_reachable': "{You} {can't} reach {the:target}.",

    // Success messages - textures
    'feels_normal': "{the:cap:target} feels as {you}'d expect.",
    'feels_warm': "{the:cap:target} feels warm to the touch.",
    'feels_hot': "{the:cap:target} is hot! {You} {pull} {your} hand back quickly.",
    'feels_cold': "{the:cap:target} feels cold.",
    'feels_soft': "{the:cap:target} feels soft.",
    'feels_hard': "{the:cap:target} feels hard and solid.",
    'feels_smooth': "{the:cap:target} feels smooth.",
    'feels_rough': "{the:cap:target} feels rough.",
    'feels_wet': "{the:cap:target} feels damp.",

    // Success messages - specific objects
    'device_vibrating': "{the:cap:target} is vibrating slightly.",
    'immovable_object': "{the:cap:target} is solid and immovable.",
    'liquid_container': "{You} {feel} liquid sloshing inside {the:target}.",

    // Generic touching
    'touched': "{You} {touch} {the:target}.",
    'touched_gently': "{You} gently {touch} {the:target}.",
    'poked': "{You} {poke} {the:target}.",
    'prodded': "{You} {prod} {the:target}.",
    'patted': "{You} {pat} {the:target}.",
    'stroked': "{You} {stroke} {the:target}."
  },
  
  help: {
    description: 'Touch objects to discover their texture, temperature, or other tactile properties.',
    examples: 'touch wall, feel fabric, pat dog, poke button',
    summary: 'TOUCH/FEEL - Touch objects to discover their texture, temperature, or other tactile properties. Example: TOUCH STONE'
  }
};
