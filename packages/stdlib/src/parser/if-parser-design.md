# IF-Specific Parser Design

## Core Concepts

### 1. Grammar Patterns
Instead of linguistic analysis, we need pattern matching:

```typescript
interface GrammarPattern {
  pattern: string;              // "take|get|grab <noun>"
  action: string;               // "taking"
  prepositions?: string[];      // ["from", "off of"]
  matchOrder: MatchOrder;       // VERB_NOUN_PREP_SECOND or VERB_NOUN_SECOND
}
```

### 2. Disambiguation
When multiple objects match, we need to ask the player:

```typescript
interface DisambiguationContext {
  matches: ScoredMatch[];
  askPlayer(prompt: string): Promise<string>;
  autoSelect?: (matches: ScoredMatch[]) => Entity;
}
```

### 3. Scope Calculation
What objects are available for this command?

```typescript
interface Scope {
  visible: Set<Entity>;      // Can be seen
  reachable: Set<Entity>;    // Can be touched
  known: Set<Entity>;        // Player knows about
  special: Set<Entity>;      // Command-specific (e.g., topics for "ask about")
}
```

### 4. Pattern Matching Flow

1. **Tokenize** → Keep simple tokenization
2. **Match Grammar** → Find which patterns could match
3. **Calculate Scope** → What objects are available?
4. **Score Matches** → How well does each object match?
5. **Disambiguate** → If needed, ask which one
6. **Build Command** → Create the final command object

## Example Patterns

```typescript
// Basic object manipulation
"take|get|pick up <noun>"
"drop|put down <noun>"
"examine|x|look at|l at <noun>"

// Two-object commands  
"put|place <noun> in|into|inside <second>"
"give|offer <noun> to <second>"
"unlock <noun> with <second>"

// Movement
"go|walk|run <direction>"
"enter|go into <noun>"
"climb <noun>"

// Conversation
"ask <noun> about <topic>"
"tell <noun> about <topic>"
"say <text> to <noun>"

// Complex patterns
"take all|everything"
"take all|everything from|in <noun>"
"take all|everything but|except <noun>"
```

## Scoring System

Objects get scored based on:
- Word matches (exact > partial > synonym)
- Adjective matches
- Context (visible > reachable > known)
- Recency (recently mentioned > older)
- Specificity (more words matched = higher score)

## Multi-language Support

Each language provides:
1. Grammar patterns for common actions
2. Preposition lists
3. Article handling rules
4. Pronoun resolution rules
