// jest.phase5.config.js
module.exports = {
  ...require('./jest.config.js'),
  testMatch: [
    '**/tests/unit/traits/actor.test.ts',
    '**/tests/unit/traits/wearable.test.ts',
    '**/tests/unit/traits/readable.test.ts',
    '**/tests/unit/traits/edible.test.ts',
    '**/tests/unit/traits/scenery.test.ts',
    '**/tests/unit/traits/supporter.test.ts',
    '**/tests/unit/traits/light-source.test.ts'
  ]
};
