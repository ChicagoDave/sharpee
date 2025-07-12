/**
 * Fixes for failing engine tests
 */

// 1. Fix for "should handle turn execution errors" test
// The test expects executeTurn(null) to throw, but it's actually catching the error
// and returning an error result instead.

// In game-engine.ts, executeTurn method:
async executeTurn(input: string): Promise<TurnResult> {
  if (!this.running) {
    throw new Error('Engine is not running');
  }

  if (!this.commandExecutor) {
    throw new Error('Engine must have a story set before executing turns');
  }

  // Add null/undefined check that throws
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }

  const turn = this.context.currentTurn;
  this.emit('turn:start', turn, input);

  try {
    // ... rest of the method
  } catch (error: any) {
    this.emit('turn:failed', error as Error, turn);
    throw error;
  }
}

// 2. Fix for "should include timing data when configured" test
// The CommandExecutor needs to return timing data when collectTiming is true

// In command-executor.ts, execute method needs to track timing:
async execute(
  input: string,
  world: WorldModel,
  context: GameContext,
  config: EngineConfig = {}
): Promise<TurnResult> {
  const startTime = Date.now();
  let parseTime = 0;
  let executeTime = 0;

  // ... parsing code ...
  if (config.collectTiming) {
    parseTime = Date.now() - startTime;
  }

  // ... execution code ...
  if (config.collectTiming) {
    executeTime = Date.now() - startTime - parseTime;
  }

  const result: TurnResult = {
    // ... other fields ...
    timing: config.collectTiming ? {
      parsing: parseTime,
      execution: executeTime,
      total: Date.now() - startTime
    } : undefined
  };

  return result;
}

// 3. Fix for "should update vocabulary as player moves" test
// The test is spying on the instance method, but needs to ensure it's called
// after the initial call in createStandardEngine

// 4. Fix for "should handle multi-room world with objects" test
// The ComplexWorldTestStory doesn't implement room connections properly
// Need to add proper exits to rooms

// 5. Fix for "should include action-generated events" test
// The test action is generating events but they might not be making it to the result