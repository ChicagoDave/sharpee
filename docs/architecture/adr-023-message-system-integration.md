# ADR-023: Message System Integration

Date: 2025-07-12

## Status

Proposed

## Context

The Sharpee platform requires all text to go through the message system for internationalization support. This includes messages from extensions and game-specific content.

During our analysis, we discovered that the language provider (`@sharpee/lang-en-us`) already has:
- Comprehensive action message templates
- Failure message mappings
- System messages
- Support for message parameters and pluralization

## Decision

Message integration will follow a hierarchical approach:

1. **Core messages** - Built into language providers
2. **Extension messages** - Added by loaded extensions
3. **Story messages** - Author customizations

Later levels can override earlier ones.

## Message Key Conventions

Messages use a dot-notation hierarchy:
- `action.phase.key` - For action messages
- `extension.category.key` - For extension messages  
- `game.category.key` - For game-specific messages

Examples:
```
taking.check.already_have
scoring.report.basic
combat.attack.critical_hit
game.npc.wizard.greeting
```

## Extension Message Registration

Extensions register messages during initialization:

```typescript
interface LanguageProvider {
  // Existing methods...
  
  // Extension API
  addTemplates(templates: Record<string, string>): void;
  addFailureMessages(messages: Record<string, string>): void;
}

// Usage in extension
context.languageProvider.addTemplates({
  'combat.attack.hit': '{attacker} hits {target} for {damage} damage!',
  'combat.attack.miss': '{attacker} misses {target}.',
  'combat.attack.critical': 'Critical hit! {damage} damage!'
});
```

## Message Usage Pattern

All text output must use message keys:

```typescript
// ❌ WRONG
return "You can't take that.";

// ✅ RIGHT  
return createEvent(IFEvents.ACTION_FAILED, {
  messageKey: 'taking.check.cannot_take',
  item: entity.name
});
```

## Template Features

The message system supports:
- Parameter substitution: `{item}`
- Capitalization: `{item:cap}`
- Pluralization: `{count} turn{count|s}`
- Conditional text based on parameters

## Consequences

### Positive
- Full internationalization support
- Consistent message formatting
- Extensions integrate seamlessly
- Authors can override any message
- Type-safe message keys with TypeScript

### Negative  
- All text must go through templates (no ad-hoc strings)
- Message key discovery might be challenging
- Need tooling to validate message coverage

## Related

- ADR-002: Multi-language support
- ADR-022: Extension architecture
