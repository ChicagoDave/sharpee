# Ch 08 — Light & Dark: edit proposals

Clean prose; entirely em-dash removal. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: Walk in without a light and you can't see a thing — no description, no animals, nothing to interact with but the way back out.
NEW: Walk in without a light and you can't see a thing: no description, no animals, nothing to interact with but the way back out.

### 2. "Dark rooms" — emdash
OLD: They can't examine, take, or touch anything — the only move available is to leave.
NEW: They can't examine, take, or touch anything; the only move available is to leave.

### 3. "The flashlight pattern" — emdash
OLD: A flashlight is three traits stacked — the composability lesson from earlier chapters, applied again:
NEW: A flashlight is three traits stacked, the composability lesson from earlier chapters applied again:

### 4. "The flashlight pattern" numbered list — emdash
OLD: 2. `LightSourceTrait.isLit` becomes `true` — the engine links the two.
NEW: 2. `LightSourceTrait.isLit` becomes `true`; the engine links the two.

### 5. "The mistake everyone makes once" box — emdash
OLD: A switch with no `LightSourceTrait` just toggles on and off and lights nothing — and a `LightSourceTrait` with no switch is *always* lit.
NEW: A switch with no `LightSourceTrait` just toggles on and off and lights nothing, and a `LightSourceTrait` with no switch is *always* lit.

### 6. "Other light-source patterns" — emdash
OLD: **Always-on light** (a glowing gem, an enchanted sword) — no switch, just lit:
NEW: **Always-on light** (a glowing gem, an enchanted sword): no switch, just lit:

### 7. "Other light-source patterns" — emdash
OLD: **Adjustable light** (a lantern with a dimmer) — set `brightness` high and let story code change it dynamically:
NEW: **Adjustable light** (a lantern with a dimmer): set `brightness` high and let story code change it dynamically:

### 8. "Darkness as a gate" — emdash (x2)
OLD: Objects inside a dark room exist the whole time — they're simply inaccessible until there's light.
NEW: Objects inside a dark room exist the whole time; they're simply inaccessible until there's light.

### 9. "Darkness as a gate" — emdash
OLD: The flashlight here, a candle elsewhere, a magic spell in another game — same shape, different flavor.
NEW: The flashlight here, a candle elsewhere, a magic spell in another game: same shape, different flavor.

### 10. "Wiring it into the zoo" — emdash
OLD: Two new traits arrive this chapter — add them to your world-model import:
NEW: Two new traits arrive this chapter, so add them to your world-model import:

### 11. Code comment (the animals) — emdash
OLD: `// The animals — scenery, examinable only once the room is lit.`
NEW: `// The animals: scenery, examinable only once the room is lit.`

### 12. After the room code — emdash
OLD: The flashlight from earlier in the chapter sits in the Supply Room, ready to carry in — so `examine owl` and `examine gliders` in the walkthrough below both resolve once the light is on.
NEW: The flashlight from earlier in the chapter sits in the Supply Room, ready to carry in, so `examine owl` and `examine gliders` in the walkthrough below both resolve once the light is on.

### 13. Key takeaway — emdash (still contains an em dash; not handled by the locked pass)
OLD: A flashlight is just an item carrying both — switch it on, take it in, and the darkness lifts.
NEW: A flashlight is just an item carrying both: switch it on, take it in, and the darkness lifts.
