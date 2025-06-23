/**
 * Quick test to verify imports work
 */

import { createSimpleRuleSystem } from '../../src/rules';

test('Can import and create simple rule system', () => {
  const ruleSystem = createSimpleRuleSystem();
  expect(ruleSystem).toBeDefined();
  expect(typeof ruleSystem.addRule).toBe('function');
  expect(typeof ruleSystem.processEvent).toBe('function');
});
