# Key Takeaway recalibration — proposed edits

Distill the end-of-chapter "Key takeaway" recitations while keeping each one's
single load-bearing *why* and its forward-momentum closing line. Originals are in
each chapter; these are the proposed replacements. Review / mark up before applying.

---

## 1. Ch 14 — Custom Actions
`parts/part-4/14-custom-actions.md` · ## Key takeaway

A custom action is an `Action` object with four phases. **Validate** checks whether the action can run. If it can, **execute** changes the world model as directed and **report** adds an event message to the turn's output; if it can't, **blocked** produces the failure message instead. Wiring it up takes three registrations: the action, its parser pattern, its language text. The object `context.sharedData` carries results between phases. Miss any one registration and the verb won't work.

---

## 2. Ch 15 — Capability Dispatch: One Verb, Many Rules
`parts/part-4/15-capability-dispatch.md`

### Title (line 1)

# Capability Dispatch: One Verb, Many Rules

### Opening paragraph

The custom feed action in the last chapter did the same thing to every animal: check for feed, mark it fed, print a message. But some verbs mean different things depending on *what* you apply them to. Petting the goats is affectionate so they lean into your hand. Petting the parrot is a mistake because it bites. The verb is the same; the outcome belongs to the animal. That's **capability dispatch**: one verb, many behaviors, and the entity decides which one runs.

### Key takeaway

Capability dispatch lets each entity carry its own rule for a verb. A custom trait declares the capability, a `CapabilityBehavior` implements the four phases over that trait's data, and `registerCapabilityBehavior()` links them. The dispatch action (yours, or one built by `createCapabilityDispatchAction()`) finds the trait claiming the capability and delegates to its behavior, so entities without the trait get the can't-do-that message for free.

---

## 3. Ch 16 — Custom Traits & Behaviors
`parts/part-4/16-custom-traits-and-behaviors.md` · ## Key takeaway

The world model keeps data and logic apart: a **trait** holds state and nothing else, while a **behavior** is pure static methods that read and mutate that state. Behaviors emit no text or events, which is what keeps them testable. Add a trait with `entity.add(...)` and namespace its type (`zoo.trait.…`), then let actions or event handlers call the behavior to decide *when* and *what to say*. Reach for a custom trait only when your story genuinely needs new state and logic. For reactions, verbs, or per-entity behavior, the lighter tools from earlier chapters fit better.

---

## 4. Ch 18 — The Language Layer
`parts/part-5/18-the-language-layer.md` · ## Key takeaway

All user-facing text lives in the language layer or in your story; code refers to messages by **ID**, never a literal string. Actions emit an ID plus `params`, and the prose pipeline resolves it to a template at turn end. Registering text means `addMessage` in `extendLanguage`, namespacing your IDs beside the platform's, and reusing an ID to override a standard message. That separation keeps intent in the code and the words in the language layer, and it is what makes a Sharpee story translatable, restyleable, and consistent.

---

## 5. Ch 19 — The Formatter Chain
`parts/part-5/19-the-formatter-chain.md` · ## Key takeaway

The formatter chain keeps English grammar in the template's placeholders, not your literal text. Article formatters (`{a:item}`, `{the:item}`) pick the right word from the entity's own metadata, which is why you pass the *entity*, not a bare name. Text formatters like `{cap:…}` handle capitalization, and you chain them with colons to stack more than one on a value, as in `{the:cap:item}`. Write one message, and it reads correctly for every object it's ever handed. With grammar, language, and formatting covered, the words side of Sharpee is complete.

---

## 6. Ch 20 — Non-Player Characters
`parts/part-6/20-non-player-characters.md` · ## Key takeaway

An NPC is an actor carrying `IdentityTrait`, `ActorTrait`, and `NpcTrait`, with a `behaviorId` that matches a registered behavior, whether you use a built-in such as `createPatrolBehavior` or write your own `NpcBehavior`, whose `onTurn` and `onPlayerEnters` return `NpcAction[]`. Nothing acts until `onEngineReady()` does *both*: registers the `NpcPlugin` with the engine and registers each behavior with its service.

---

## 7. Ch 22 — Timed Events & Daemons
`parts/part-6/22-timed-events-and-daemons.md` · ## Key takeaway

The `SchedulerPlugin` gives the world a clock once you register it in `onEngineReady()`. **Daemons** run every turn; gate them with a `condition`, and expose `getRunnerState`/`restoreRunnerState` so their closure state survives a save. **Fuses** count down and fire once (re-arming with `repeat`), but skip their first tick. Both narrate through `game.message` events, and both can cooperate through world state: a fuse can set the stage for a daemon to play out.

---

## 8. Ch 23 — Scoring & Endgame
`parts/part-6/23-scoring-and-endgame.md` · ## Key takeaway

`world.awardScore(id, …)` records an achievement, and the unique `id` makes it idempotent, so the same award never counts twice. Hang awards wherever the achievement actually happens, whether in custom actions, capability behaviors, or standard-action events via `chainEvent`, and let a high-priority **victory daemon** watch `getScore()` and trigger the ending when the maximum is reached. With scoring and an endgame in place, the zoo is a complete, winnable game.

---

## 9. Ch 24 — Channels
`parts/part-7/24-channels.md` · ## Key takeaway

Channels are the universal UI surface: every story-to-player signal (prose, status, prompt, media) travels as a named channel, and each turn the engine emits a packet of the ones that changed for the client to render. A channel's **mode** (`replace`/`append`/`event`) tells the renderer how its value behaves; the standard channels come free, and you add your own `IOChannel` in `registerChannels`, returning data, never UI. Because the wire is data-only, one story drives a terminal, a browser, or a multi-user server unchanged. That portability is the subject of the chapters ahead.

---

## 10. Ch 25 — The Web Client
`parts/part-7/25-the-web-client.md` · ## Key takeaway

The web client owns the page; the engine only emits channels. `BrowserClient` wires them with three calls and drives the screen from just two signals (one manifest, then one packet per turn) dispatched to per-channel renderers, with commands flowing back through `engine.executeTurn`. Because the UI is framework-free, you customize it the web-native way: restyle with CSS, or replace a view by re-registering a `ChannelRenderer`; save, restore, and theming come built in. With data flowing to a rendered page, the next two chapters turn to *how it looks*: decoration and theming, then media and audio.

---

## 11. Ch 26 — Decoration & Theming
`parts/part-7/26-decoration-and-theming.md` · ## Key takeaway

Style reaches the screen without ever putting HTML on the wire. **Decoration** marks prose with `[name:content]` brackets that become `sharpee-`-prefixed spans; markup says *what*, CSS says *how*. **Theming** paints a stable component vocabulary from sixteen `--theme-*` tokens, so a theme is just a `[data-theme]` block of variables, selected by a single flip. Offer a built-in by id in `sharpee.themes`, or ship your own in your override stylesheet. Even the status line is just the `location`/`score`/`turn` channels rendered into a bar you can restyle. Text and chrome covered, the final chapter adds the senses Sharpee has saved for last: images and sound.

---

## 12. Ch 27 — Media & Audio  (already approved wording)
`parts/part-7/27-media-and-audio.md` · ## Key takeaway

Media are expressed as channels: images and audio ride `image:*`, `sound`, `music`, and `ambient:*`. Media channels are **capability-gated**, so a text-only client never receives them, and you never branch on client support. You drive them by firing `media.*` events, and declare each room's atmosphere once with the `AudioRegistry`, emitting it on entry. With sight and sound in place, every signal rides the one universal surface: the channel system.

---

## 13. Ch 28 — The Multi-File Story
`parts/part-8/28-the-multi-file-story.md` · ## Key takeaway

As your story grows, one file becomes unwieldy. Split your story elements by **concern**: things that change together are sticky, so they belong in the same file. Each file exposes a builder and a typed set of IDs that flow forward through the build, so files stay decoupled and the `Story` class in `index.ts` is just a thin wiring layer. Version 17 proves the structure by adding a whole second act (the after-hours phase) without making any one file harder to read. The rest of this volume is about getting the zoo to players: testing, saving, building, and serving it.

---

## 14. Ch 29 — Transcript Testing & Walkthroughs
`parts/part-8/29-transcript-testing-and-walkthroughs.md` · ## Key takeaway

A transcript test replays a recorded sequence of commands through the real engine and checks each turn against assertions you write. **Unit transcripts** run in isolation on a fresh game; **walkthroughs** (`wt-*`, run with `--chain`) keep state across files to verify the whole game finishes. Assert on text, **events**, or **state**. State is the strongest, because it checks the mutation, not the message. Control-flow directives (`[GOAL]`, `[IF]`, `[WHILE]`, `[NAVIGATE TO]`) absorb the variation real play introduces. A green suite is your license to keep adding features without fear; next we make sure a player's *own* progress survives: saving and restoring.

---

## 15. Ch 30 — Saving & Restoring
`parts/part-8/30-saving-and-restoring.md` · ## Key takeaway

Save and restore come almost free because game state lives in the **world**: the engine serializes the whole thing into one `ISaveData` that rebuilds on restore, score and positions and flags and all. The one thing you handle yourself is **transient state held outside the world**: a closure flag or daemon counter is invisible to the snapshot, so expose it through `getRunnerState`/`restoreRunnerState`, as v17's behavior-swap daemon does. In the browser, saves are versioned `localStorage` envelopes, autosaved every turn. With the game tested and persistable, it's time to hand it to players: building and publishing.

---

## 16. Ch 31 — Building & Publishing
`parts/part-8/31-building-and-publishing.md` · ## Key takeaway

Single-player publishing produces one self-contained artifact. `sharpee build` compiles your story and emits a **`.sharpee` bundle**; `sharpee init-browser` then `sharpee build` wraps it in the framework-free browser client at **`dist/web/`**, a static `index.html` with no server and no install, which you host anywhere static files live and verify locally with any file server. Builds are fast because the platform is a pinned npm dependency, never rebuilt; every build is **version-stamped first** so the number always matches the artifact. That ships the game to one player in a browser, a complete and hostable artifact, and the finish line for the zoo you've built chapter by chapter.
