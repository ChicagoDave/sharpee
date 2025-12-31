/**
 * Transcript Runner
 *
 * Executes transcript commands against a loaded story and checks results.
 */

import {
  Transcript,
  TranscriptCommand,
  Assertion,
  CommandResult,
  AssertionResult,
  TranscriptResult,
  RunnerOptions,
  TestEventInfo
} from './types';

/**
 * Interface for the game engine
 */
interface GameEngine {
  executeCommand(input: string): Promise<string> | string;
  getOutput?(): string;
  lastEvents?: Array<{ type: string; data: any }>;
  world?: WorldModel;
}

/**
 * Minimal interface for world model state queries
 */
interface WorldModel {
  getEntityById?(id: string): any;
  getEntity?(id: string): any;
  findEntityByName?(name: string): any;
  getAllEntities?(): any[];
  getLocation?(entityId: string): string | undefined;
  getContents?(containerId: string): any[];
}

/**
 * Run a single transcript against an engine
 */
export async function runTranscript(
  transcript: Transcript,
  engine: GameEngine,
  options: RunnerOptions = {}
): Promise<TranscriptResult> {
  const startTime = Date.now();
  const results: CommandResult[] = [];

  for (const command of transcript.commands) {
    const result = await runCommand(command, engine, options);
    results.push(result);

    if (options.stopOnFailure && !result.passed && !result.expectedFailure && !result.skipped) {
      break;
    }
  }

  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed && !r.expectedFailure && !r.skipped).length;
  const expectedFailures = results.filter(r => r.expectedFailure).length;
  const skipped = results.filter(r => r.skipped).length;

  return {
    transcript,
    commands: results,
    passed,
    failed,
    expectedFailures,
    skipped,
    duration: Date.now() - startTime
  };
}

/**
 * Run a single command and check assertions
 */
async function runCommand(
  command: TranscriptCommand,
  engine: GameEngine,
  options: RunnerOptions
): Promise<CommandResult> {
  // Check for skip/todo first
  const skipAssertion = command.assertions.find(a => a.type === 'skip' || a.type === 'todo');
  if (skipAssertion) {
    return {
      command,
      actualOutput: '',
      actualEvents: [],
      passed: true,
      expectedFailure: false,
      skipped: true,
      assertionResults: [{
        assertion: skipAssertion,
        passed: true,
        message: skipAssertion.reason || 'Skipped'
      }]
    };
  }

  // Execute the command
  let actualOutput: string;
  let actualEvents: TestEventInfo[] = [];
  let error: string | undefined;

  try {
    const result = await engine.executeCommand(command.input);
    actualOutput = typeof result === 'string' ? result : (engine.getOutput?.() || '');

    // Capture events from the engine
    if (engine.lastEvents) {
      actualEvents = engine.lastEvents.map(e => ({
        type: e.type,
        data: e.data || {}
      }));
    }
  } catch (e) {
    actualOutput = '';
    error = e instanceof Error ? e.message : String(e);
  }

  // Normalize output for comparison
  const normalizedActual = normalizeOutput(actualOutput);
  const normalizedExpected = normalizeOutput(command.expectedOutput.join('\n'));

  // Check all assertions
  const assertionResults: AssertionResult[] = [];
  let allPassed = true;

  for (const assertion of command.assertions) {
    const result = checkAssertion(assertion, normalizedActual, normalizedExpected, actualEvents, engine.world);
    assertionResults.push(result);
    if (!result.passed) {
      allPassed = false;
    }
  }

  // Check for expected failure
  const failAssertion = command.assertions.find(a => a.type === 'fail');
  const expectedFailure = failAssertion !== undefined;

  // For [FAIL] assertions, invert the logic
  if (expectedFailure) {
    return {
      command,
      actualOutput,
      actualEvents,
      passed: !allPassed,  // Pass if assertions failed (as expected)
      expectedFailure: true,
      skipped: false,
      assertionResults,
      error
    };
  }

  return {
    command,
    actualOutput,
    actualEvents,
    passed: allPassed && !error,
    expectedFailure: false,
    skipped: false,
    assertionResults,
    error
  };
}

/**
 * Check a single assertion against actual output, events, and world state
 */
function checkAssertion(
  assertion: Assertion,
  actualOutput: string,
  expectedOutput: string,
  events: TestEventInfo[],
  world?: WorldModel
): AssertionResult {
  switch (assertion.type) {
    case 'ok':
      // Exact match (after normalization)
      const matches = actualOutput === expectedOutput;
      return {
        assertion,
        passed: matches,
        message: matches ? undefined : `Output did not match expected`
      };

    case 'ok-contains':
      const contains = actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: contains,
        message: contains ? undefined : `Output does not contain "${assertion.value}"`
      };

    case 'ok-not-contains':
      const notContains = !actualOutput.toLowerCase().includes(assertion.value!.toLowerCase());
      return {
        assertion,
        passed: notContains,
        message: notContains ? undefined : `Output should not contain "${assertion.value}"`
      };

    case 'ok-matches':
      const regexMatches = assertion.pattern!.test(actualOutput);
      return {
        assertion,
        passed: regexMatches,
        message: regexMatches ? undefined : `Output does not match pattern ${assertion.pattern}`
      };

    case 'fail':
      // This is handled at the command level
      return {
        assertion,
        passed: false,
        message: assertion.reason
      };

    case 'skip':
    case 'todo':
      return {
        assertion,
        passed: true,
        message: assertion.reason
      };

    case 'event-count': {
      const expected = assertion.eventCount || 0;
      const actual = events.length;
      const countMatches = actual === expected;
      return {
        assertion,
        passed: countMatches,
        message: countMatches ? undefined : `Expected ${expected} events, got ${actual}`
      };
    }

    case 'event-assert': {
      return checkEventAssertion(assertion, events);
    }

    case 'state-assert': {
      return checkStateAssertion(assertion, world);
    }

    default:
      return {
        assertion,
        passed: false,
        message: `Unknown assertion type: ${assertion.type}`
      };
  }
}

/**
 * Check an event assertion (assertTrue/assertFalse for event existence/properties)
 */
function checkEventAssertion(assertion: Assertion, events: TestEventInfo[]): AssertionResult {
  const { assertTrue, eventPosition, eventType, eventData } = assertion;

  // Helper to check if an event matches
  const eventMatches = (event: TestEventInfo): boolean => {
    if (event.type !== eventType) return false;
    if (eventData) {
      for (const [key, value] of Object.entries(eventData)) {
        if (event.data[key] !== value) return false;
      }
    }
    return true;
  };

  let found = false;
  let actualEvent: TestEventInfo | undefined;

  if (eventPosition !== undefined) {
    // Check specific position (1-based)
    const index = eventPosition - 1;
    if (index >= 0 && index < events.length) {
      actualEvent = events[index];
      found = eventMatches(actualEvent);
    }
  } else {
    // Check any position
    actualEvent = events.find(eventMatches);
    found = actualEvent !== undefined;
  }

  // Apply assertTrue/assertFalse logic
  const passed = assertTrue ? found : !found;

  // Build message
  let message: string | undefined;
  if (!passed) {
    if (assertTrue) {
      // Expected to find but didn't
      if (eventPosition !== undefined) {
        const actualAtPos = events[eventPosition - 1];
        if (actualAtPos) {
          message = `Event ${eventPosition}: expected ${eventType}, got ${actualAtPos.type}`;
          if (eventData) {
            message += `. Expected data: ${JSON.stringify(eventData)}, got: ${JSON.stringify(actualAtPos.data)}`;
          }
        } else {
          message = `Event ${eventPosition}: position out of range (${events.length} events total)`;
        }
      } else {
        message = `No event matching ${eventType}`;
        if (eventData) {
          message += ` with ${JSON.stringify(eventData)}`;
        }
        message += `. Events: ${events.map(e => e.type).join(', ')}`;
      }
    } else {
      // Expected NOT to find but did
      message = `Event ${eventType} should not exist but was found`;
      if (eventData) {
        message += ` with matching data ${JSON.stringify(eventData)}`;
      }
    }
  }

  return { assertion, passed, message };
}

/**
 * Check a state assertion against the world model
 */
function checkStateAssertion(assertion: Assertion, world?: WorldModel): AssertionResult {
  const { assertTrue, stateExpression } = assertion;

  if (!world) {
    return {
      assertion,
      passed: false,
      message: 'World model not available for state assertions'
    };
  }

  if (!stateExpression) {
    return {
      assertion,
      passed: false,
      message: 'No state expression provided'
    };
  }

  try {
    const result = evaluateStateExpression(stateExpression, world);
    const passed = assertTrue ? result.matches : !result.matches;

    let message: string | undefined;
    if (!passed) {
      if (assertTrue) {
        message = `State assertion failed: ${stateExpression}. ${result.details || ''}`;
      } else {
        message = `State assertion should be false but was true: ${stateExpression}`;
      }
    }

    return { assertion, passed, message };
  } catch (e) {
    return {
      assertion,
      passed: false,
      message: `Error evaluating state expression: ${e instanceof Error ? e.message : String(e)}`
    };
  }
}

/**
 * Evaluate a state expression against the world model
 * Supports: entity.property = value, entity.property != value,
 *           collection contains item, collection not-contains item
 */
function evaluateStateExpression(
  expression: string,
  world: WorldModel
): { matches: boolean; details?: string } {
  // Parse "entity.property = value" or "entity.property != value"
  const equalityMatch = expression.match(/^(\w+)\.(\w+)\s*(=|!=)\s*(.+)$/);
  if (equalityMatch) {
    const [, entityName, property, operator, expectedValue] = equalityMatch;

    // Find entity by name
    const entity = findEntity(entityName, world);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    // Get property value
    const actualValue = getEntityProperty(entity, property, world);
    const expectedResolved = resolveValue(expectedValue.trim(), world);

    const isEqual = actualValue === expectedResolved ||
                    (actualValue?.id && actualValue.id === expectedResolved) ||
                    (typeof expectedResolved === 'string' && actualValue?.id === expectedResolved);

    if (operator === '=') {
      return {
        matches: isEqual,
        details: isEqual ? undefined : `${entityName}.${property} is "${actualValue?.id || actualValue}", expected "${expectedResolved}"`
      };
    } else {
      return {
        matches: !isEqual,
        details: !isEqual ? undefined : `${entityName}.${property} should not be "${expectedResolved}"`
      };
    }
  }

  // Parse "collection contains item" or "collection not-contains item"
  const containsMatch = expression.match(/^(\w+)\.(\w+)\s+(contains|not-contains)\s+(.+)$/);
  if (containsMatch) {
    const [, entityName, property, operator, itemName] = containsMatch;

    const entity = findEntity(entityName, world);
    if (!entity) {
      return { matches: false, details: `Entity "${entityName}" not found` };
    }

    const collection = getEntityProperty(entity, property, world);
    if (!Array.isArray(collection)) {
      return { matches: false, details: `${entityName}.${property} is not a collection` };
    }

    const item = findEntity(itemName.trim(), world);
    const itemId = item?.id || itemName.trim();
    const hasItem = collection.some((c: any) => c === itemId || c?.id === itemId);

    if (operator === 'contains') {
      return { matches: hasItem, details: hasItem ? undefined : `${entityName}.${property} does not contain "${itemName}"` };
    } else {
      return { matches: !hasItem, details: !hasItem ? undefined : `${entityName}.${property} should not contain "${itemName}"` };
    }
  }

  return { matches: false, details: `Could not parse expression: ${expression}` };
}

/**
 * Find an entity by name in the world model
 */
function findEntity(name: string, world: WorldModel): any {
  // Try findEntityByName first
  if (world.findEntityByName) {
    const entity = world.findEntityByName(name);
    if (entity) return entity;
  }

  // Try getEntity/getEntityById
  if (world.getEntity) {
    const entity = world.getEntity(name);
    if (entity) return entity;
  }
  if (world.getEntityById) {
    const entity = world.getEntityById(name);
    if (entity) return entity;
  }

  // Search all entities by name/alias
  if (world.getAllEntities) {
    const entities = world.getAllEntities();
    for (const entity of entities) {
      if (entity.name === name || entity.id === name) return entity;
      // Check identity trait for aliases
      const identity = entity.traits?.identity || entity.get?.('IdentityTrait');
      if (identity) {
        if (identity.name === name) return entity;
        if (identity.aliases?.includes(name)) return entity;
      }
    }
  }

  return null;
}

/**
 * Get a property from an entity (world needed for spatial queries)
 */
function getEntityProperty(entity: any, property: string, world?: WorldModel): any {
  // Special handling for location - use world.getLocation()
  if (property === 'location') {
    if (world?.getLocation) {
      return world.getLocation(entity.id);
    }
    return entity.location || entity.containerId;
  }

  // Special handling for contents - use world.getContents()
  if (property === 'contents' || property === 'inventory') {
    if (world?.getContents) {
      return world.getContents(entity.id);
    }
    return entity.contents || entity.inventory || [];
  }

  // Direct property access
  if (property in entity) {
    return entity[property];
  }

  // Check traits
  if (entity.traits && property in entity.traits) {
    return entity.traits[property];
  }

  return undefined;
}

/**
 * Resolve a value (could be entity name, literal, etc.)
 */
function resolveValue(value: string, world: WorldModel): any {
  // Check if it's an entity reference
  const entity = findEntity(value, world);
  if (entity) {
    return entity.id;
  }

  // Check for special values
  if (value === 'null' || value === 'undefined' || value === 'nowhere') {
    return undefined;
  }
  if (value === 'true') return true;
  if (value === 'false') return false;

  // Return as string
  return value;
}

/**
 * Normalize output for comparison
 * - Trim whitespace
 * - Normalize line endings
 * - Collapse multiple spaces
 */
function normalizeOutput(output: string): string {
  return output
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}
