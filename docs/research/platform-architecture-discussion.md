# Platform Architecture Research & Discussion

## Terminal as Full IF Client

### Status Line Implementation Options

1. **ANSI Escape Sequences** - Use escape codes for persistent status bar
2. **ncurses/blessed Libraries** - Full terminal control libraries
3. **Terminal Multiplexers** - tmux/screen for split panes
4. **Modern TUI Frameworks** - Ink, Rich, Textual, Ratatui
5. **Simple Shell Implementation** - Basic status line with tput commands

### Potential Status Line Content
- Current location
- Score/moves counter
- Inventory count
- Game state indicators

## Package Distribution Strategy

### Option 1: Monolithic Package
- `@sharpee/core` - Everything bundled
- **Pros**: Single install, no version conflicts
- **Cons**: Larger bundle, includes unused languages

### Option 2: Modular (Current Architecture)
- `@sharpee/engine` - Core engine
- `@sharpee/platform-en-us` - English CLI platform
- `@sharpee/platform-web-en-us` - English web platform
- **Pros**: Pick only what you need
- **Cons**: Multiple installs, version coordination

### Option 3: Meta-package with Presets
- `@sharpee/cli` - CLI preset bundle
- `@sharpee/web` - Web preset bundle
- `create-sharpee-story` - Scaffolding tool

### Performance Considerations
- Bundle size likely < 500KB minified
- Tree-shaking eliminates unused code
- gzip compression helps
- Developer experience matters more than bundle size initially

## Unity Integration Opportunities

### Direct Integration Use Cases
1. **Narrative Systems**
   - Dialog trees with natural language input
   - Quest systems with complex command parsing
   - NPC interaction beyond menu choices
   - Text adventure mini-games

2. **Development & Testing**
   - Debug console with English-like commands
   - Level editor with natural language scripting
   - Test automation commands
   - Designer-friendly content tools

3. **Accessibility Features**
   - Text-based alternative modes
   - Voice command integration
   - Screen reader friendly gameplay

### Integration Approaches
- C# bindings via WebAssembly or JavaScript bridge
- REST API for cloud-based parsing
- Compile TypeScript to C# (Bridge.NET style)
- Native C# port if demand justifies

## WebAssembly Architecture

### Implementation Options

1. **Full Sharpee in WASM**
   - Compile TypeScript → WASM via AssemblyScript
   - Or rewrite core in Rust/Go/C++ → WASM
   - **Benefits**: Single binary, consistent performance
   - **Drawbacks**: Larger download, debugging complexity

2. **Hybrid Approach (Recommended)**
   - Parser/Engine in WASM (performance critical)
   - UI/Platform layer in JavaScript (flexibility)
   - **Benefits**: Best of both worlds

3. **Universal Client Runtime**
   - WASM Core with multiple frontends:
     - Terminal (via WASI)
     - Web Browser (via JS bridge)
     - Native Desktop (via Wasmtime)
     - Mobile (via Capacitor)
     - Unity (via WASM runtime)

### Security Benefits for IF Community
- **Sandboxed execution** - No file system access without permission
- **No network access** without explicit grant
- **Memory isolated** from host system
- **Deterministic execution** - Reproducible gameplay
- **Trust model** - As safe as Z-machine files

### Multi-Platform Support
One WASM binary runs on:
- Windows/Mac/Linux (native/browser/terminal)
- iOS/Android (browser/app)
- Steam Deck, Chromebooks, Raspberry Pi
- Smart TVs, game consoles
- Even DOS via WASM-4 retro runtime

## Accessibility Architecture

### Screen Reader Optimization

**Structured Output Format:**
```
[ROOM] Foyer of the Opera House
[EXITS] North, South, West
[OBJECTS] velvet cloak (worn)
[ACTION] > look at cloak
[DESCRIPTION] A handsome cloak of velvet...
```

### Accessibility Features
1. **Smart Verbosity Control**
   - BRIEF - room name only on revisit
   - VERBOSE - always full description
   - BLIND - structured, no ASCII art
   - NOTIFY - important changes only

2. **Navigation Aids**
   - EXITS command - list available exits
   - OBJECTS command - quick inventory
   - RECAP command - repeat last description
   - WHERE command - location reminder

3. **Screen Reader APIs**
   - Windows: SAPI/NVDA/JAWS hooks
   - Mac: VoiceOver integration
   - Linux: Orca/Speech Dispatcher
   - Mobile: TalkBack/VoiceOver

4. **Advanced Features**
   - Audio cues for room types
   - Directional audio for exits
   - Ambient soundscapes
   - Braille display support

### Event Source Benefits for Accessibility

The event source architecture enables:
- **Intercepted output** for screen reader optimization
- **Reformatted text** for structured vs narrative mode
- **Filtered verbosity** for blind users
- **Augmented navigation** hints
- **Batched updates** to prevent reader spam

The Text Service acts as an accessibility layer, providing mode-aware output that can adapt to different accessibility needs.

## Key Architectural Insights

### Event-Driven Design Advantages
- Complete history for context queries
- Semantic information preserved
- Platform-specific adaptations
- Accessibility-first architecture

### Market Positioning
- "The modern Z-machine"
- "Write once, play everywhere, forever"
- Solves IF's 40-year platform fragmentation problem
- Accessibility built-in, not bolted-on

### Target Audiences
1. **IF Authors** - Better tools, no platform lock-in
2. **Players** - Universal access, perfect preservation
3. **Unity Developers** - Professional narrative tools
4. **Accessibility Community** - Finally, games designed for them
5. **Educational Market** - Teach coding through storytelling