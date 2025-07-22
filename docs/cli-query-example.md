# CLI Client Query Display Example

This shows how the CLI client would handle query events.

## Normal Command Flow

```
> look
You are in a small room.

> quit
Are you sure you want to quit?

1. Quit
2. Return to game

> 2
Quit cancelled.

> 
```

## Query with Unsaved Progress

```
> quit
You have unsaved progress. What would you like to do?

1. Save and quit
2. Quit without saving  
3. Return to game

> 1
Game saved.

Thanks for playing!

Final score: 42 out of 100
Moves: 20
```

## Invalid Response Handling

```
> quit
Are you sure you want to quit?

1. Quit
2. Return to game

> maybe
Please choose a number 1-2 or type part of an option.

> yes
Invalid response. Please answer yes or no. You can also use y/n

> 1
Thanks for playing!

Final score: 10 out of 100
Moves: 5
```

## Implementation Notes

The CLI client would:
1. Listen for `text:output` events from the engine
2. Display the text to the user
3. Show a modified prompt when a query is pending (e.g., `? ` instead of `> `)
4. Send user input back to the engine
5. The engine handles routing to the query manager

```typescript
// Example CLI client code
class CLIClient {
  private engine: GameEngine;
  private rl: readline.Interface;
  
  constructor(engine: GameEngine) {
    this.engine = engine;
    
    // Listen for text output
    engine.on('text:output', (text) => {
      console.log(text);
      this.prompt();
    });
    
    // Listen for query state changes
    engine.on('event', (event) => {
      if (event.type === 'query.pending') {
        // Change prompt to indicate query mode
        this.rl.setPrompt('? ');
      } else if (event.type === 'query.answered' || 
                 event.type === 'query.cancelled') {
        // Return to normal prompt
        this.rl.setPrompt('> ');
      }
    });
  }
  
  prompt() {
    this.rl.prompt();
  }
  
  async handleInput(input: string) {
    await this.engine.executeTurn(input);
  }
}
```
