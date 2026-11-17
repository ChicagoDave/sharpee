# Death: Sharpee Way vs Chord Way — side-by-side samples

Grammar shown = **Option A** (death message as the statement's phrase, `cause`/`chance`
as trailing clauses — consistent with `win`/`lose` phrases + ADR-217 `, once`). The
Sharpee column is grammar-independent (it's the real TS mechanism); only the Chord
column changes if we pick a different grammar. Every path ends at the same sink,
`killPlayer(world, player, {cause, messageId, terminal:true})`.

---

## 1. Deadly room (falls) — mechanism: **Trait + Behavior**

**Sharpee Way** — attach the built `DeadlyRoomTrait`; the engine's auto-registered
transformer + `deadly-room-death` action call `killPlayer`:
```ts
aragainFalls.add(new DeadlyRoomTrait({
  cause: 'falls',
  messageId: FallsDeathMessages.DEATH,   // "You tumble over the falls to your doom."
  safeVerbs: ['looking', 'examining'],
}));
```

**Chord Way** — `deadly` room marker:
```
Aragain Falls is deadly, safe: look, examine, cause "falls".
    death: "You tumble over Aragain Falls to your doom in the mist below."
```

---

## 2. Grue — mechanism: **Scheduler daemon** (per-turn poll, seeded chance)

**Sharpee Way** — a per-turn daemon; `ctx.random` is the seeded RNG (never `Math.random`):
```ts
scheduler.registerDaemon({
  id: 'grue',
  condition: (ctx) => isDark(ctx.world, ctx.playerLocation)
                   && !playerHasLight(ctx.world),
  run: (ctx) => {
    if (!ctx.random.chance(0.75)) return [];          // 25% survive (FORTRAN canon)
    const ev = killPlayer(ctx.world, ctx.world.getPlayer(),
      { cause: 'grue', messageId: GrueMessages.SLITHERED, terminal: true });
    return ev ? [ev] : [];
  },
});
```

**Chord Way** — `kill the player when <cond>` (per-turn; lowers to a daemon):
```
kill the player "A lurking grue slithers into the room and devours you!"
    when here is dark and player has no light, cause "grue", chance 75%
```

---

## 3. Cake (eat the orange cake) — mechanism: **Capability Dispatch**

**Sharpee Way** — the cake owns the lethal meaning of `eating` (per ADR-090; re-homed
off today's `chainEvent` — this is exactly ADR-227 Q-2):
```ts
class CakeTrait implements ITrait {
  static readonly type = 'dungeo.trait.cake';
  static readonly capabilities = ['if.action.eating', 'if.action.throwing'];
  icing: 'blue' | 'orange' | 'red';
}

const CakeEatingBehavior: CapabilityBehavior = {
  validate: () => ({ valid: true }),
  execute(entity, world, actorId) {
    if (entity.get(CakeTrait).icing === 'orange') {
      killPlayer(world, world.getPlayer(),
        { cause: 'cake', messageId: CakeMessages.ORANGE_EXPLODE, terminal: true });
    }
  },
  report: () => [],
  blocked: () => [],
};
```

**Chord Way** — `kill the player` inside an `after <action>` clause (lowers to
capability dispatch on the cake):
```
after eating the orange cake:
    kill the player "The cake explodes in a tremendous blast! You are killed instantly.", cause "cake"
```

---

## 4. Cage-poison — mechanism: **Scheduler daemon/fuse** (timed, escalating)

**Sharpee Way** — a daemon armed by the cage trap; kills only if still confined:
```ts
scheduler.registerDaemon({
  id: 'cage-poison',
  condition: (ctx) => ctx.world.getStateValue(CAGE_TRAPPED_KEY) === true,
  run: (ctx) => {
    const t = bumpTurns(ctx.world);                       // 1..10
    if (t === 3 || t === 6 || t === 9)
      return [msg(ctx, CageMessages.GAS_WARNING)];        // "The gas grows thicker..."
    if (t < 10) return [];
    const ev = killPlayer(ctx.world, ctx.world.getPlayer(),
      { cause: 'poison', messageId: CageMessages.POISON_DEATH, terminal: true });
    return ev ? [ev] : [];
  },
});
```

**Chord Way** — ADR-217 timer body containing a `kill the player` (lowers to a daemon):
```
after the cage traps the player, wait 10 turns:
    warn at 3, 6, 9: "The gas grows thicker..."
    kill the player "You succumb to the poison gas.", cause "poison"
```

---

## What the comparison shows (for the grammar choice)

- The **death message** wants a home in every construct (deadly `death:`, the
  `kill the player "…"` phrase). Option A puts it where `win`/`lose` already put
  their phrase — consistent.
- **`cause`** is a short tag on every path; a trailing `, cause "…"` clause reads
  cleanly and matches ADR-217's trailing-clause style.
- **`chance`** appears in exactly the probabilistic cases (grue) — a trailing
  clause keeps the common (non-probabilistic) case clean.
- The **per-turn vs action-triggered vs timed** distinction is carried by the
  *enclosing clause* (`when …` = daemon, `after <action>` = interceptor/capability,
  `after … wait N turns` = fuse) — `kill the player` itself is the same sink
  everywhere. This is the whole point: one statement, the surrounding Chord clause
  picks the mechanism, mirroring the Sharpee-Way mechanism choice 1:1.
