# Deep Dive: Overlays (Option C)

## Goal

Add an overlay system to Zifmia so stories can declare how they want to be experienced. Dungeo gets the current transcript overlay unchanged. Reflections gets an iMessage-style chat overlay. Both share the same runner, engine integration, save/restore, themes, and preferences infrastructure.

## Architecture Overview

```
ZifmiaRunner
└─ GameProvider            ← unchanged, same state/dispatch for all overlays
   └─ GameShell
      ├─ MenuBar           ← unchanged
      ├─ StatusLine         ← unchanged (hidden for chat overlay via prop)
      └─ OverlaySwitch      ← NEW: reads overlay type, renders appropriate overlay
         ├─ TranscriptOverlay ← current behavior, extracted from GameShell
         └─ ChatOverlay       ← NEW: iMessage-style rendering
```

The key insight: **GameContext stays the same.** Both overlays consume the same `GameState`, `dispatch`, and `executeCommand`. The only difference is how `transcript: TranscriptEntry[]` gets rendered.

## What Changes

### 1. Story declares overlay via `StoryConfig.custom`

No engine changes. `StoryConfig` already has `custom?: Record<string, any>`. The story declares its overlay there:

```typescript
// stories/reflections/src/story.ts
export const story: Story = {
  config: {
    id: 'reflections',
    title: 'Reflections',
    author: 'David Cornelson',
    version: '0.1.0-beta',
    custom: {
      overlay: 'chat',
      characters: {
        thief: {
          name: 'The Thief',
          shortName: 'Thief',
          color: 'var(--reflections-thief)',    // CSS variable
          avatar: 'assets/thief-avatar.png',    // optional, from bundle
          alignment: 'npc',                     // default side
        },
        oldman: {
          name: 'The Old Man',
          shortName: 'Old Man',
          color: 'var(--reflections-oldman)',
          avatar: 'assets/oldman-avatar.png',
          alignment: 'npc',
        },
        girl: {
          name: 'The Girl',
          shortName: 'Girl',
          color: 'var(--reflections-girl)',
          avatar: 'assets/girl-avatar.png',
          alignment: 'npc',
        },
      },
    },
  },
  // ...
};
```

### 2. TranscriptEntry gains `blocks` field

Currently `TranscriptEntry.text` is a flat string produced by `renderToString()`. For the chat overlay, we need the raw `ITextBlock[]` to route messages by key. The transcript overlay continues to use the flat string.

```typescript
export interface TranscriptEntry {
  id: string;
  turn: number;
  command?: string;
  text: string;                    // flat string (still populated for transcript overlay)
  blocks?: ITextBlock[];           // structured blocks (for overlays that need routing)
  timestamp: number;
  annotation?: { type: AnnotationType; text: string };
  illustrations?: TranscriptIllustration[];
}
```

The `TURN_COMPLETED` reducer stores both:

```typescript
case 'TURN_COMPLETED': {
  const entry: TranscriptEntry = {
    id: `turn-${action.turn}-${Date.now()}`,
    turn: action.turn,
    command: action.command,
    text: action.text,             // renderToString(blocks) — already computed
    blocks: action.blocks,         // raw ITextBlock[] — new
    timestamp: Date.now(),
    illustrations,
  };
  // ...
}
```

Cost: one extra field per entry. No existing code breaks — `text` is still the primary field.

### 3. GameShell gets overlay prop

```typescript
export interface GameShellProps {
  // ... existing props ...
  overlay?: 'transcript' | 'chat';
  overlayConfig?: Record<string, unknown>;  // story.config.custom.characters, etc.
}
```

GameShell replaces its hardcoded transcript/input children with an overlay switch:

```typescript
export function GameShell({ overlay = 'transcript', overlayConfig, ...props }: GameShellProps) {
  return (
    <div className={`game-shell ${className}`}>
      {showMenuBar && <MenuBar ... />}
      {overlay !== 'chat' && <StatusLine className="game-shell__status" />}

      <div className="game-shell__content">
        <div className="game-shell__main game-shell__main--full">
          <div className="story-content">
            {overlay === 'chat'
              ? <ChatOverlay config={overlayConfig} />
              : <TranscriptOverlay />}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 4. TranscriptOverlay — extracted, unchanged

The current `game-shell__transcript-container` + `game-shell__input-container` JSX moves into its own component. Zero behavior change:

```typescript
// components/overlays/TranscriptOverlay.tsx
export function TranscriptOverlay() {
  return (
    <>
      <div className="game-shell__transcript-container">
        <Transcript />
      </div>
      <div className="game-shell__input-container">
        <CommandInput />
      </div>
    </>
  );
}
```

### 5. ChatOverlay — the new component

```typescript
// components/overlays/ChatOverlay.tsx
export function ChatOverlay({ config }: { config?: Record<string, unknown> }) {
  const { state } = useGameContext();
  const characters = (config?.characters ?? {}) as CharacterMap;
  const currentPcId = useCurrentPc();   // tracks game.pc_switched events

  return (
    <div className="chat-overlay">
      <div className="chat-messages" ref={scrollRef}>
        {state.transcript.map(entry => (
          <ChatTurn
            key={entry.id}
            entry={entry}
            characters={characters}
            currentPcId={currentPcId}
          />
        ))}
      </div>
      <div className="chat-input-area">
        <CommandInput placeholder="Type a command..." />
      </div>
    </div>
  );
}
```

## ChatOverlay Rendering Pipeline

### Block key → character mapping

The engine emits `ITextBlock[]` with semantic keys. For Reflections, the text service emits character-keyed blocks:

```
narration.thief   → Thief's narration/dialogue
narration.oldman  → Old Man's narration/dialogue
narration.girl    → Girl's narration/dialogue
room.name         → Room title (system, centered)
room.description  → Room description (system, centered)
action.result     → Action result (attributed to current PC)
action.blocked    → Action failure (attributed to system)
```

`ChatTurn` splits each `TranscriptEntry.blocks` into message groups by character:

```typescript
function ChatTurn({ entry, characters, currentPcId }: ChatTurnProps) {
  if (!entry.blocks) {
    // Fallback: render as system message (pre-ADR-133 entries, system messages)
    return <SystemBubble text={entry.text} />;
  }

  const messages = routeBlocksToMessages(entry.blocks, characters, currentPcId);

  return (
    <>
      {entry.command && <CommandBubble command={entry.command} pcId={currentPcId} />}
      {messages.map((msg, i) => (
        <ChatBubble
          key={i}
          message={msg}
          character={characters[msg.characterId]}
          isPC={msg.characterId === currentPcId}
        />
      ))}
    </>
  );
}
```

### routeBlocksToMessages

```typescript
interface ChatMessage {
  characterId: string | null;     // null = system message
  blocks: ITextBlock[];           // the blocks that form this message
  type: 'narration' | 'action' | 'system';
}

function routeBlocksToMessages(
  blocks: ITextBlock[],
  characters: CharacterMap,
  currentPcId: string
): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let current: ChatMessage | null = null;

  for (const block of blocks) {
    // Extract character from key prefix: "narration.thief" → "thief"
    const match = block.key.match(/^narration\.(\w+)$/);
    const charId = match?.[1] ?? null;

    // Action results are attributed to the current PC
    const isAction = block.key.startsWith('action.');
    const effectiveCharId = isAction ? currentPcId : charId;

    // System blocks (room.*, error, game.*) become system messages
    const isSystem = !effectiveCharId;

    // Group consecutive blocks from the same character
    if (current && current.characterId === effectiveCharId) {
      current.blocks.push(block);
    } else {
      current = {
        characterId: effectiveCharId,
        blocks: [block],
        type: isSystem ? 'system' : isAction ? 'action' : 'narration',
      };
      messages.push(current);
    }
  }

  return messages;
}
```

### ChatBubble component

```typescript
function ChatBubble({ message, character, isPC }: ChatBubbleProps) {
  const alignment = isPC ? 'right' : 'left';
  const text = renderToString(message.blocks);

  return (
    <div className={`chat-bubble chat-bubble--${alignment}`}>
      {!isPC && character?.avatar && (
        <img className="chat-avatar" src={character.avatar} alt={character.shortName} />
      )}
      <div className="chat-bubble__content" style={{ borderColor: character?.color }}>
        {character && (
          <div className="chat-bubble__name" style={{ color: character.color }}>
            {character.shortName}
          </div>
        )}
        <div
          className="chat-bubble__text"
          dangerouslySetInnerHTML={{ __html: formatText(text) }}
        />
      </div>
    </div>
  );
}
```

## PC Switching in Chat Overlay

The engine emits `game.pc_switched` (ADR-132) with `{ previousPlayerId, newPlayerId }`. The chat overlay needs to track this for alignment (PC messages go right, NPC messages go left).

### useCurrentPc hook

```typescript
function useCurrentPc(): string {
  const { state } = useGameContext();
  const [pcId, setPcId] = useState<string>('');

  useEffect(() => {
    // Scan lastTurnEvents for pc_switched
    const switchEvent = state.lastTurnEvents.find(e => e.type === 'game.pc_switched');
    if (switchEvent) {
      const data = switchEvent.data as { newPlayerId: string };
      setPcId(data.newPlayerId);
    }
  }, [state.lastTurnEvents]);

  return pcId;
}
```

When the PC switches:
- The new PC's messages align right
- The old PC's messages align left (they're now an NPC)
- A system message appears: "You are now the Old Man."
- The chat visually "flips" alignment for subsequent messages

### PC switch announcement

```typescript
// In ChatTurn, check for pc_switched in turn events
const switchEvent = entry.events?.find(e => e.type === 'game.pc_switched');
if (switchEvent) {
  return (
    <>
      <SystemBubble text={`You are now ${characters[newPcId]?.name ?? 'someone else'}.`} />
      {/* ... regular messages ... */}
    </>
  );
}
```

Note: `TranscriptEntry` doesn't currently store events. Two options:
- **Option A**: Add `events?: GameEvent[]` to TranscriptEntry (already available in the reducer as `action.events`)
- **Option B**: Detect PC switches from the blocks themselves (a `game.pc_switched` block key)

Option A is simpler and doesn't require engine changes.

## Theme Integration

The chat overlay uses the same CSS variable system. Story-specific CSS (bundled via `theme.css` in the .sharpee bundle) adds character colors:

```css
/* stories/reflections/theme.css — bundled into .sharpee */

/* Character colors per theme */
:root, [data-theme="classic-light"] {
  --reflections-thief: #8b4513;
  --reflections-oldman: #2f4f4f;
  --reflections-girl: #4a0080;
}

[data-theme="modern-dark"] {
  --reflections-thief: #d4956a;
  --reflections-oldman: #7fafaf;
  --reflections-girl: #b388ff;
}

/* Chat bubble base styles */
.chat-overlay {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: var(--sharpee-spacing-md);
  display: flex;
  flex-direction: column;
  gap: var(--sharpee-spacing-sm);
}

.chat-bubble {
  display: flex;
  gap: var(--sharpee-spacing-sm);
  max-width: 75%;
}

.chat-bubble--right {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.chat-bubble--left {
  align-self: flex-start;
}

.chat-bubble__content {
  background: var(--sharpee-panel-bg);
  border-radius: 12px;
  border-left: 3px solid;                /* color set via inline style */
  padding: var(--sharpee-spacing-sm) var(--sharpee-spacing-md);
}

.chat-bubble--right .chat-bubble__content {
  border-left: none;
  border-right: 3px solid;
}

.chat-bubble__name {
  font-family: var(--sharpee-font-ui);
  font-size: 0.8em;
  font-weight: 600;
  margin-bottom: 2px;
}

.chat-bubble__text {
  font-family: var(--sharpee-font-transcript);
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.system-bubble {
  text-align: center;
  color: var(--sharpee-text-muted);
  font-style: italic;
  padding: var(--sharpee-spacing-xs) 0;
  font-size: 0.9em;
}

/* Message grouping: consecutive messages from same character */
.chat-bubble + .chat-bubble--same-speaker {
  margin-top: calc(-1 * var(--sharpee-spacing-sm) + 2px);
}

.chat-bubble--same-speaker .chat-bubble__name,
.chat-bubble--same-speaker .chat-avatar {
  visibility: hidden;
  height: 0;
}
```

Where this CSS lives: in the .sharpee bundle's `theme.css`. The runner already injects story theme CSS scoped to `.story-content`. The chat overlay's structural CSS (`.chat-overlay`, `.chat-bubble`, etc.) lives in Zifmia's own styles alongside the existing transcript CSS.

## Data Flow Summary

```
Engine
  │
  ├─ emits 'text:output' (ITextBlock[], turn)
  │
  └─ emits 'event' (game.pc_switched, etc.)
        │
        ▼
GameContext (unchanged core)
  │
  ├─ handleTextOutput:
  │    text = renderToString(blocks)   ← still computed
  │    dispatch TURN_COMPLETED { text, blocks, command, events }
  │                                          ↑ new field
  │
  └─ handleEvent:
       dispatch ROOM_CHANGED, SCORE_CHANGED, etc.  ← unchanged
        │
        ▼
GameState.transcript: TranscriptEntry[]
  │
  ├─── TranscriptOverlay reads entry.text        ← unchanged path
  │    └─ renders as flowing prose
  │
  └─── ChatOverlay reads entry.blocks            ← new path
       ├─ routeBlocksToMessages() splits by key
       ├─ ChatBubble renders each message group
       └─ alignment flips based on currentPcId
```

## StatusLine in Chat Overlay

The traditional IF status line (room/score/turns) doesn't fit iMessage aesthetics. Options:

- **Hide it entirely** — chat overlay sets a prop to suppress StatusLine in GameShell
- **Compact header** — show current character name + location as a subtle top bar
- **In-chat system messages** — room changes appear as centered system bubbles (like "Alice changed the group name" in iMessage)

Recommendation: **in-chat system messages** for room changes, hide the status bar. This keeps the immersion. Score/turns aren't relevant for Reflections (it's not a puzzle game).

```typescript
// In GameShell
{overlay !== 'chat' && <StatusLine className="game-shell__status" />}
```

## CommandInput in Chat Overlay

Same component, different styling. The chat overlay wraps CommandInput with a chat-style input bar:

```css
.chat-input-area {
  border-top: 1px solid var(--sharpee-border);
  padding: var(--sharpee-spacing-sm) var(--sharpee-spacing-md);
  background: var(--sharpee-bg);
}

.chat-input-area .command-input-form {
  background: var(--sharpee-panel-bg);
  border-radius: 20px;
  padding: var(--sharpee-spacing-xs) var(--sharpee-spacing-md);
}

.chat-input-area .command-prompt {
  display: none;           /* hide the ">" prompt in chat mode */
}
```

## Save/Restore Compatibility

`TranscriptEntry.blocks` is `ITextBlock[]` which is pure JSON-serializable data (strings and `{ type, content }` objects). Save/restore already serializes the transcript — adding `blocks` just increases the payload slightly.

For restoring pre-blocks saves: `blocks` is optional. If absent, ChatOverlay falls back to rendering `entry.text` as a system bubble. Graceful degradation.

## What Does NOT Change

| Component | Change? | Notes |
|-----------|---------|-------|
| GameEngine | No | Already emits `ITextBlock[]` |
| Story interface | No | Uses existing `config.custom` |
| StoryConfig | No | `custom` field is already `Record<string, any>` |
| GameContext core | Minimal | Add `blocks` to TURN_COMPLETED action |
| GameState reducer | Minimal | Store `blocks` alongside `text` |
| Transcript component | No | Still reads `entry.text` |
| CommandInput | No | Same component, CSS-only restyling |
| MenuBar | No | Same menus |
| Theme system | No | Same CSS variables, story extends with character vars |
| Save/restore | No | TranscriptEntry is still JSON-serializable |
| Preferences | No | Font/size still apply to chat bubbles via CSS vars |

## Implementation Order

### Phase 1: Plumbing (no visual change) — COMPLETE

1. ✅ Add `blocks?: ITextBlock[]` to `TranscriptEntry` and `TURN_COMPLETED` action
2. ✅ Store blocks in reducer alongside text
3. ✅ Extract current transcript/input JSX from GameShell into `TranscriptOverlay`
4. ✅ Add `overlay` prop to GameShell, default `'transcript'`
5. ✅ GameShell renders `TranscriptOverlay` when overlay is `'transcript'`

**Files**: `game-state.ts`, `GameShell.tsx`, `overlays/TranscriptOverlay.tsx`, `runner/index.tsx`

### Phase 2: Chat skeleton — COMPLETE

6. ✅ Create `ChatOverlay` component with basic message rendering
7. ✅ Create `ChatBubble`, `SystemBubble`, `CommandBubble` components
8. ✅ Implement `routeBlocksToMessages()` with key-based routing
9. ✅ Wire GameShell to render `ChatOverlay` when overlay is `'chat'`
10. ✅ Chat CSS: bubbles, alignment, scrolling
11. ✅ MenuBar > Settings > Overlay submenu for runtime switching
12. ✅ StatusLine hidden for chat overlay
13. ✅ CommandInput chat-style restyling (rounded, hidden prompt)

**Files**: `overlays/ChatOverlay.tsx`, `overlays/index.ts`, `GameShell.tsx`, `menu/MenuBar.tsx`, `styles/themes.css`

**Verified**: Dungeo in chat mode — all messages render as system bubbles (no `narration.*` keys). Switching between transcript/chat works at runtime via Settings menu.

### Phase 3: Character integration — IN PROGRESS

Current state of `ChatOverlay.tsx`:
- `routeBlocksToMessages()` extracts `narration.{characterId}` keys correctly
- `ChatBubble` alignment is hardcoded to `'left'` (stub comment: "Phase 3: isPC ? 'right' : 'left'")
- `config` prop is accepted but not consumed (no character lookup)
- Action blocks use `effectiveCharId = ''` instead of actual PC ID

#### 3a. Store events on TranscriptEntry

**Decision**: Store events on `TranscriptEntry`. The `TURN_COMPLETED` action already carries `events: GameEvent[]`, but the reducer doesn't save them on the entry. This is needed for per-entry PC switch detection.

Add `events?: GameEvent[]` to `TranscriptEntry`:

```typescript
// game-state.ts
export interface TranscriptEntry {
  // ...existing fields...
  /** Events from this turn (for overlay rendering: PC switches, etc.) */
  events?: GameEvent[];
}
```

In the reducer, store them (filtered to relevant overlay events to limit save size):

```typescript
// In TURN_COMPLETED case:
const overlayEvents = action.events.filter(e =>
  e.type === 'game.pc_switched'
);

const entry: TranscriptEntry = {
  // ...existing fields...
  events: overlayEvents.length > 0 ? overlayEvents : undefined,
};
```

#### 3b. Character config types

Define a clean interface for character config passed through `overlayConfig`:

```typescript
// In ChatOverlay.tsx or a shared types file
interface CharacterConfig {
  name: string;           // "The Thief"
  shortName: string;      // "Thief"
  color: string;          // CSS color or variable: "var(--reflections-thief)"
  avatar?: string;        // Asset path: "assets/thief-avatar.png"
  alignment: 'pc' | 'npc'; // Default side (overridden by PC switch tracking)
}

type CharacterMap = Record<string, CharacterConfig>;
```

Parse from `config.characters` in `ChatOverlay`:

```typescript
export function ChatOverlay({ config }: ChatOverlayProps) {
  const characters = (config?.characters ?? {}) as CharacterMap;
  // ...pass to ChatTurn...
}
```

#### 3c. useCurrentPc hook

Track the current PC by scanning `lastTurnEvents` for `game.pc_switched`:

```typescript
// hooks/useCurrentPc.ts
export function useCurrentPc(): string {
  const { lastTurnEvents } = useGameState();
  const [pcId, setPcId] = useState<string>('');

  useEffect(() => {
    const switchEvent = lastTurnEvents.find(e => e.type === 'game.pc_switched');
    if (switchEvent) {
      const data = switchEvent.data as { newPlayerId: string };
      setPcId(data.newPlayerId);
    }
  }, [lastTurnEvents]);

  return pcId;
}
```

Used in `ChatOverlay` to determine alignment and attribute action blocks.

#### 3d. Wire character data into ChatBubble

Update `ChatTurn` to pass characters and pcId:

```typescript
function ChatTurn({ entry, characters, currentPcId }: ChatTurnProps) {
  if (!entry.blocks) {
    return <SystemBubble text={entry.text} />;
  }

  // Check for PC switch in this entry's events
  const switchEvent = entry.events?.find(e => e.type === 'game.pc_switched');

  const messages = routeBlocksToMessages(entry.blocks, currentPcId);

  return (
    <>
      {switchEvent && (
        <SystemBubble text={`You are now ${
          characters[(switchEvent.data as any).newPlayerId]?.name ?? 'someone else'
        }.`} />
      )}
      {entry.command && <CommandBubble command={entry.command} />}
      {messages.map((msg, i) =>
        msg.type === 'system'
          ? <SystemBubble key={i} text={renderToString(msg.blocks)} />
          : <ChatBubble
              key={i}
              message={msg}
              character={characters[msg.characterId ?? '']}
              isPC={msg.characterId === currentPcId}
            />
      )}
    </>
  );
}
```

Update `ChatBubble` to render character identity and alignment:

```typescript
function ChatBubble({ message, character, isPC }: ChatBubbleProps) {
  const alignment = isPC ? 'right' : 'left';
  const text = renderToString(message.blocks);

  return (
    <div className={`chat-bubble chat-bubble--${alignment}`}>
      {!isPC && character?.avatar && (
        <img className="chat-avatar" src={character.avatar} alt={character.shortName} />
      )}
      <div className="chat-bubble__content" style={{ borderColor: character?.color }}>
        {character && (
          <div className="chat-bubble__name" style={{ color: character.color }}>
            {character.shortName}
          </div>
        )}
        <div
          className="chat-bubble__text"
          dangerouslySetInnerHTML={{ __html: formatText(text) }}
        />
      </div>
    </div>
  );
}
```

#### 3e. Update routeBlocksToMessages to accept currentPcId

Action blocks need the actual PC ID for attribution:

```typescript
function routeBlocksToMessages(blocks: ITextBlock[], currentPcId: string): ChatMessage[] {
  // ...existing grouping logic...
  const effectiveCharId = isAction ? currentPcId : charId;
  // ...rest unchanged...
}
```

#### 3f. Message grouping

Consecutive messages from the same character should visually group (hide repeated avatar/name). Add a `sameSpeaker` flag:

```typescript
// In ChatTurn, after building messages array:
{messages.map((msg, i) => {
  const prevMsg = i > 0 ? messages[i - 1] : null;
  const sameSpeaker = prevMsg?.characterId === msg.characterId && prevMsg?.type !== 'system';

  return msg.type === 'system'
    ? <SystemBubble key={i} text={renderToString(msg.blocks)} />
    : <ChatBubble
        key={i}
        message={msg}
        character={characters[msg.characterId ?? '']}
        isPC={msg.characterId === currentPcId}
        sameSpeaker={sameSpeaker}
      />;
})}
```

CSS handles the grouping (already defined in themes.css):

```css
.chat-bubble--same-speaker .chat-bubble__name,
.chat-bubble--same-speaker .chat-avatar {
  visibility: hidden;
  height: 0;
}
```

#### Phase 3 verification

Needs a test story (or Reflections prototype) that:
- Declares `config.custom.overlay: 'chat'` and `config.custom.characters`
- Emits `narration.{characterId}` text blocks via text service
- Fires `game.pc_switched` events via `engine.switchPlayer()`

Alternative: temporarily hack Dungeo to emit character-keyed blocks for the troll/thief encounters to validate routing without building Reflections.

### Phase 4: Polish — COMPLETE

14. ✅ Avatar rendering — `resolveAvatar()` uses `useAssetMap()` to resolve `character.avatar` paths to blob URLs (same pattern as illustration resolution: try bare path, then `assets/` prefix)
15. ✅ Responsive behavior — `@media (max-width: 768px)`: wider bubbles (88% max-width), smaller avatars (24px)
16. ⏳ Typing indicator animation — deferred, requires story-driven events (`game.typing_started` / `game.typing_ended`) that don't exist yet
17. ✅ Scroll-to-bottom refinement — `isAtBottomRef` tracks scroll position, only auto-scrolls if user is at bottom, uses `behavior: 'smooth'`
18. ✅ Accessibility — `role="log"` + `aria-live="polite"` on message container, `role="listitem"` on bubbles, `role="status"` on system bubbles
19. ✅ Save/restore — `events` field is `GameEvent[]` (pure JSON-serializable), stored only when present (undefined otherwise)

**Files**: `overlays/ChatOverlay.tsx`, `styles/themes.css`

## Resolved Questions

1. **Events on TranscriptEntry**: YES — store filtered overlay events (just `game.pc_switched` for now) on the entry. The `TURN_COMPLETED` reducer filters to relevant events to keep save size small. This avoids needing a synthetic text block for PC switches.

2. **Narration key convention**: `narration.{characterId}` is confirmed. It groups all character output under one namespace, making routing in `routeBlocksToMessages` clean (single regex match). This is already implemented in Phase 2.

3. **Room descriptions in chat overlay**: System bubbles (centered, muted). Already implemented — `room.*` keys route to `SystemBubble` in `routeBlocksToMessages()`.

## Open Questions

1. **Future overlays**: If we add a third overlay (e.g., `split` for side-by-side transcripts), the `overlay` string and `OverlaySwitch` pattern scales cleanly. Each overlay is just a component that consumes GameContext.

2. **Initial PC detection**: `useCurrentPc` only sets the PC ID when it sees a `game.pc_switched` event. On game start (before any switch), the PC ID is empty string. Should the hook initialize from the engine's current player? Or should the story emit a synthetic switch event at start?

3. **Character config for Dungeo NPCs**: If Dungeo ever uses chat mode (e.g., for debugging NPC dialogue), should there be a default character map that auto-generates entries from entity IDs? Or is chat mode strictly opt-in per story?

## Relationship to ADR-125

This design is **deliberately simpler** than ADR-125's panel system. The panel system is a general-purpose windowing abstraction (declare panels, route events, handle tabs). Overlays are just component switching — one overlay per story, the overlay owns its rendering.

If ADR-125 is implemented later, `TranscriptOverlay` could become a thin wrapper around a single-panel configuration, and `ChatOverlay` could become a multi-panel variant. But that generalization isn't needed now and shouldn't block Reflections.

The key compatibility point: both approaches need `ITextBlock[]` in `TranscriptEntry`. Phase 1 here enables both paths.
