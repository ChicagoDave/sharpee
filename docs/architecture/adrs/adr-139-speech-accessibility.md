# ADR-139: Speech Accessibility (Text-to-Speech and Voice Input)

## Status: PROPOSED

## Date: 2026-04-01

## Context

### The Problem

Sharpee outputs text and accepts typed commands. Blind and low-vision players rely on screen readers (JAWS, NVDA, VoiceOver) to access IF, but screen readers are general-purpose tools — they don't understand IF conventions like room descriptions, inventory lists, NPC dialogue, or command prompts. The result is a flat, undifferentiated reading experience.

Meanwhile, players with motor disabilities may find typing commands difficult. Voice input is a natural fit for parser IF — the player is already forming English sentences in their head.

### Goals

- Blind players get a purpose-built speech experience that understands IF structure
- Motor-impaired players can speak commands instead of typing
- Sighted players can optionally use speech features (hands-free play, multitasking)
- Works alongside screen readers, not against them — players using JAWS/VoiceOver should not get double-reading
- No story author burden — speech works automatically from existing text output

### Non-Goals

- Replacing screen readers — this complements, not replaces
- Voice acting / character voices (future consideration, dependent on ADR-138 audio system)
- Natural language understanding beyond what the parser already handles

### Relationship to ADR-138

ADR-138 (Audio System) covers atmospheric audio — sound effects, music, ambient loops. This ADR covers speech as an accessibility feature. They share the Web Audio pipeline and `AudioContext` lifecycle but are otherwise independent concerns.

**Implementation order**: ADR-138 first (establishes `AudioManager`, `AudioContext` lifecycle, player audio controls), then ADR-139 builds on that foundation. Speech synthesis can route through the same `AudioContext` for consistent volume control, and voice recognition needs the same autoplay/gesture-unlock pattern.

## Decision

### Two Independent Features

Speech accessibility has two parts that can be enabled independently:

1. **Text-to-Speech (TTS)** — the client reads game output aloud
2. **Speech-to-Text (STT)** — the player speaks commands

A player might use TTS without STT (blind player who types well), STT without TTS (motor-impaired sighted player), or both together.

### Text-to-Speech

#### IF-Aware Speech

The key insight: Sharpee's output is already structured. The text service emits blocks with semantic types — room names, descriptions, action results, NPC dialogue, system messages. TTS can use this structure to read intelligently rather than dumping everything into one flat stream.

```typescript
interface SpeechBlock {
  text: string;
  role: 'room-name' | 'description' | 'action-result' | 'dialogue' | 
        'system' | 'inventory' | 'error' | 'prompt';
  pause?: 'short' | 'medium' | 'long';  // Pause before this block
  priority?: 'normal' | 'interrupt';      // Interrupt current speech?
}
```

The client maps text block types to speech behaviors:

| Block Type | Speech Behavior |
|------------|----------------|
| Room name | Slight pitch raise, medium pause after |
| Description | Normal voice, long pause after |
| Action result | Normal voice, short pause after |
| NPC dialogue | Optional voice change (pitch/rate shift) |
| System message | Lower volume, faster rate |
| Error | Interrupt current speech, normal priority |
| Inventory | List mode — short pauses between items |
| Prompt | Short distinctive tone or phrase ("Your command?") |

#### Speech Controls

Players configure TTS behavior:

```typescript
interface TTSPreferences {
  enabled: boolean;
  voice: string;                  // SpeechSynthesis voice name
  rate: number;                   // 0.5 - 2.0 (default: 1.0)
  pitch: number;                  // 0.5 - 2.0 (default: 1.0)
  volume: number;                 // 0.0 - 1.0 (default: 1.0)
  
  // IF-specific
  readRoomNames: boolean;         // Read room name on entry (default: true)
  readDescriptions: boolean;      // Read full descriptions (default: true)
  pauseBetweenBlocks: boolean;    // Insert pauses between blocks (default: true)
  interruptOnInput: boolean;      // Stop speaking when player starts typing (default: true)
  announcePrompt: boolean;        // Audio cue when ready for input (default: true)
  
  // Screen reader coordination
  suppressAriaLive: boolean;      // Suppress aria-live when TTS is active (prevent double-read)
}
```

#### Screen Reader Coordination

When TTS is active, the client suppresses `aria-live` announcements on the transcript area to prevent screen readers from reading the same text. The player chooses one or the other:

- **TTS off, screen reader on** — standard `aria-live` behavior, screen reader handles everything
- **TTS on, screen reader on** — client sets `aria-live="off"` on transcript, TTS handles reading, screen reader still available for navigation/controls
- **TTS on, screen reader off** — TTS handles everything

The settings panel is itself fully accessible (proper ARIA labels, keyboard navigable).

#### Interrupt and Queue Behavior

- New turn output interrupts any in-progress speech (configurable)
- Within a turn, blocks are queued and read in order with pauses
- Player pressing a key or starting to type interrupts speech (configurable)
- Player can press a key (e.g., Space when not in input) to repeat the last turn's output

### Speech-to-Text

#### Voice Command Input

The player speaks a command; the client transcribes it and submits it to the parser as if typed.

```typescript
interface STTPreferences {
  enabled: boolean;
  language: string;               // BCP 47 language tag (default: 'en-US')
  continuous: boolean;            // Keep listening vs push-to-talk (default: false)
  interimResults: boolean;        // Show partial transcription (default: true)
  submitOnSilence: boolean;       // Auto-submit after pause (default: true)
  silenceTimeout: number;         // Ms of silence before submit (default: 1500)
  
  // Visual feedback
  showTranscription: boolean;     // Show what was heard in input field (default: true)
  showConfidence: boolean;        // Show confidence indicator (default: false)
}
```

#### Activation Modes

Two modes for voice input:

1. **Push-to-talk** (default) — player clicks a microphone button or presses a hotkey to start listening. Listening stops on silence or button release. Safer, less error-prone.

2. **Continuous** — client listens continuously, submits on silence pauses. More natural but prone to false triggers. Best paired with a wake word or activation phrase.

#### Transcription Flow

```
Player speaks: "open the wooden door"
        │
        ▼
SpeechRecognition API → interim results → show in input field as typing
        │
        ▼
Final result: "open the wooden door"
        │
        ▼
Client submits to parser (same path as typed input)
        │
        ▼
Parser processes normally
```

The parser doesn't know or care that input came from voice. The transcription is plain text submitted through the existing command input path.

#### Error Handling

- **Low confidence**: Show transcription with a visual indicator, let player confirm or edit before submitting
- **No match**: "I didn't catch that" feedback (audio cue if TTS active)
- **Parser failure**: Normal parser error message (read aloud if TTS active)
- **Microphone denied**: Clear message explaining how to grant permission, fall back to typed input

#### IF-Specific Vocabulary Hints

The SpeechRecognition API accepts grammar hints. The client can improve accuracy by providing IF-relevant vocabulary:

- Common IF verbs: take, drop, open, close, look, examine, go, put, unlock
- Current room's visible entity names (from the world model)
- Direction words: north, south, east, west, up, down

This helps the recognizer distinguish "go north" from "go Norse" or "take sword" from "take sore."

### Capability Declaration

Extends the client capabilities interface:

```typescript
interface SpeechCapabilities {
  tts: boolean;                   // Text-to-speech available
  stt: boolean;                   // Speech-to-text available
  ttsVoices: string[];            // Available TTS voice names
  sttLanguages: string[];         // Supported STT languages
}
```

### Player Controls UI

Audio and speech settings share a panel:

```
┌─ Audio & Speech Settings ──────────────────┐
│                                              │
│  🔊 Audio                                   │
│  ├── Master Volume  ████████░░  80%          │
│  ├── Sound Effects  [✓] On                   │
│  ├── Music          [✓] On                   │
│  └── Ambient        [✓] On                   │
│                                              │
│  🗣 Text-to-Speech                           │
│  ├── Enabled        [✓] On                   │
│  ├── Voice          [Google US English ▾]    │
│  ├── Speed          ██████░░░░  1.2x         │
│  ├── Read rooms     [✓]                      │
│  ├── Pause between  [✓]                      │
│  └── Stop on typing [✓]                      │
│                                              │
│  🎤 Voice Input                              │
│  ├── Enabled        [ ] Off                  │
│  ├── Mode           [Push-to-talk ▾]         │
│  └── Auto-submit    [✓]                      │
│                                              │
└──────────────────────────────────────────────┘
```

All controls are keyboard-accessible and screen reader-friendly.

### What Each Layer Knows

| Layer | Knows About |
|-------|-------------|
| Engine | Nothing — text output unchanged |
| Language layer | Nothing — produces text as always |
| World model | Nothing |
| Story code | Nothing — speech is automatic from text output |
| Text service | Block types (already exists — TTS reads these) |
| Client | SpeechSynthesis API, SpeechRecognition API, preferences, coordination |

**Key point**: Stories do not emit speech events. TTS is a client-side rendering decision applied to existing text output. This means every story gets speech accessibility for free.

## Implementation Plan

### Phase 1: Text-to-Speech (after ADR-138 Phases 0-1)

- Define speech types in `@sharpee/media/speech/` (`SpeechBlock`, `TTSPreferences`, `STTPreferences`, `SpeechCapabilities`)
- Add `SpeechManager` to browser client, alongside `AudioManager`
- Map text block types to speech behaviors (pause, rate, pitch adjustments)
- Implement speech queue with interrupt support
- Add TTS preferences to settings panel
- Screen reader coordination (`aria-live` suppression when TTS active)
- Keyboard shortcut to repeat last turn

### Phase 2: Speech-to-Text

- Add voice input button to command input area
- Implement push-to-talk mode with SpeechRecognition API
- Show interim transcription in input field
- Submit final transcription to parser
- Add vocabulary hints from visible entities
- Add STT preferences to settings panel

### Phase 3: Polish

- Continuous listening mode
- Voice selection and preview
- Confidence indicators
- Per-block voice variation (NPC dialogue pitch shift)
- Mobile support testing (iOS Safari, Android Chrome)
- Integration testing with JAWS, NVDA, VoiceOver

## Consequences

### Positive

- **Zero author burden** — every story gets TTS/STT automatically
- **IF-aware reading** — better than a generic screen reader for playing IF
- **Motor accessibility** — voice input opens IF to players who can't type easily
- **Browser-native** — Web Speech API, no libraries or services needed
- **Builds on ADR-138** — shares AudioContext, settings panel, autoplay handling

### Negative

- **Browser support varies** — SpeechRecognition is not in Firefox (Chrome, Safari, Edge only)
- **Voice quality varies** — platform TTS voices range from good to robotic
- **Recognition accuracy** — IF vocabulary (unusual words, fantasy names) may transcribe poorly
- **Privacy concern** — some SpeechRecognition implementations send audio to cloud services (Chrome)
- **Testing complexity** — speech features are hard to automate-test

### Neutral

- CLI/terminal clients unaffected
- Stories that want custom voice behavior (character voices, specific timing) could emit optional speech hint events in the future — but that's a separate concern
- Does not replace screen readers — complements them

## References

- ADR-138: Audio System (prerequisite — establishes `@sharpee/media` package, AudioManager, and AudioContext lifecycle)
- `@sharpee/media` package — speech types live in `@sharpee/media/speech/` alongside audio and visual contracts
- [Web Speech API: SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [Web Speech API: SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM: Designing for Screen Reader Compatibility](https://webaim.org/techniques/screenreader/)
