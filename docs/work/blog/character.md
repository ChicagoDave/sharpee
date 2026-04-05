# Teaching NPCs to Think: Building the Character Model

Most interactive fiction engines treat NPCs as dialogue databases. You write a lookup table — if the player asks about the murder, say this; if they ask about the weather, say that. The NPC has no inner life. It doesn't know things, feel things, or change over time. It's a vending machine with better prose.

We wanted something different for Sharpee.

## Characters, Not Dialogue Trees

The core insight behind ADR-141 is that conversation is a *projection* of character state. What an NPC says depends on what they know, what they care about, how they feel about you, and what kind of person they are. If you model the character well enough, the right dialogue selection falls out naturally.

So we didn't build a conversation system. We built a character model.

Every NPC in Sharpee can now carry rich internal state: personality traits with intensity, directed dispositions toward specific entities, transient mood on a valence-arousal axis, situational threat assessment, a five-dimensional cognitive profile, a knowledge base with sourced facts, beliefs that may contradict those facts, and prioritized goals. The character model is opt-in — a simple guard who just blocks a doorway doesn't need it. But when you want an NPC with depth, the machinery is there.

## Words, Not Numbers

One thing we learned from studying systems like Versu and Storytron is that numeric authoring surfaces are hostile to writers. Nobody wants to set `disposition: 0.73` and then debug why the NPC isn't triggering the right response at 0.72. The internal model uses numbers, but the authoring surface is entirely word-based.

You write `personality('very honest', 'cowardly')` and the system knows what that means. You write `loyalTo('lady-grey')` and the disposition is set. You write `mood('nervous')` and the two-dimensional valence-arousal coordinate is resolved behind the scenes. When you need to query state, you ask in words too: `evaluate('trusts player')` or `evaluate('not threatened')`.

This extends to cognitive profiles. Instead of tweaking five separate numeric dimensions, you write `cognitiveProfile('ptsd')` and get a researched default — filtered perception, rigid belief formation, drifting coherence, episodic lucidity, uncertain self-model. Then you override the dimensions that don't fit your character. The presets are starting points, not straitjackets.

## The Five Dimensions of Mind

The cognitive profile system is the piece we're most excited about. No existing IF platform has modeled cognitive conditions as composable dimensions. We identified five axes that, in combination, can represent a wide range of mental states.

**Perception** determines what the NPC notices. Accurate perception means events are recorded as they happen. Filtered perception means some events are missed entirely — a character with PTSD might not register quiet actions behind them, but sudden movements hit with amplified impact. Augmented perception means the NPC perceives things that didn't happen. Hallucinations are author-defined: you specify what the character sees, under what conditions, and the system injects those perceived events into the NPC's knowledge base with the same conviction as real ones. The NPC can't tell the difference. The system can.

**Belief formation** governs how the NPC updates their worldview. A flexible character changes their mind when presented with evidence. A rigid character needs overwhelming proof. A resistant character doesn't just reject counter-evidence — they reinterpret it to fit their existing beliefs. Present a delusional NPC with proof they're wrong, and they'll explain why the proof actually supports what they already believe.

**Coherence** affects how the NPC maintains focus. A focused character stays on topic. A drifting character occasionally wanders to adjacent subjects. A fragmented character jumps between unrelated topics, mixes timeframes, and can't maintain a thread.

**Lucidity** models whether the cognitive profile is stable or shifts over time. Episodic lucidity means the character has discrete windows of clarity — they might be coherent and accurate for a few turns after the player calms them down, then gradually return to their baseline state. The author defines triggers (what causes a lucid window), transitions (immediate or next turn), and decay rates (how quickly baseline returns).

**Self-model** tracks the NPC's sense of identity. An intact self-model means the character knows who they are. An uncertain one means they question their own memories. A fractured one means they may not recognize themselves or maintain continuity between interactions.

These five dimensions compose. A character with schizophrenia has augmented perception, resistant beliefs, fragmented coherence, episodic lucidity, and an uncertain self-model. A character with dementia has filtered perception, rigid beliefs, fragmented coherence, fluctuating lucidity, and a fractured self-model. But a character who has schizophrenia *and has learned coping strategies* might have drifting coherence instead of fragmented — the author overrides the dimension that doesn't fit.

## Unreliable Witnesses for Free

Here's what falls out naturally from the model: unreliable narration. You don't implement unreliable witnesses as a special feature. They emerge from the character state.

A loyal character omits their patron's crimes — not because you coded an "omit" behavior, but because their high disposition toward the patron and their loyalty personality trait combine to select a response that protects the patron. A cowardly character under threat agrees with whatever the questioner says. A character with augmented perception reports hallucinated events with full conviction. A character whose beliefs resist counter-evidence reinterprets proof you present to them.

The taxonomy of unreliability maps directly to character configurations: the liar (goals motivate deception), the loyalist (disposition drives omission), the coward (threat plus personality), the delusional (resistant beliefs plus augmented perception), the traumatized (drifting coherence plus episodic lucidity), the confused (filtered perception plus fragmented coherence), the self-deceived (beliefs contradicting their own knowledge).

None of these required special-case code. They're all just character state evaluated through the same predicate system.

## The Observation Pipeline

Characters don't exist in a vacuum. They witness events and react. The observation system connects the world to the character model through the cognitive profile filter.

When something happens in a room where an NPC is present, the event passes through perception first. If the NPC has filtered perception, quiet events might be missed entirely while violent events are amplified — the threat increase is doubled, the mood shift hits harder. If the NPC has augmented perception, the event passes through normally, but the system may also inject hallucinated facts on the same turn.

After filtering, the event updates character state through a table of default transitions. Violence increases threat and shifts mood negative. Gifts improve disposition toward the giver. These defaults are a data table, not hardcoded logic — stories can swap in their own transition rules without touching the handler.

Lucidity triggers are checked against incoming events. If a PTSD character configured with a violence trigger witnesses an attack, their lucidity state shifts to "flashback" immediately. The cognitive profile changes — maybe perception becomes more filtered, coherence degrades further. Then, over subsequent turns, lucidity decays back to baseline.

The whole pipeline runs automatically. The author configures the character once, and the system handles event processing, state transitions, and lucidity management across turns.

## The Builder

All of this could be overwhelming, but the authoring surface is a fluent builder that reads almost like prose:

```typescript
new CharacterBuilder('margaret')
  .personality('very honest', 'very loyal', 'cowardly')
  .knows('murder', { witnessed: true })
  .loyalTo('lady-grey')
  .likes('player')
  .mood('nervous')

  .on('player threatens')
    .becomes('panicked')
    .feelsAbout('player', 'wary of')

  .on('lady-grey arrested')
    .becomes('grieving')
    .shift('threat', 'cornered')

  .compile()
```

That's a complete character definition. The builder compiles to trait data, trigger rules, and predicate registrations. Call `applyCharacter(entity, compiled)` and the NPC is alive.

For characters with cognitive conditions, the builder extends naturally:

```typescript
new CharacterBuilder('eleanor')
  .personality('very curious', 'honest', 'slightly paranoid')
  .cognitiveProfile('schizophrenic')
  .mood('anxious')
  .knows('murder', { witnessed: true })

  .lucidity({
    baseline: 'fragmented',
    triggers: {
      'player is calm': { target: 'lucid', transition: 'next turn' },
      'loud noise': { target: 'dissociative', transition: 'immediate' },
    },
    decay: 'gradual',
    decayRate: 'slow',
  })

  .perceives('shadow-figure-in-library', {
    when: 'hallucinating',
    as: 'witnessed',
    content: 'shadow-figure',
  })

  .compile()
```

Eleanor is a schizophrenic witness who has lucid windows when the player is calm, shatters into dissociation on loud noises, and sees shadow figures in the library when hallucinating. She reports those figures with the same certainty as real events. The player has to figure out which of her accounts to trust — and Eleanor herself can't help them with that distinction.

## What's Next

The character model is the foundation. It doesn't own conversation — it feeds it. ADR-142 defines how the conversation system specifically consumes character state to select authored responses, manage topic resolution, track contradictions, and handle confrontation mechanics. That's the next layer.

We're planning a Clue-style mystery tutorial as the proof-of-concept: six suspects with distinct character models, randomized guilt, and enough constraint density to stress-test the whole system at realistic NPC count. If the character model works for Clue — where every NPC has secrets, opinions about each other, and something to hide — it works generally.

The character model shipped today as `@sharpee/character` version 0.9.105 with 128 tests across three packages. Every mutation is verified against actual state, not just events. The authoring surface is words, the internals are numbers, and the two never leak into each other.

NPCs in Sharpee aren't vending machines anymore. They're people — flawed, biased, scared, loyal, delusional, and sometimes hallucinating shadow figures in the library. What they tell you depends on who they are. And who they are is something the author describes in a language that reads like character notes, not like code.
