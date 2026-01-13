# ADR-097: React Client Architecture

## Status: ACCEPTED

## Date: 2026-01-13

## Context

Sharpee needs a React-based client for web and Electron deployment. The client must:

1. Consume `ITextBlock[]` from the text service
2. Render blocks to appropriate UI regions
3. Handle user input
4. Support author-defined styling (Photopia colors)
5. Work in both browser and Electron contexts

This is a greenfield implementation replacing the prototype in `@sharpee/text-service-browser`.

## Decision

### Package: `@sharpee/client-react`

A React application/library that renders Sharpee games.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  {game}.js (bundled)                                    │
│  Engine + WorldModel + Story + TextService + lang-en-us │
└─────────────────────────────────────────────────────────┘
                          │
                          │ on('turn-complete') → ITextBlock[]
                          ▼
┌─────────────────────────────────────────────────────────┐
│  @sharpee/client-react                                  │
│  ┌─────────────────────────────────────────────────────┐│
│  │ <Game>                                              ││
│  │  ├─ <StatusBar>     (status.* blocks)              ││
│  │  ├─ <Transcript>    (other blocks, scrollable)     ││
│  │  └─ <CommandInput>  (user input)                   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### No Server Required

The engine bundles to a single JS file and runs entirely in the browser. No API layer, no server-side rendering.

## Component Structure

### `<Game>`

Root component that manages state and engine communication.

```tsx
interface GameProps {
  engine: IGameEngine;
  config?: GameConfig;
}

interface GameConfig {
  /** Story-defined colors */
  colors?: Record<string, string>;
  /** Theme (affects default styles) */
  theme?: 'classic' | 'dark' | 'light';
  /** Show score in status bar */
  showScore?: boolean;
  /** Show turns in status bar */
  showTurns?: boolean;
}

function Game({ engine, config }: GameProps) {
  const [transcript, setTranscript] = useState<ITextBlock[]>([]);
  const [statusBlocks, setStatusBlocks] = useState<ITextBlock[]>([]);

  useEffect(() => {
    engine.on('turn-complete', (blocks: ITextBlock[]) => {
      const status = blocks.filter(b => b.key.startsWith('status.'));
      const other = blocks.filter(b => !b.key.startsWith('status.'));

      setStatusBlocks(status);
      setTranscript(prev => [...prev, ...other]);
    });
  }, [engine]);

  const handleCommand = (input: string) => {
    engine.submitCommand(input);
  };

  return (
    <div className="sharpee-game">
      <StatusBar blocks={statusBlocks} config={config} />
      <Transcript blocks={transcript} config={config} />
      <CommandInput onSubmit={handleCommand} />
    </div>
  );
}
```

### `<StatusBar>`

Renders `status.*` blocks to designated slots.

```tsx
interface StatusBarProps {
  blocks: ITextBlock[];
  config?: GameConfig;
}

function StatusBar({ blocks, config }: StatusBarProps) {
  const getBlock = (key: string) => blocks.find(b => b.key === key);

  return (
    <div className="sharpee-status-bar">
      <div className="status-room">
        {renderContent(getBlock('status.room')?.content)}
      </div>
      {config?.showScore !== false && (
        <div className="status-score">
          Score: {renderContent(getBlock('status.score')?.content)}
        </div>
      )}
      {config?.showTurns !== false && (
        <div className="status-turns">
          Turns: {renderContent(getBlock('status.turns')?.content)}
        </div>
      )}
      {/* Render unknown status.* blocks */}
      {blocks
        .filter(b => !['status.room', 'status.score', 'status.turns'].includes(b.key))
        .map(b => (
          <div key={b.key} className={`status-custom status-${b.key.split('.')[1]}`}>
            {renderContent(b.content)}
          </div>
        ))}
    </div>
  );
}
```

### `<Transcript>`

Scrollable transcript area showing game output.

```tsx
interface TranscriptProps {
  blocks: ITextBlock[];
  config?: GameConfig;
}

function Transcript({ blocks, config }: TranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [blocks]);

  return (
    <div className="sharpee-transcript" ref={scrollRef}>
      {blocks.map((block, i) => (
        <div key={i} className={`block block-${block.key.replace('.', '-')}`}>
          {renderContent(block.content, config)}
        </div>
      ))}
    </div>
  );
}
```

### `<CommandInput>`

Input field for user commands.

```tsx
interface CommandInputProps {
  onSubmit: (command: string) => void;
}

function CommandInput({ onSubmit }: CommandInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSubmit(value);
      setValue('');
    }
  };

  return (
    <form className="sharpee-command-input" onSubmit={handleSubmit}>
      <span className="prompt">&gt;</span>
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
        autoComplete="off"
      />
    </form>
  );
}
```

## Content Rendering

### `renderContent()`

Recursively renders `TextContent[]` to React nodes.

```tsx
function renderContent(
  content: ReadonlyArray<TextContent> | undefined,
  config?: GameConfig
): ReactNode {
  if (!content) return null;

  return content.map((item, i) => {
    if (typeof item === 'string') {
      return <span key={i}>{item}</span>;
    }

    // IDecoration
    return (
      <span
        key={i}
        className={`decoration decoration-${item.type}`}
        style={getDecorationStyle(item.type, config)}
      >
        {renderContent(item.content, config)}
      </span>
    );
  });
}
```

### Decoration Styling

```tsx
function getDecorationStyle(
  type: string,
  config?: GameConfig
): CSSProperties | undefined {
  // Check for story-defined color
  if (config?.colors?.[type]) {
    return { color: config.colors[type] };
  }

  // Core decoration types use CSS classes, no inline style needed
  return undefined;
}
```

### CSS Classes

```css
/* Core decoration types */
.decoration-em { font-style: italic; }
.decoration-strong { font-weight: bold; }
.decoration-item { color: var(--color-item, cyan); }
.decoration-room { color: var(--color-room, goldenrod); }
.decoration-npc { color: var(--color-npc, magenta); }
.decoration-command { color: var(--color-command, limegreen); }
.decoration-direction { color: var(--color-direction, white); }
.decoration-underline { text-decoration: underline; }
.decoration-strikethrough { text-decoration: line-through; }
.decoration-super { vertical-align: super; font-size: 0.8em; }
.decoration-sub { vertical-align: sub; font-size: 0.8em; }

/* Block types */
.block-room-name { font-weight: bold; font-size: 1.2em; }
.block-room-description { margin-bottom: 1em; }
.block-action-result { }
.block-action-blocked { color: var(--color-error, red); }
.block-error { color: var(--color-error, red); }
```

## Story-Defined Colors (Photopia Pattern)

Stories configure custom colors:

```tsx
// In story's React entry point
import { Game } from '@sharpee/client-react';

const config: GameConfig = {
  colors: {
    'photopia.red': '#cc0000',
    'photopia.blue': '#0066cc',
    'photopia.purple': '#660099',
    'photopia.gold': '#ccaa00',
  },
};

<Game engine={engine} config={config} />
```

Templates use story colors:

```
'[photopia.red:The light was red, like always.]'
```

React renders with inline color:

```html
<span class="decoration decoration-photopia-red" style="color: #cc0000">
  The light was red, like always.
</span>
```

## Engine Communication

### Event Model

```typescript
interface IGameEngine {
  /** Listen for turn completion */
  on(event: 'turn-complete', handler: (blocks: ITextBlock[]) => void): void;

  /** Submit a command */
  submitCommand(input: string): void;

  /** Start the game */
  start(): void;
}
```

### One Stream

Everything flows through `turn-complete`:
- Player command results
- Daemon output
- NPC actions
- Ambient messages

Client doesn't distinguish source - just renders blocks.

## Browser vs Electron

Same React components work in both contexts.

### Browser

```tsx
// index.html loads bundled game.js
// React mounts to DOM element
import { createRoot } from 'react-dom/client';
import { Game } from '@sharpee/client-react';
import { createEngine } from './game.js';

const engine = createEngine();
const root = createRoot(document.getElementById('game'));
root.render(<Game engine={engine} />);
```

### Electron

```tsx
// Electron main process loads game
// Renderer process uses same React components
import { Game } from '@sharpee/client-react';

// Engine communicates via IPC or direct import
<Game engine={engine} config={config} />
```

Electron-specific features:
- Native file dialogs for save/restore
- Native menus
- System tray integration (optional)

## Accessibility

### Keyboard Navigation

- Tab focuses command input
- Up/Down arrow for command history
- Escape clears input

### Screen Reader Support

- Semantic HTML structure
- ARIA live regions for new output
- Transcript scrollable with keyboard

```tsx
<div
  className="sharpee-transcript"
  role="log"
  aria-live="polite"
  aria-label="Game transcript"
>
```

### Focus Management

New output doesn't steal focus from command input.

## Implementation

### Phase 1: Core Components

1. Create `@sharpee/client-react` package
2. Implement `<Game>`, `<StatusBar>`, `<Transcript>`, `<CommandInput>`
3. Implement `renderContent()` with decoration support
4. Add base CSS styles

### Phase 2: Configuration

1. Add story color configuration
2. Add theme support
3. Implement status bar slots

### Phase 3: Integration

1. Wire up to bundled engine
2. Test with dungeo story
3. Verify in browser and Electron

## Consequences

### Positive

- Clean separation: engine produces blocks, React renders them
- Story authors can customize colors/styling
- Same components work browser and Electron
- Accessible by default

### Negative

- React dependency for web clients
- Bundle size includes React
- CSS customization requires understanding class structure

### Neutral

- Stories can override component styles
- Multiple themes possible

## Related ADRs

| ADR | Relationship |
|-----|--------------|
| ADR-096 | Defines ITextBlock structure this client consumes |
| ADR-091 | Defines decoration types we render |
| ADR-095 | Defines templates that produce our input |

## References

- FyreVM Channel I/O - inspiration for channel routing
- React documentation
- WAI-ARIA practices for accessibility
