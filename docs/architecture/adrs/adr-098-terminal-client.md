# ADR-098: Terminal Client Architecture

## Status: PROPOSED

## Date: 2026-01-14

## Context

Sharpee needs a terminal-based client for testing and development. During the Dungeo implementation, we need a fast, reliable way to play-test without browser overhead. The client should:

1. Provide a classic IF experience (status bar, scrolling output, command input)
2. Work cross-platform (Windows, macOS, Linux)
3. Consume `ITextBlock[]` from the text service (same as React client)
4. Support text decorations (bold, italic, colors)
5. Be lightweight and fast to start

This complements ADR-097 (React Client) - terminal for dev/testing, React for distribution.

## Decision

### Package: `@sharpee/client-terminal`

A Node.js terminal application using **blessed** (or **neo-blessed**) for cross-platform terminal UI.

### Why Blessed?

| Library | Pros | Cons |
|---------|------|------|
| **blessed/neo-blessed** | Full ncurses-style widgets, status bars, scrolling, cross-platform | Larger dependency, less maintained |
| **ink** | Modern React-style, good DX | No fixed regions (status bar), streaming-focused |
| **terminal-kit** | Comprehensive | Heavy, complex API |
| **raw ANSI** | No dependencies | Manual cursor management, fragile |

Blessed provides the classic IF layout out of the box: fixed status bar, scrolling log, fixed input line.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Engine + WorldModel + Story + TextService + lang-en-us │
└─────────────────────────────────────────────────────────┘
                          │
                          │ on('turn-complete') → ITextBlock[]
                          ▼
┌─────────────────────────────────────────────────────────┐
│  @sharpee/client-terminal                               │
│  ┌─────────────────────────────────────────────────────┐│
│  │ blessed.screen                                      ││
│  │  ├─ StatusBar (blessed.box, top: 0, height: 1)     ││
│  │  ├─ Transcript (blessed.log, scrollable)           ││
│  │  └─ InputLine (blessed.textbox, bottom: 0)         ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Screen Layout

```
┌─────────────────────────────────────────────────────────┐
│ West of House                              Score: 0/350 │ ← StatusBar (fixed)
├─────────────────────────────────────────────────────────┤
│ You are standing in an open field west of a white       │
│ house, with a boarded front door.                       │
│                                                         │
│ You can see a small mailbox here.                       │ ← Transcript (scrolls)
│                                                         │
│ > open mailbox                                          │
│ Opening the small mailbox reveals a leaflet.            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ > _                                                     │ ← InputLine (fixed)
└─────────────────────────────────────────────────────────┘
```

## Component Structure

### `TerminalClient`

Main class that manages the blessed screen and engine communication.

```typescript
import blessed from 'neo-blessed';
import { IGameEngine, ITextBlock } from '@sharpee/core';

interface TerminalClientConfig {
  /** Show score in status bar */
  showScore?: boolean;
  /** Show turns in status bar */
  showTurns?: boolean;
  /** Color theme */
  theme?: 'classic' | 'dark' | 'light';
  /** Word wrap width (default: terminal width) */
  wrapWidth?: number;
}

class TerminalClient {
  private screen: blessed.Widgets.Screen;
  private statusBar: blessed.Widgets.BoxElement;
  private transcript: blessed.Widgets.Log;
  private inputLine: blessed.Widgets.TextboxElement;
  private engine: IGameEngine;
  private commandHistory: string[] = [];
  private historyIndex = -1;

  constructor(engine: IGameEngine, config?: TerminalClientConfig) {
    this.engine = engine;
    this.initScreen();
    this.initWidgets(config);
    this.bindEvents();
  }

  private initScreen(): void {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Sharpee Interactive Fiction',
      cursor: {
        artificial: true,
        shape: 'line',
        blink: true,
        color: null
      }
    });

    // Quit on Escape or Ctrl-C
    this.screen.key(['escape', 'C-c'], () => {
      return process.exit(0);
    });
  }

  private initWidgets(config?: TerminalClientConfig): void {
    // Status bar - fixed at top
    this.statusBar = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 1,
      tags: true,
      style: {
        fg: 'white',
        bg: 'blue'
      }
    });

    // Transcript - scrollable middle section
    this.transcript = blessed.log({
      parent: this.screen,
      top: 1,
      left: 0,
      width: '100%',
      height: '100%-3',
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      scrollbar: {
        ch: ' ',
        track: { bg: 'gray' },
        style: { bg: 'white' }
      },
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Input line - fixed at bottom
    this.inputLine = blessed.textbox({
      parent: this.screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      inputOnFocus: true,
      style: {
        fg: 'white',
        bg: 'black'
      }
    });

    // Separator above input
    blessed.line({
      parent: this.screen,
      bottom: 1,
      left: 0,
      width: '100%',
      orientation: 'horizontal',
      style: { fg: 'gray' }
    });
  }

  private bindEvents(): void {
    // Engine events
    this.engine.on('turn-complete', (blocks: ITextBlock[]) => {
      this.renderBlocks(blocks);
    });

    // Input submission
    this.inputLine.on('submit', (value: string) => {
      if (value.trim()) {
        this.commandHistory.push(value);
        this.historyIndex = this.commandHistory.length;
        this.transcript.log(`{bold}>{/bold} ${value}`);
        this.engine.submitCommand(value);
      }
      this.inputLine.clearValue();
      this.inputLine.focus();
      this.screen.render();
    });

    // Command history navigation
    this.inputLine.key('up', () => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.inputLine.setValue(this.commandHistory[this.historyIndex]);
        this.screen.render();
      }
    });

    this.inputLine.key('down', () => {
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.inputLine.setValue(this.commandHistory[this.historyIndex]);
      } else {
        this.historyIndex = this.commandHistory.length;
        this.inputLine.clearValue();
      }
      this.screen.render();
    });
  }

  start(): void {
    this.inputLine.focus();
    this.engine.start();
    this.screen.render();
  }
}
```

### Block Rendering

```typescript
private renderBlocks(blocks: ITextBlock[]): void {
  for (const block of blocks) {
    if (block.key.startsWith('status.')) {
      this.updateStatusBar(block);
    } else {
      this.appendToTranscript(block);
    }
  }
  this.screen.render();
}

private updateStatusBar(block: ITextBlock): void {
  // Accumulate status blocks and format
  const room = this.getStatusValue('status.room');
  const score = this.getStatusValue('status.score');
  const turns = this.getStatusValue('status.turns');

  const left = room || '';
  const right = score !== undefined ? `Score: ${score}/${turns || 0}` : '';
  const padding = this.screen.width - left.length - right.length;

  this.statusBar.setContent(
    `{bold}${left}{/bold}${' '.repeat(Math.max(0, padding))}${right}`
  );
}

private appendToTranscript(block: ITextBlock): void {
  const text = this.renderContent(block.content);
  this.transcript.log(text);
}
```

### Content Rendering with Decorations

```typescript
private renderContent(content: ReadonlyArray<TextContent>): string {
  return content.map(item => {
    if (typeof item === 'string') {
      return item;
    }

    // IDecoration - map to blessed tags
    const inner = this.renderContent(item.content);
    return this.applyDecoration(item.type, inner);
  }).join('');
}

private applyDecoration(type: string, text: string): string {
  // Blessed uses {tag}text{/tag} syntax
  switch (type) {
    case 'em':
      return `{italic}${text}{/italic}`;
    case 'strong':
      return `{bold}${text}{/bold}`;
    case 'item':
      return `{cyan-fg}${text}{/cyan-fg}`;
    case 'room':
      return `{yellow-fg}${text}{/yellow-fg}`;
    case 'npc':
      return `{magenta-fg}${text}{/magenta-fg}`;
    case 'command':
      return `{green-fg}${text}{/green-fg}`;
    case 'direction':
      return `{white-fg}{bold}${text}{/bold}{/white-fg}`;
    case 'error':
      return `{red-fg}${text}{/red-fg}`;
    case 'underline':
      return `{underline}${text}{/underline}`;
    default:
      // Story-defined decorations - check for color hints
      if (type.includes('.')) {
        // e.g., 'photopia.red' - extract color if possible
        return text;
      }
      return text;
  }
}
```

## Entry Point

### CLI Usage

```bash
# Run dungeo in terminal
node packages/client-terminal/dist/cli.js stories/dungeo

# Or via npm script
pnpm --filter @sharpee/client-terminal start stories/dungeo
```

### CLI Implementation

```typescript
#!/usr/bin/env node
import { TerminalClient } from './terminal-client';
import { loadStory } from './loader';

const storyPath = process.argv[2];
if (!storyPath) {
  console.error('Usage: sharpee-terminal <story-path>');
  process.exit(1);
}

const engine = loadStory(storyPath);
const client = new TerminalClient(engine);
client.start();
```

## Features

### Command History

- Up/Down arrows navigate through previous commands
- History persists for session duration
- Optional: Save history to file between sessions

### Scrollback

- PageUp/PageDown scroll transcript
- Mouse wheel scrolling (if terminal supports)
- Scrollbar indicator

### Word Wrap

- Automatic word wrap at terminal width
- Respects terminal resize

### Debug Mode

```typescript
// Toggle with /debug command
private debugMode = false;

private handleMetaCommand(cmd: string): boolean {
  if (cmd === '/debug') {
    this.debugMode = !this.debugMode;
    this.transcript.log(`{gray-fg}Debug mode: ${this.debugMode ? 'on' : 'off'}{/gray-fg}`);
    return true;
  }
  // ... other meta commands
  return false;
}
```

### Save/Restore

```typescript
// /save and /restore commands
private handleSave(): void {
  const state = this.engine.saveState();
  const filename = `save-${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(state));
  this.transcript.log(`{green-fg}Game saved to ${filename}{/green-fg}`);
}
```

## Color Themes

### Classic (Default)

```typescript
const classicTheme = {
  statusBar: { fg: 'white', bg: 'blue' },
  transcript: { fg: 'white', bg: 'black' },
  input: { fg: 'white', bg: 'black' },
  item: 'cyan',
  room: 'yellow',
  npc: 'magenta',
  error: 'red'
};
```

### Dark

```typescript
const darkTheme = {
  statusBar: { fg: 'gray', bg: 'black' },
  transcript: { fg: 'gray', bg: 'black' },
  input: { fg: 'white', bg: 'black' },
  item: '#5599cc',
  room: '#cc9955',
  npc: '#9955cc',
  error: '#cc5555'
};
```

## Cross-Platform Considerations

### Windows

- Windows Terminal and PowerShell support ANSI
- Legacy cmd.exe may need `blessed` fallback modes
- Neo-blessed handles most edge cases

### macOS/Linux

- Full support for all features
- Terminal.app, iTerm2, GNOME Terminal all work
- 256-color and true-color support where available

### SSH/Remote

- Works over SSH connections
- Handles terminal resize events
- Graceful degradation for limited terminals

## Integration with Transcript Tester

The terminal client shares infrastructure with the transcript tester:

```typescript
// Shared story loading
import { loadStory } from '@sharpee/transcript-tester';

// Terminal client adds UI layer
const engine = loadStory('stories/dungeo');
const client = new TerminalClient(engine);
```

## Implementation Plan

### Phase 1: Core Client

1. Create `@sharpee/client-terminal` package
2. Implement blessed screen setup
3. Implement StatusBar, Transcript, InputLine widgets
4. Wire to engine events

### Phase 2: Text Rendering

1. Implement `renderContent()` with decoration support
2. Map decorations to blessed tags
3. Handle word wrap
4. Test with various block types

### Phase 3: Polish

1. Command history (up/down arrows)
2. Scrollback (PageUp/PageDown)
3. Meta commands (/debug, /save, /restore, /quit)
4. Color themes

### Phase 4: Integration

1. Create CLI entry point
2. Add to build scripts
3. Test with dungeo story
4. Document usage

## Consequences

### Positive

- Fast startup for testing (no browser)
- Classic IF aesthetic
- Works in any terminal
- Same event model as React client
- Good for development workflow

### Negative

- Another dependency (blessed)
- blessed/neo-blessed maintenance is sporadic
- Limited styling compared to web

### Neutral

- Can coexist with React client
- Different UX from web version
- Terminal capabilities vary

## Alternatives Considered

### Pure ANSI Escape Codes

- Pros: No dependencies, full control
- Cons: Significant implementation effort, cross-platform fragility
- Rejected: Too much low-level work for testing tool

### Ink (React for CLI)

- Pros: Familiar React patterns, modern
- Cons: No fixed regions (status bar), streaming model
- Rejected: Doesn't match IF layout requirements

### xterm.js in Electron

- Pros: Full VT100 emulation
- Cons: Requires Electron, heavier than native terminal
- Rejected: Defeats purpose of lightweight terminal client

### Web-based Terminal (ttyd, gotty)

- Pros: Accessible from any browser
- Cons: Server requirement, latency
- Rejected: Adds infrastructure complexity

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | Defines ITextBlock structure this client consumes |
| ADR-097 | React client - complementary, shares block model |
| ADR-091 | Defines decoration types we render |

## References

- [blessed documentation](https://github.com/chjj/blessed)
- [neo-blessed](https://github.com/embark-framework/neo-blessed) (maintained fork)
- [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- Infocom interpreter layout conventions
