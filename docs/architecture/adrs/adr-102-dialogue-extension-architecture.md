# ADR-102: Dialogue Extension Architecture

## Status

Proposed

## Context

Parser IF has many approaches to NPC dialogue: ASK/TELL keyword systems, menu-based conversation, quip graphs with threading, and more. Rather than baking one approach into stdlib, Sharpee should define an extension point that allows stories to plug in the dialogue system appropriate for their needs.

Dungeo's needs are minimal (SAY for puzzle answers, perhaps basic ASK/TELL), but other stories may want sophisticated conversation trees, relationship tracking, or NPC-initiated dialogue.

## Decision

### Stdlib Provides Thin Action Shells

Stdlib defines ASK, TELL, SAY, and TALK TO actions that:

1. Validate basic preconditions (target is present)
2. Extract raw input (the topic text or spoken words)
3. Delegate to a registered dialogue extension
4. Fall back to a default response if no extension handles it

```typescript
// stdlib asking action - execute phase
execute(context) {
  const { targetId, aboutText } = context.sharedData;

  const extension = world.getDialogueExtension();
  if (extension) {
    const result = extension.handleAsk(targetId, aboutText, context);
    if (result.handled) {
      context.sharedData.dialogueResult = result;
      return;
    }
  }

  // No extension or extension didn't handle it
  context.sharedData.dialogueResult = { handled: false };
}

// report phase
report(context) {
  const result = context.sharedData.dialogueResult;
  if (result?.handled) {
    return result.effects;
  }
  // Default: talking to yourself
  return [describeAction('if.action.asking.no_response')];
}
```

Default message (lang-en-us): "Talking to yourself is a sign of impending mental collapse."

### Dialogue Extension Interface

Extensions implement a minimal interface:

```typescript
interface DialogueExtension {
  /**
   * Handle ASK [npc] ABOUT [text]
   * Extension resolves text to topic internally.
   */
  handleAsk(
    npcId: EntityId,
    aboutText: string,
    context: ActionContext
  ): DialogueResult;

  /**
   * Handle TELL [npc] ABOUT [text]
   */
  handleTell(
    npcId: EntityId,
    aboutText: string,
    context: ActionContext
  ): DialogueResult;

  /**
   * Handle SAY [text] or SAY [text] TO [npc]
   * npcId may be undefined for untargeted speech.
   */
  handleSay(
    npcId: EntityId | undefined,
    spokenText: string,
    context: ActionContext
  ): DialogueResult;

  /**
   * Handle TALK TO [npc]
   */
  handleTalkTo(
    npcId: EntityId,
    context: ActionContext
  ): DialogueResult;
}

interface DialogueResult {
  handled: boolean;
  effects?: Effect[];
  // Extension-specific data
  [key: string]: unknown;
}
```

### Story Owns Topic Definitions

Topics are story content, not stdlib concepts. Extensions define how topics work:

```typescript
// Example: simple keyword-based extension
const dialogue = new SimpleDialogue();

dialogue.defineTopic('dungeo.topic.sceptre', {
  keywords: ['sceptre', 'staff', 'rod', 'wand'],
});

dialogue.defineResponse('dungeo.npc.wizard', 'dungeo.topic.sceptre', {
  response: 'if.msg.wizard_sceptre_response',
  onceOnly: true,
});
```

Topic IDs follow the namespace convention: `{story}.topic.{name}`

### One Extension Per Story

A story registers exactly one dialogue extension. If different NPCs need different conversation styles, the extension handles that internally.

```typescript
// stories/dungeo/src/index.ts
initializeWorld(world: WorldModel) {
  const dialogue = new SimpleDialogue(dungeoTopicConfig);
  world.registerDialogueExtension(dialogue);
}
```

### Extension Owns Conversability

Stdlib does not define a ConversableTrait. The extension determines which entities can be conversed with:

```typescript
// Inside extension
handleAsk(npcId, aboutText, context) {
  const npc = context.world.getEntity(npcId);

  // Extension decides what's conversable
  if (!this.isConversable(npc)) {
    return { handled: false };
  }

  // ... handle conversation
}
```

This allows extensions to use traits, tags, or any other mechanism.

### Grammar Patterns

Stdlib grammar (parser-en-us) defines the command patterns:

```typescript
grammar
  .forAction('if.action.asking')
  .verbs(['ask'])
  .pattern(':npc about :topic')
  .where('npc', scope => scope.visible().animate())
  .where('topic', scope => scope.rawText())
  .build();

grammar
  .forAction('if.action.saying')
  .verbs(['say'])
  .pattern(':text')
  .pattern(':text to :npc')
  .where('text', scope => scope.quotedOrRawText())
  .where('npc', scope => scope.visible().animate())
  .build();
```

The `:topic` and `:text` slots capture raw text, not resolved entities. Topic resolution is the extension's job.

## Consequences

### Positive

- Stories choose dialogue complexity appropriate to their needs
- No stdlib bloat for unused dialogue features
- Extensions can be shared across stories as packages
- Clean separation: stdlib routes, extension handles

### Negative

- Stories wanting dialogue must include an extension
- No built-in conversation out of the box
- Extensions must handle all conversability logic

### Neutral

- Topic ID conventions are advisory, not enforced
- Extensions may or may not interoperate

## Extension Examples

### @sharpee/dialogue-simple

Keyword-to-response mapping. No state, no memory.

```typescript
const dialogue = new SimpleDialogue()
  .topic('troll', ['troll', 'monster', 'beast'])
  .response('wizard', 'troll', 'msg.wizard_about_troll')
  .response('*', 'troll', 'msg.generic_troll_response');
```

### @sharpee/dialogue-threaded

Quip-based with conversation flow, memory, suggestions.

```typescript
const dialogue = new ThreadedDialogue()
  .quip('q.murder', {
    keywords: ['murder', 'death', 'killing'],
    response: 'msg.detective_murder',
    leadsTo: ['q.weapon', 'q.alibi'],
    onceOnly: true,
  })
  .quip('q.weapon', {
    requires: 'q.murder',  // must discuss murder first
    // ...
  });
```

### @sharpee/dialogue-menu

Present numbered options, player selects.

```typescript
const dialogue = new MenuDialogue()
  .conversation('merchant', [
    { text: 'What do you sell?', response: 'msg.merchant_wares' },
    { text: 'Any rumors?', response: 'msg.merchant_rumors', requires: 'bought_something' },
    { text: 'Goodbye', ends: true },
  ]);
```

## References

- Emily Short's "Threaded Conversation" (Inform 7)
- Eric Eve's conversation extensions (TADS 3)
- ADR-090: Capability Dispatch (similar extension pattern)
