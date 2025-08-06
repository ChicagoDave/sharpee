# ADR-019: Platform Implementation Patterns for Conversational UI

## Status
Proposed

## Context
With our disambiguation (ADR-017) and conversational state management (ADR-018) systems defined, we need to establish how these systems manifest across different platform implementations: CLI, Web, and Electron. Each platform has unique UI capabilities and constraints that affect how we present queries and handle responses.

The core challenge is maintaining a consistent conversation model while leveraging platform-specific UI affordances. A CLI can only show text linearly, while web and Electron can use rich UI elements. However, the underlying state machine and conversation flow must remain identical.

## Decision
We will implement a platform-agnostic conversation core with platform-specific presentation layers. The conversation state machine operates identically across all platforms, but each platform has its own UI adapter that translates conversation events into appropriate UI representations.

### Core Architecture

```typescript
// Platform-agnostic core
interface ConversationCore {
  queryManager: QueryManager;        // From ADR-018
  disambiguator: DisambiguationService;  // From ADR-017
  eventBus: EventEmitter;
}

// Platform-specific UI adapter interface
interface PlatformUIAdapter {
  // Display a query to the user
  presentQuery(query: QueryPresentation): void;
  
  // Update input state/mode
  setInputMode(mode: InputMode): void;
  
  // Show response validation error
  showValidationError(error: string): void;
  
  // Clear any query-specific UI
  clearQueryUI(): void;
  
  // Get platform capabilities
  getCapabilities(): PlatformCapabilities;
}

interface QueryPresentation {
  prompt: string;
  type: QueryType;
  options?: string[];
  allowInterruption: boolean;
  source: QuerySource;
  context?: any;
}

interface PlatformCapabilities {
  richText: boolean;
  multipleInputFields: boolean;
  modalDialogs: boolean;
  inlineButtons: boolean;
  autocomplete: boolean;
  speechInput: boolean;
  persistentUI: boolean;
}

enum InputMode {
  COMMAND = 'command',
  RESPONDING = 'responding',
  BLOCKED = 'blocked'  // For modal scenarios
}
```

### Platform-Specific Implementations

#### CLI Implementation
```typescript
class CLIAdapter implements PlatformUIAdapter {
  private readline: ReadlineInterface;
  private currentPrompt: string = '> ';
  
  getCapabilities(): PlatformCapabilities {
    return {
      richText: false,  // ANSI colors only
      multipleInputFields: false,
      modalDialogs: false,
      inlineButtons: false,
      autocomplete: true,  // Tab completion
      speechInput: false,
      persistentUI: false
    };
  }
  
  presentQuery(query: QueryPresentation): void {
    // Clear current line
    process.stdout.write('\r\x1b[K');
    
    // Show the prompt
    console.log(query.prompt);
    
    // For multiple choice, show numbered options
    if (query.type === QueryType.MULTIPLE_CHOICE && query.options) {
      query.options.forEach((opt, i) => {
        console.log(`  ${i + 1}. ${opt}`);
      });
    }
    
    // Update prompt to show we're waiting for response
    if (query.allowInterruption) {
      this.currentPrompt = '[Answer or command]> ';
    } else {
      this.currentPrompt = '[Answer]> ';
    }
    
    this.readline.setPrompt(this.currentPrompt);
    this.readline.prompt();
  }
  
  setInputMode(mode: InputMode): void {
    switch (mode) {
      case InputMode.COMMAND:
        this.currentPrompt = '> ';
        break;
      case InputMode.RESPONDING:
        // Already handled in presentQuery
        break;
      case InputMode.BLOCKED:
        this.currentPrompt = '[...]';
        break;
    }
    this.readline.setPrompt(this.currentPrompt);
  }
  
  showValidationError(error: string): void {
    console.log(`! ${error}`);
    this.readline.prompt();
  }
  
  clearQueryUI(): void {
    // Just reset the prompt
    this.setInputMode(InputMode.COMMAND);
    this.readline.prompt();
  }
}
```

#### Web Implementation
```typescript
class WebAdapter implements PlatformUIAdapter {
  private container: HTMLElement;
  private inputField: HTMLInputElement;
  private queryWidget: HTMLElement | null = null;
  
  getCapabilities(): PlatformCapabilities {
    return {
      richText: true,
      multipleInputFields: true,
      modalDialogs: true,
      inlineButtons: true,
      autocomplete: true,
      speechInput: 'webkitSpeechRecognition' in window,
      persistentUI: true
    };
  }
  
  presentQuery(query: QueryPresentation): void {
    // Create or update query widget
    this.queryWidget = this.createQueryWidget(query);
    
    if (query.type === QueryType.MULTIPLE_CHOICE && query.options) {
      // Create clickable buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'query-options';
      
      query.options.forEach((opt, i) => {
        const button = document.createElement('button');
        button.textContent = `${i + 1}. ${opt}`;
        button.onclick = () => this.submitResponse((i + 1).toString());
        buttonContainer.appendChild(button);
      });
      
      this.queryWidget.appendChild(buttonContainer);
    }
    
    // Update input field placeholder
    if (query.allowInterruption) {
      this.inputField.placeholder = 'Type answer or command...';
    } else {
      this.inputField.placeholder = 'Type your answer...';
    }
    
    // Add visual indicator
    this.inputField.classList.add('awaiting-response');
    
    // Focus management
    this.inputField.focus();
    
    // Accessibility
    this.inputField.setAttribute('aria-label', query.prompt);
  }
  
  private createQueryWidget(query: QueryPresentation): HTMLElement {
    const widget = document.createElement('div');
    widget.className = `query-widget query-${query.source}`;
    widget.innerHTML = `
      <div class="query-prompt">${this.escapeHtml(query.prompt)}</div>
      ${query.allowInterruption ? 
        '<div class="query-hint">You can answer or type a command</div>' : 
        ''}
    `;
    
    // Insert before input area
    this.container.insertBefore(widget, this.inputField.parentElement);
    
    // Smooth scroll to show widget
    widget.scrollIntoView({ behavior: 'smooth', block: 'end' });
    
    return widget;
  }
  
  setInputMode(mode: InputMode): void {
    this.inputField.classList.remove('mode-command', 'mode-responding', 'mode-blocked');
    this.inputField.classList.add(`mode-${mode}`);
    
    if (mode === InputMode.BLOCKED) {
      this.inputField.disabled = true;
    } else {
      this.inputField.disabled = false;
    }
  }
  
  showValidationError(error: string): void {
    // Show inline error below input
    const errorEl = document.createElement('div');
    errorEl.className = 'validation-error';
    errorEl.textContent = error;
    this.inputField.parentElement.appendChild(errorEl);
    
    // Remove after 3 seconds
    setTimeout(() => errorEl.remove(), 3000);
    
    // Shake animation
    this.inputField.classList.add('shake');
    setTimeout(() => this.inputField.classList.remove('shake'), 500);
  }
  
  clearQueryUI(): void {
    if (this.queryWidget) {
      // Fade out and remove
      this.queryWidget.classList.add('fade-out');
      setTimeout(() => {
        this.queryWidget?.remove();
        this.queryWidget = null;
      }, 300);
    }
    
    this.setInputMode(InputMode.COMMAND);
    this.inputField.placeholder = 'Enter command...';
  }
}
```

#### Electron Implementation
```typescript
class ElectronAdapter implements PlatformUIAdapter {
  private mainWindow: BrowserWindow;
  private conversationPanel: BrowserWindow | null = null;
  
  getCapabilities(): PlatformCapabilities {
    return {
      richText: true,
      multipleInputFields: true,
      modalDialogs: true,
      inlineButtons: true,
      autocomplete: true,
      speechInput: true,
      persistentUI: true  // Can use separate windows
    };
  }
  
  presentQuery(query: QueryPresentation): void {
    if (query.source === QuerySource.SYSTEM || !query.allowInterruption) {
      // Use native dialog for system queries
      this.showNativeDialog(query);
    } else {
      // Use in-game panel for game queries
      this.showConversationPanel(query);
    }
  }
  
  private showNativeDialog(query: QueryPresentation): void {
    if (query.type === QueryType.YES_NO) {
      const choice = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'question',
        buttons: ['Yes', 'No'],
        defaultId: 0,
        message: query.prompt
      });
      
      this.submitResponse(choice === 0 ? 'yes' : 'no');
    } else if (query.type === QueryType.MULTIPLE_CHOICE && query.options) {
      const choice = dialog.showMessageBoxSync(this.mainWindow, {
        type: 'question',
        buttons: query.options,
        defaultId: 0,
        message: query.prompt
      });
      
      this.submitResponse(choice.toString());
    } else {
      // Fall back to in-game panel for free text
      this.showConversationPanel(query);
    }
  }
  
  private showConversationPanel(query: QueryPresentation): void {
    if (!this.conversationPanel) {
      // Create floating panel
      this.conversationPanel = new BrowserWindow({
        width: 400,
        height: 200,
        parent: this.mainWindow,
        modal: false,
        show: false,
        frame: false,
        transparent: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, 'conversation-preload.js')
        }
      });
      
      this.conversationPanel.loadFile('conversation-panel.html');
    }
    
    // Send query to panel
    this.conversationPanel.webContents.send('show-query', query);
    
    // Position near game output
    const [x, y] = this.mainWindow.getPosition();
    const [width, height] = this.mainWindow.getSize();
    this.conversationPanel.setPosition(
      x + width - 420,
      y + height - 250
    );
    
    this.conversationPanel.show();
    this.conversationPanel.focus();
  }
  
  setInputMode(mode: InputMode): void {
    // Update main window's input state
    this.mainWindow.webContents.send('input-mode-changed', mode);
    
    // Update conversation panel if open
    if (this.conversationPanel) {
      this.conversationPanel.webContents.send('input-mode-changed', mode);
    }
  }
  
  clearQueryUI(): void {
    if (this.conversationPanel) {
      this.conversationPanel.hide();
    }
    this.setInputMode(InputMode.COMMAND);
  }
}
```

### Conversation Flow Integration

```typescript
// Central conversation coordinator
class ConversationCoordinator {
  private core: ConversationCore;
  private adapter: PlatformUIAdapter;
  
  constructor(platform: 'cli' | 'web' | 'electron') {
    this.core = new ConversationCore();
    
    // Create appropriate adapter
    switch (platform) {
      case 'cli':
        this.adapter = new CLIAdapter();
        break;
      case 'web':
        this.adapter = new WebAdapter();
        break;
      case 'electron':
        this.adapter = new ElectronAdapter();
        break;
    }
    
    // Wire up events
    this.setupEventHandlers();
  }
  
  private setupEventHandlers(): void {
    // Query events from core
    this.core.eventBus.on('query:pending', (query) => {
      this.adapter.presentQuery(query);
    });
    
    this.core.eventBus.on('query:cancelled', () => {
      this.adapter.clearQueryUI();
    });
    
    this.core.eventBus.on('validation:error', (error) => {
      this.adapter.showValidationError(error);
    });
    
    this.core.eventBus.on('input:mode', (mode) => {
      this.adapter.setInputMode(mode);
    });
  }
  
  processInput(input: string): void {
    const result = this.core.queryManager.processInput(input);
    
    switch (result.type) {
      case 'command':
        // Normal command processing
        this.core.processCommand(result.input);
        break;
        
      case 'response_processed':
        // Query was answered
        this.adapter.clearQueryUI();
        break;
        
      case 'reminder':
        // Player tried to interrupt non-interruptible query
        this.adapter.showValidationError(result.message);
        break;
        
      case 'invalid':
        // Invalid response to query
        this.adapter.showValidationError(result.message);
        break;
    }
  }
}
```

### Platform-Specific Features

#### CLI Features
- **Tab completion** for disambiguation choices
- **Command history** that excludes query responses
- **ANSI colors** to distinguish prompts from game text
- **Readline integration** for better input handling

#### Web Features
- **Rich HTML** for formatted queries
- **Clickable options** for multiple choice
- **Inline error messages** with animations
- **Speech-to-text** for accessibility
- **Persistent query widgets** that don't scroll away
- **Keyboard shortcuts** (numbers for choices)

#### Electron Features
- **Native dialogs** for system-level queries
- **Floating panels** for non-blocking queries
- **Window management** to prevent focus issues
- **OS integration** (notifications, taskbar progress)
- **IPC communication** between windows
- **Accessibility APIs** for screen readers

## Consequences

### Positive
- **Platform Excellence**: Each platform uses its best UI patterns
- **Consistent Core**: Same conversation logic everywhere
- **Progressive Enhancement**: Better platforms get richer UI
- **Accessibility**: Each platform can optimize for its a11y APIs
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new platforms (mobile, voice)

### Negative
- **Complexity**: Three different UI implementations
- **Testing**: Must test each platform separately
- **Consistency**: Risk of platforms diverging in behavior
- **Development Time**: More code to write and maintain

### Neutral
- **Platform Teams**: Might need specialists for each platform
- **Design System**: Need consistent visual language across platforms
- **Documentation**: Must document platform differences

## Implementation Guidelines

### Shared Components
```typescript
// Shared query formatting
class QueryFormatter {
  static formatPrompt(query: QueryPresentation, caps: PlatformCapabilities): string {
    if (caps.richText) {
      return this.richFormat(query);
    }
    return this.plainFormat(query);
  }
  
  static formatOptions(options: string[], caps: PlatformCapabilities): string[] {
    if (caps.inlineButtons) {
      return options; // Platform will create buttons
    }
    // Add numbers for text-only platforms
    return options.map((opt, i) => `${i + 1}. ${opt}`);
  }
}
```

### Platform Detection
```typescript
class PlatformDetector {
  static detectPlatform(): 'cli' | 'web' | 'electron' {
    if (typeof process !== 'undefined' && process.versions?.electron) {
      return 'electron';
    }
    if (typeof window !== 'undefined') {
      return 'web';
    }
    return 'cli';
  }
  
  static isHeadless(): boolean {
    return typeof process !== 'undefined' && !process.stdout.isTTY;
  }
}
```

### Testing Strategy
```typescript
// Platform-agnostic tests
describe('ConversationCore', () => {
  it('handles disambiguation across all platforms', async () => {
    for (const platform of ['cli', 'web', 'electron']) {
      const coordinator = new ConversationCoordinator(platform);
      // Test same flow on each platform
    }
  });
});

// Platform-specific tests
describe('WebAdapter', () => {
  it('creates clickable buttons for choices', () => {
    // Web-specific UI testing
  });
});
```

## Migration Path

1. **Phase 1**: Implement core conversation system
2. **Phase 2**: CLI adapter (simplest, text-only)
3. **Phase 3**: Web adapter (most common platform)
4. **Phase 4**: Electron adapter (richest experience)
5. **Phase 5**: Mobile considerations (future)

## Alternatives Considered

### 1. Lowest Common Denominator
Use only features available on all platforms.
- **Pros**: Consistent experience
- **Cons**: Misses platform strengths

### 2. Web-Only with Terminal Emulation
Build everything as web, emulate terminal for CLI.
- **Pros**: Single codebase
- **Cons**: Poor CLI experience, performance overhead

### 3. Separate Applications
Completely different apps per platform.
- **Pros**: Perfect for each platform
- **Cons**: Massive duplication, maintenance nightmare

### 4. Framework Abstraction
Use framework like React Native for all platforms.
- **Pros**: Some code sharing
- **Cons**: Compromises on each platform, complexity

## References
- Vorple (Inform 7 web UI extensions)
- Lectrote (Electron IF interpreter)
- Gargoyle (multi-platform IF interpreter)
- Discord/Slack's platform-specific features
- VS Code's multi-platform architecture

## Future Considerations

- **Mobile Platforms**: iOS/Android native apps
- **Voice Platforms**: Alexa/Google Assistant integration
- **VR/AR**: Spatial conversation interfaces
- **Multiplayer**: Shared conversation states
- **Cloud Sync**: Conversation state across devices
- **Plugins**: Third-party platform adapters
