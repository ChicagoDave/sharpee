# ADR-142: Conversation System

## Status: DRAFT

## Date: 2026-04-03

## Context

### The Problem

ADR-141 defines a rich character model — personality, disposition, mood, threat, cognitive profiles, knowledge, beliefs, goals. That model drives all NPC behavior. This ADR defines how **conversation** specifically consumes that character model: how the player interacts with NPCs through dialogue, how authored responses are selected based on character state, how conversation flows across multiple exchanges, and how the system connects to the language layer.

### What Exists Today

- **ADR-102**: Dialogue extension architecture — stdlib routes ASK/TELL/SAY/TALK TO to registered extensions. Proposes simple, threaded, and menu extensions.
- **Talking action** (`stdlib`): Basic "talk to NPC" with greeting state and first-meeting detection.
- **ASK/TELL actions**: Removed from stdlib, intended to live in extensions.
- **SAY action** (Dungeo): Story-level action routing speech to NPCs via `onSpokenTo`.
- **Grammar**: SAY, ASK, TELL, TALK TO patterns defined in `parser-en-us`.

### Design Principles

**The author has a vision.** The conversation system is a constraint solver, not a generator. The author writes all possible responses and tags them with conditions. The character model (ADR-141) selects the right one. No procedural generation, no surprises the author didn't plan for.

**Conversation is a projection of character state, not a dialogue database.** The system does not store dialogue trees. It evaluates character state against authored constraints to select responses at runtime.

**The character model is upstream.** This system reads from ADR-141's character state. It does not own personality, mood, knowledge, or cognitive profiles — it consumes them.

## Decision

### 1. Constraint-Based Response Selection

The author writes all possible responses for each topic and attaches constraints. The system evaluates the NPC's current character state (ADR-141) and selects the response whose constraints best match.

**Constraints** are predicate expressions from ADR-141's predicate registry:

```typescript
.when('asked about murder')
  .if('trusts player', 'not threatened')
  .tell('murder-truth-full')

  .if('loyal to lady-grey')
  .lie('murder-blame-gardener')

  .if('threatened', 'cowardly')
  .confess('murder-breaks-down')

  .otherwise()
  .deflect('murder-deflects')
```

**Selection rules:**
1. Evaluate all response constraints against current character state
2. Discard responses whose constraints are not satisfied
3. Among remaining responses, select by author-assigned priority (explicit ordering in the builder — first match wins within a priority tier)
4. If no constraints match, fall through to a default response

Note: "most specific wins" (counting constraints) was considered and rejected. It produces surprising results when constraints have different semantic weights. Explicit author priority is clearer and more predictable.

**Response actions** — the output of constraint evaluation is not text but a response intent:

```typescript
type ResponseAction =
  | 'tell'        // share the information truthfully
  | 'omit'        // knows but doesn't mention
  | 'lie'         // provides false information
  | 'deflect'     // changes the subject
  | 'refuse'      // explicitly won't answer
  | 'ask back'    // turns the question around
  | 'confess'     // reveals previously hidden truth
  | 'confabulate'; // fills gaps with invented details (NPC believes them)
```

The system records which response action was taken for each topic. This feeds back into character state — the NPC knows it lied, the system tracks it, and future constraints can reference it (`'lied about murder'`).

### 2. Topic Resolution

The player types free text (`ASK MARGARET ABOUT THE KILLING`). The system must resolve this to an authored topic. This is where the guess-the-noun problem lives.

**Topic definition:**

Authors define topics with keyword sets and optional relationships:

```typescript
conversation.topic('murder', {
  keywords: ['murder', 'killing', 'death', 'stabbing', 'what happened'],
  related: ['weapon', 'victim', 'motive', 'alibi']  // topic neighborhood
})

conversation.topic('weapon', {
  keywords: ['weapon', 'knife', 'blade', 'dagger'],
  related: ['murder', 'evidence']
})
```

**Resolution algorithm:**
1. Extract topic text from parser (raw text after "about")
2. Match against keyword sets (exact word match, stemming, synonyms)
3. If exact match → select that topic
4. If no exact match but related topic match → NPC redirects: "I don't know about the knife specifically, but I can tell you what I saw"
5. If no match at all → default "doesn't know about that" response
6. Score-based disambiguation when multiple topics match — the topic with the most keyword hits wins

**Topic availability:**

Not all topics are always available. Topics can be gated by character state:

```typescript
conversation.topic('alibi', {
  keywords: ['alibi', 'where were you'],
  availableWhen: ['knows murder']  // only after murder is established
})
```

### 3. Conversation Flow and Momentum

Individual exchanges (ask → respond) are insufficient. Real conversations have flow — context carries between turns.

**Conversation context:**

After an NPC responds, the system sets a **conversation context** that influences the next exchange:

```typescript
.when('asked about murder')
  .if('threatened', 'cowardly')
  .confess('murder-breaks-down')
  .setsContext('confessing')       // next turn is in "confessing" context
```

**Context effects:**
- Follow-up questions within the context get context-aware responses
- The NPC may continue unprompted if the context has continuation content
- Changing topics clears the context (the NPC notices the subject change)
- Context decays after N turns of non-conversation (configurable per NPC)

**NPC continuation:**

Within a context, the NPC can continue speaking on subsequent turns without being prompted:

```typescript
.when('in context confessing')
  .after(1, 'murder-confession-part-2')   // next turn
  .after(2, 'murder-confession-part-3')   // turn after that
  .thenClears()                            // context ends
```

**NPC initiative:**

NPCs can initiate conversation based on character state:

```typescript
npc.character('margaret')
  .initiates('when player enters', {
    if: ['trusts player', 'knows murder', 'not told player about murder'],
    says: 'margaret-approaches-player'
  })
  .initiates('after 3 turns in same room', {
    if: ['nervous', 'knows murder'],
    says: 'margaret-fidgets-nervously'
  })
```

### 4. Confrontation Mechanic

The player can present information to an NPC, not just request it. `TELL MARGARET ABOUT THE BLOODSTAIN` is different from `ASK MARGARET ABOUT THE MURDER` — the player is providing evidence.

**How the character model processes incoming information:**

```typescript
.when('told about bloodstain')
  .if('lied about murder')
  .updatesState({ threat: +30 })    // caught in a lie
  .confess('murder-caught-by-evidence')
  .setsContext('caught')

  .if('not knows murder')
  .tell('bloodstain-shocked')        // genuinely new information
  .learnsAbout('murder')             // updates knowledge

  .if('loyal to lady-grey', 'knows murder')
  .deflect('bloodstain-dismisses')   // loyal, won't engage
```

**Evidence tracking:**

The system tracks what evidence the player has presented to each NPC. This enables:
- NPCs react differently when presented with evidence they've already seen
- NPCs can reference previously presented evidence in later responses
- Cross-referencing: presenting NPC A's statement to NPC B

### 5. Memory and Conversation History

The system automatically tracks:

- **What was discussed**: Which topics the player asked about, in what order
- **What was said**: Which response action the NPC took for each topic (told, lied, omitted, etc.)
- **What was presented**: What evidence/information the player told the NPC about
- **Contradictions**: When a response contradicts a previous response to the same player
- **Cross-NPC consistency**: Whether two NPCs gave conflicting accounts of the same fact

This tracking is platform-level — the author doesn't implement it. It enables:

- NPCs that say "I already told you about that"
- NPCs caught in lies when the player returns with evidence
- NPCs that change their story when their state changes (threat increases, loyalty breaks)
- Mystery gameplay where the player cross-references accounts

### 6. Anti-Corruption Layer to Language

The character model (ADR-141) and the conversation system produce a structured **response intent**. The language layer (`lang-en-us`) produces prose. These are separate bounded contexts.

An anti-corruption layer translates between them:

```
Character State + Conversation → Response Intent → ACL → Language Layer → Prose
```

The response intent structure:

```typescript
interface ResponseIntent {
  action: ResponseAction;       // tell, lie, deflect, confabulate, ...
  topic: string;                // the topic being discussed
  messageId: string;            // author-assigned message ID
  mood: Mood;                   // current NPC mood (for tone selection)
  coherence: Coherence;         // current coherence (for sentence structure)
  context?: string;             // conversation context if active
}
```

The ACL handles:
- **Intent → message ID mapping**: The author's message ID is primary; mood and coherence select variants
- **Mood variant selection**: Same message, different tone. `murder-truth-full` has `.calm`, `.nervous`, `.panicked` variants if the author provides them
- **Cognitive coloring**: `coherence: 'fragmented'` → language layer applies broken sentence patterns; `coherence: 'drifting'` → mid-sentence topic shifts; `selfModel: 'fractured'` → detached, third-person references
- **Convention enforcement**: Neither the character model nor the language layer couples to the other's structure

This keeps the character model portable across locales and the language layer free to evolve its prose independently.

### 7. Relationship to ADR-102

ADR-102 defines the dialogue extension interface — how stdlib actions delegate to conversation handlers. This system implements that interface:

```typescript
class CharacterModelDialogue implements DialogueExtension {
  handleAsk(npcId, aboutText, context): DialogueResult {
    const characterState = getCharacterState(npcId);
    const topic = resolveTopic(aboutText);
    const response = evaluateConstraints(characterState, topic);
    recordResponse(npcId, topic, response);
    updateCharacterState(npcId, response);
    const intent = buildResponseIntent(response, characterState);
    return { handled: true, effects: translateToEffects(intent) };
  }

  handleTell(npcId, aboutText, context): DialogueResult {
    // Confrontation path — player presenting information
    const characterState = getCharacterState(npcId);
    const topic = resolveTopic(aboutText);
    const response = evaluateConfrontation(characterState, topic);
    recordPresentation(npcId, topic);
    updateCharacterState(npcId, response);
    const intent = buildResponseIntent(response, characterState);
    return { handled: true, effects: translateToEffects(intent) };
  }
}
```

Simple stories can still use a keyword-based dialogue extension (ADR-102's `@sharpee/dialogue-simple`). The character model dialogue extension is for stories that need depth.

### 8. Conversation Builder

The conversation builder extends the character builder (ADR-141) with conversation-specific configuration:

```typescript
npc.character('margaret')
  // Character state (ADR-141)
  .personality('very honest', 'very loyal', 'cowardly')
  .knows('murder', { witnessed: true })
  .loyalTo('lady-grey')
  .likes('player')
  .mood('nervous')

  // Conversation responses (ADR-142)
  .when('asked about murder')
    .if('trusts player', 'not threatened')
    .tell('murder-truth-full')

    .if('loyal to lady-grey')
    .lie('murder-blame-gardener')

    .if('threatened', 'cowardly')
    .confess('murder-breaks-down')
    .setsContext('confessing')

    .otherwise()
    .deflect('murder-deflects')

  .when('asked about lady-grey')
    .if('loyal to lady-grey', 'not cornered')
    .omit('lady-grey-innocent-act')

    .if('cornered')
    .confess('lady-grey-truth')

  // Confrontation responses (ADR-142)
  .when('told about bloodstain')
    .if('lied about murder')
    .confess('murder-caught-by-evidence')
    .setsContext('caught')

  // State transitions (ADR-141)
  .on('player threatens')
    .becomes('panicked')
    .feelsAbout('player', 'wary of')

  .on('player shows evidence')
    .if('lied about murder')
    .becomes('cornered')
    .shift('threat', 'threatened')
```

**A character with a cognitive profile in conversation:**

```typescript
npc.character('eleanor')
  // Character state (ADR-141)
  .personality('very curious', 'honest', 'slightly paranoid')
  .cognitiveProfile('schizophrenic')
  .likes('player')
  .mood('anxious')
  .knows('murder', { witnessed: true })

  .lucidity({ /* ... as defined in ADR-141 ... */ })

  .perceives('shadow-figure-in-library', {
    when: 'hallucinating',
    as: 'witnessed',
    content: 'shadow-figure'
  })

  // Conversation responses vary by cognitive state (ADR-142)
  .when('asked about murder')
    .if('lucid')
    .tell('murder-clear-account')

    .if('fragmented')
    .confabulate('murder-pieces')

    .if('hallucinating')
    .tell('murder-with-voices')

    .if('dissociative')
    .deflect('murder-who-are-you')

  .when('asked about shadow figure')
    .if('perceives shadow-figure', 'not lucid')
    .tell('shadow-figure-real')

    .if('lucid')
    .tell('shadow-figure-unsure')
```

## Consequences

### Positive

- Authors describe how characters respond, not dialogue trees — constraints on character state, not branching paths
- Unreliable conversation falls out naturally from the character model — no special-case code
- Topic neighborhoods reduce guess-the-noun frustration
- Conversation flow (context, continuation, NPC initiative) makes multi-turn exchanges feel natural
- Confrontation mechanic enables mystery/investigation gameplay as a first-class pattern
- Platform-level history tracking (contradictions, cross-NPC consistency) removes boilerplate from authors
- ACL keeps character model and language layer independently evolvable
- Deterministic and testable — every response is authored, system just selects

### Negative

- Higher implementation cost than simpler dialogue systems
- Topic resolution adds a layer of indirection between player input and authored responses
- Conversation flow (context, continuation) adds state that must be saved/restored
- Authors must define topics and keyword sets in addition to responses

### Neutral

- The conversation system is opt-in — stories can still use ADR-102's simple/threaded/menu extensions
- The builder API will evolve through iteration; this ADR defines the model, not the final syntax
- The confrontation mechanic (TELL) is available but not required — authors use it for mystery games, ignore it for simpler stories

## Implementation Layers

### Layer 1: Topic Registry and Resolution (new `@sharpee/character` package)
- Topic definition with keywords and relationships
- Resolution algorithm (keyword matching, stemming, neighborhood fallback)
- Topic availability gating

### Layer 2: Constraint Evaluation (new `@sharpee/character` package)
- Response constraint evaluation against character state predicates
- Priority-based selection
- Response recording and contradiction detection
- Evidence/presentation tracking

### Layer 3: Conversation Flow (new `@sharpee/character` package)
- Conversation context management
- NPC continuation scheduling
- NPC initiative triggers
- Context decay

### Layer 4: Anti-Corruption Layer (new `@sharpee/character` package)
- Response intent construction
- Translation to language layer message IDs
- Mood variant selection
- Cognitive coloring rules

### Layer 5: Language Layer Integration (`lang-en-us`)
- Response intent to prose mapping
- Mood-colored text variations
- Cognitive speech patterns (fragmented, drifting, detached)
- Response action vocabulary (tell, lie, deflect, etc.)

### Layer 6: Dialogue Extension (`@sharpee/character` or `@sharpee/extension-conversation`)
- `CharacterModelDialogue` implementing ADR-102's `DialogueExtension` interface
- ASK handler (information request)
- TELL handler (confrontation/information presentation)
- SAY handler (free speech routing)
- TALK TO handler (conversation initiation)

## Open Questions

1. **How should topic stemming and synonym matching work?** Should the platform provide basic English stemming, or delegate to the parser's existing vocabulary system? The parser already resolves synonyms for objects — can that mechanism be reused for conversation topics?

2. **Should conversation context be visible to the player?** When an NPC is in a "confessing" context, should the player see cues like "Margaret seems ready to say more"? (Likely author-configurable, similar to ADR-141's resolved question 9.)

3. **How deep should cross-NPC consistency tracking go?** Tracking that two NPCs gave different accounts of the same event is straightforward. Tracking that NPC A's lie is consistent with NPC B's omission is harder. Where's the line?

4. **Should the system support NPC-to-NPC conversation?** Two NPCs talking to each other in the player's presence. This is distinct from ADR-141's gossip/propagation question — it's about dialogue performance, not information flow.

5. **How should the Clue tutorial handle randomized topic content?** If the murderer changes each playthrough, the authored responses need to be parameterized — "I saw {murderer} near the {room}" rather than hardcoded names. How does the response intent system handle parameterized messages?

## References

- ADR-070: NPC System Architecture
- ADR-090: Entity-Centric Action Dispatch (Capability Dispatch)
- ADR-102: Dialogue Extension Architecture
- ADR-141: Character Model (upstream — this system consumes it)
- `docs/work/forge/conversation-systems-survey.md`: Comprehensive survey of IF conversation systems
- TADS 3: TopicEntry scoring, ConvNode threading, topic inventory
- Emily Short's Threaded Conversation: Quip graphs, directly/indirectly-follows, availability rules
- Heaven's Vault (Inkle): Dynamic relevance engine, topic windowing
