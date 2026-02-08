# Thief Combat: Canonical FORTRAN Implementation Plan

## Goal

Replace the current generic `CombatService` skill-based system with the canonical MDL/FORTRAN melee system from `melee.137` and `dung.355`. This affects all three villains (troll, thief, cyclops) but the thief is the primary target due to score-scaling.

## Current System vs Canonical

### Current (CombatService)
- Flat skill-based hit/miss (50% base + skill diff)
- Simple damage calculation (baseDamage + weaponDamage - armor)
- HP pool with knockout at 20% threshold
- No score scaling, no wound system, no stagger/weapon-loss mechanics
- Thief: skill 70, health 25, baseDamage 4

### Canonical (MDL melee.137)
- **Strength-based** with 9 possible outcomes per blow (not just hit/miss)
- Player strength scales linearly with score (2 at 0 pts, 7 at SCORE-MAX)
- Wound system reduces defense strength (light wound -1, serious -2)
- Stagger mechanic (miss next turn), weapon loss, unconsciousness
- Healing daemon (CURE-WAIT = 30 turns per wound point)
- Best-weapon bonus system (knife vs thief, sword vs troll)
- Thief: OSTRENGTH 5, Troll: OSTRENGTH 2, Cyclops: OSTRENGTH 10000

---

## MDL Combat System Reference

### Constants
```
STRENGTH-MIN = 2        # Player min base strength
STRENGTH-MAX = 7        # Player max base strength
SCORE-MAX = 616         # Total achievable points (pre-thief-death)
CURE-WAIT = 30          # Turns to heal one wound point
```

### FIGHT-STRENGTH (player)
```
base = SMIN + floor(0.5 + (SMAX - SMIN) * (score / SCORE-MAX))
adjusted = base + ASTRENGTH   (wound adjustment, starts at 0, goes negative)
```

| Score | % of 616 | Base Strength |
|-------|----------|---------------|
| 0     | 0%       | 2             |
| 62    | 10%      | 3             |
| 123   | 20%      | 3             |
| 185   | 30%      | 4             |
| 246   | 40%      | 4             |
| 308   | 50%      | 5 (matches thief) |
| 370   | 60%      | 5             |
| 432   | 70%      | 6             |
| 493   | 80%      | 6             |
| 555   | 90%      | 7             |
| 616   | 100%     | 7             |

### VILLAIN-STRENGTH (NPC)
- Returns OSTRENGTH value (thief=5, troll=2)
- Special: If thief is "engrossed" (opening egg), capped at min(OSTRENGTH, 2)
- Best-weapon bonus: If attacking with villain's weakness weapon, reduce OSTRENGTH by penalty
  - Sword vs Troll: -1 (troll strength 2 → max(1, 2-1) = 1)
  - Knife vs Thief: -1 (thief strength 5 → max(1, 5-1) = 4)

### Blow Resolution

**Step 1**: Determine ATT (attacker strength) and DEF (defender strength)
- Hero attacks: ATT = max(1, FIGHT-STRENGTH), DEF = VILLAIN-STRENGTH
- Villain attacks: ATT = VILLAIN-STRENGTH, DEF = FIGHT-STRENGTH

**Step 2**: If DEF < 0 (unconscious defender) → automatic KILLED

**Step 3**: Select result table based on DEF value:
- DEF = 1 → DEF1-RES[min(ATT, 3)]
- DEF = 2 → DEF2-RES[min(ATT, 4)]
- DEF > 2 → DEF3-RES[ATT - DEF + 3] (clamped to [-2, +2] range → indices 1-5)

**Step 4**: Random pick from 9-element sub-table

**Step 5**: Post-processing:
- If target is already unconscious (OUT?): STAGGER→HESITATE, anything else→SITTING-DUCK
- STAGGER has 25% (hero attack) / 50% (villain attack) chance to become LOSE-WEAPON

### Combat Outcome Types (9)
```
0 = MISSED          - No effect
1 = UNCONSCIOUS     - Defender knocked out (DEF goes negative)
2 = KILLED          - Defender dies (DEF = 0)
3 = LIGHT-WOUND     - DEF reduced by 1
4 = SERIOUS-WOUND   - DEF reduced by 2
5 = STAGGER         - Defender misses next turn
6 = LOSE-WEAPON     - Defender drops held weapon
7 = HESITATE        - Free swing miss (from stagger replacement)
8 = SITTING-DUCK    - Devastating hit on unconscious target (DEF = 0)
```

### Result Tables (from dung.355)

```
DEF1 (13 entries):
  MISSED MISSED MISSED MISSED STAGGER STAGGER
  UNCONSCIOUS UNCONSCIOUS KILLED KILLED KILLED KILLED KILLED

DEF1-RES (3 sub-tables, indexed by ATT 1-3):
  [1] = DEF1[0..8]     (ATT=1: 4 miss, 2 stagger, 2 uncon, 1 killed)
  [2] = DEF1[1..9]     (ATT=2: 3 miss, 2 stagger, 2 uncon, 2 killed)
  [3] = DEF1[2..10]    (ATT=3+: 2 miss, 2 stagger, 2 uncon, 3 killed)

DEF2A (10 entries):
  MISSED MISSED MISSED MISSED MISSED STAGGER STAGGER
  LIGHT-WOUND LIGHT-WOUND UNCONSCIOUS

DEF2B (12 entries):
  MISSED MISSED MISSED STAGGER STAGGER
  LIGHT-WOUND LIGHT-WOUND LIGHT-WOUND
  UNCONSCIOUS KILLED KILLED KILLED

DEF2-RES (4 sub-tables, indexed by ATT 1-4):
  [1] = DEF2A[0..8]
  [2] = DEF2B[0..8]
  [3] = DEF2B[1..9]
  [4] = DEF2B[2..10]   (ATT=4+)

DEF3A (11 entries):
  MISSED MISSED MISSED MISSED MISSED STAGGER STAGGER
  LIGHT-WOUND LIGHT-WOUND SERIOUS-WOUND SERIOUS-WOUND

DEF3B (11 entries):
  MISSED MISSED MISSED STAGGER STAGGER
  LIGHT-WOUND LIGHT-WOUND LIGHT-WOUND
  SERIOUS-WOUND SERIOUS-WOUND SERIOUS-WOUND

DEF3C (10 entries):
  MISSED STAGGER STAGGER
  LIGHT-WOUND LIGHT-WOUND LIGHT-WOUND LIGHT-WOUND
  SERIOUS-WOUND SERIOUS-WOUND SERIOUS-WOUND

DEF3-RES (5 sub-tables, indexed by ATT-DEF+3, range 1-5):
  [1] = DEF3A[0..8]     (ATT-DEF = -2, defender much stronger)
  [2] = DEF3A[1..9]     (ATT-DEF = -1)
  [3] = DEF3B[0..8]     (ATT-DEF = 0, even)
  [4] = DEF3B[1..9]     (ATT-DEF = +1)
  [5] = DEF3C[0..8]     (ATT-DEF = +2, attacker much stronger)
```

### WINNING? Function (thief behavioral decision)
Used by thief AI to decide whether to stay and fight or flee:
```
PS = villain_strength - fight_strength(hero)
PS > 3  → 90% attack, 100% no-flee
PS > 0  → 75% attack, 85% no-flee
PS = 0  → 50% attack, 30% no-flee
VS > 1  → 25% attack
else    → 10% attack, 0% no-flee
```

### Wound Healing
- ASTRENGTH tracks cumulative wound adjustment (negative = wounded)
- CURE-CLOCK daemon: heals 1 point per 30 turns
- If ASTRENGTH > 0, reset to 0 (no positive bonus from healing)
- If ASTRENGTH < 0, increment by 1, re-arm timer for another 30 turns
- Player dies if FIGHT-STRENGTH (with wounds) drops to 0 or below

### Player Death from Wounds
After a villain blow reduces the hero's DEF:
```
new_ASTRENGTH = DEF - original_DEF (before any result)
if fight_strength(hero, no_adjust) + new_ASTRENGTH <= 0 → player dies
```

---

## Implementation Plan

### Phase 1: Canonical Combat Engine (Story-Level)

Create `stories/dungeo/src/combat/melee.ts` — the canonical MDL melee engine.

**New types:**
```typescript
type MeleeOutcome =
  | 'missed' | 'unconscious' | 'killed' | 'light_wound'
  | 'serious_wound' | 'stagger' | 'lose_weapon' | 'hesitate' | 'sitting_duck';

interface MeleeState {
  strength: number;       // OSTRENGTH for villains, FIGHT-STRENGTH for hero
  staggered: boolean;     // Misses next turn
  unconscious: boolean;   // Can be finished off
  weapon?: string;        // Entity ID of held weapon
}

interface MeleeConfig {
  scoreMax: number;       // 616
  strengthMin: number;    // 2
  strengthMax: number;    // 7
  cureWait: number;       // 30
  bestWeapons: Map<string, { weaponId: string; penalty: number }>;
}
```

**Functions:**
- `fightStrength(score, scoreMax, woundAdjust, adjust?)` — canonical formula
- `villainStrength(ostrength, isThiefEngrossed, bestWeapon?)` — with best-weapon check
- `resolveBlow(att, def, isHeroAttacking, isTargetUnconscious, random)` — table lookup + post-processing
- `applyBlowResult(outcome, currentDef)` → new DEF value

**Data:**
- Embed the 6 raw result arrays (DEF1, DEF2A, DEF2B, DEF3A, DEF3B, DEF3C)
- Build the 3 indexed tables (DEF1-RES, DEF2-RES, DEF3-RES) as arrays of 9-element sub-arrays

**No platform changes.** This is a pure story-level module with deterministic logic (given a random source).

### Phase 2: Melee Messages

Create `stories/dungeo/src/combat/melee-messages.ts` with all canonical thief and troll melee text.

Each outcome index (0-8) has an array of message variants. The original picks one at random via PRES. We do the same:
- `ThiefMeleeMessages[outcome][variant]` — 9 outcome arrays from THIEF-MELEE
- `TrollMeleeMessages[outcome][variant]` — similar from TROLL-MELEE

Register with language layer in `stories/dungeo/src/messages/`.

### Phase 3: Wire Into Attacking Action

The current `CombatService.resolveAttack()` is used by the stdlib attacking action. We need the story to override combat resolution for Dungeo villains **without changing the platform**.

**Approach: Story-Level Action Interceptor**

Create `stories/dungeo/src/interceptors/melee-interceptor.ts`:
- Register on CombatantTrait for villains
- `preValidate`: Check stagger state — if hero is staggered, emit "still recovering" message and block
- `preExecute`: Replace CombatService resolution with `resolveBlow()` from melee.ts
- `postExecute`: Apply wound results, handle LOSE-WEAPON (drop weapon), STAGGER (set flag), death, unconsciousness
- `postReport`: Select message from melee message tables based on outcome

**Player state tracking**: Store `ASTRENGTH` (wound adjustment) and `staggered` flag in `world.getDataStore().state`:
```typescript
'dungeo.player.woundAdjust': number    // ASTRENGTH equivalent
'dungeo.player.staggered': boolean
```

**Villain state**: Use `entity.attributes` for `staggered`, `unconscious` flags. OSTRENGTH is already in CombatantTrait (map to appropriate field or use attributes).

### Phase 4: Combat Disengagement & Wound Healing

Two distinct systems work together to create the flee-and-recover cycle.

#### 4a: Combat Disengagement (melee.137:84-96)

When the player leaves the villain's room, the FIGHTING function detects `HERE != OROOM(villain)` and:

1. **Clears FIGHTBIT** — combat ends, villain stops attacking
2. **Clears both stagger flags** — hero ASTAGGERED and villain STAGGERED reset
3. **Heals the villain** — if villain OSTRENGTH is negative (wounded), restore to positive. The villain fully recovers when the player leaves. This is canonical: you can't wear down the thief over multiple hit-and-run skirmishes
4. **Clears thief engrossed flag** — thief is no longer distracted

**Implementation**: In the melee interceptor or as a going-action event handler, detect when player leaves a room containing a FIGHTBIT villain. Reset all combat state for both sides. Villain wounds reset to original OSTRENGTH.

**Key implication**: The villain heals instantly on disengagement, but the player does NOT. Player wounds persist and heal slowly via the cure daemon. This creates asymmetric pressure — the player must commit to the fight or retreat and spend 30+ turns healing before trying again.

#### 4b: Wound Healing Daemon (CURE-CLOCK)

Create `stories/dungeo/src/handlers/cure-daemon.ts`:

**Canonical behavior** (melee.137:295-300):
- Enabled when player takes a wound (ASTRENGTH goes negative)
- Ticks every turn; heals 1 wound point per CURE-WAIT (30) turns
- If ASTRENGTH > 0, clamp to 0 (no positive bonus)
- If ASTRENGTH < 0, increment by 1, re-arm timer for another 30 turns
- Disables when ASTRENGTH reaches 0

**Healing timeline examples**:
| Wound State | ASTRENGTH | Turns to Full Heal |
|---|---|---|
| 1 light wound | -1 | 30 |
| 1 serious wound | -2 | 60 |
| 2 light wounds | -2 | 60 |
| 1 serious + 1 light | -3 | 90 |
| Near death | -4 | 120 |

**The flee-and-recover gameplay loop**:
1. Player attacks thief, takes wounds (ASTRENGTH goes negative)
2. Player flees room → combat disengages, thief fully heals
3. Cure daemon starts ticking (30 turns per wound point)
4. Player explores other areas while healing
5. DIAGNOSE command shows wound state and ETA
6. Once healed, player returns for another attempt (thief is also at full strength)

Register in the story's daemon list.

### Phase 5: Thief Behavior Updates

Update `stories/dungeo/src/npcs/thief/thief-behavior.ts`:

1. **WINNING? function**: Replace `shouldEscalateToCombat()` in thief-helpers.ts with canonical `WINNING?` logic that uses actual fight-strength comparison
2. **Engrossed flag**: When thief is opening egg, set `thief-engrossed` flag (caps thief strength at 2)
3. **Fight/flee decision**: Each combat turn, thief uses WINNING? to decide attack vs flee

### Phase 6: DIAGNOSE Command

Add story-specific `diagnose` action:
- Shows wound state: "You have a light/serious wound"
- Shows healing ETA: "which will be cured after N moves"
- Shows remaining capacity: "You can survive one serious wound" / "You are at death's door"
- Shows death count

Grammar: `diagnose` → `dungeo.action.diagnose`

### Phase 7: Troll Integration

Apply same melee system to troll (OSTRENGTH 2):
- Much weaker than thief — easy fight even at low scores
- Sword is best-weapon vs troll (penalty 1, reduces to OSTRENGTH 1)
- Uses TROLL-MELEE message tables

---

## Testing Plan

### Unit Tests (transcript tests)

**thief-combat-low-score.transcript** — Score ~100 (fight-strength 3 vs thief 5)
- Player attacks thief with knife, gets beaten badly
- Verify thief wins most exchanges
- Test wound messages, stagger, weapon loss
- Test player death from accumulated wounds

**thief-combat-mid-score.transcript** — Score ~308 (fight-strength 5, even match)
- Extended back-and-forth combat
- Verify roughly even outcomes
- Test unconsciousness → finishing blow
- Test wound healing over 30+ turns

**thief-combat-high-score.transcript** — Score ~500 (fight-strength 6-7)
- Player dominates, thief flees per WINNING?
- Test best-weapon bonus (knife reduces thief to 4)
- Test thief death → frame spawn, score increase, reality altered

**thief-engrossed.transcript** — Thief has egg, is opening it
- Attack while engrossed → thief capped at strength 2
- Easy kill during egg-opening window

**troll-combat.transcript** — Early game (fight-strength 2 vs troll 2)
- Even match at game start
- Sword bonus gives edge (troll drops to 1)
- Troll death messages

**flee-and-recover.transcript** — Full disengage/heal/re-engage cycle
- Fight thief, take wounds (verify DIAGNOSE shows wound state)
- Flee room → verify combat stops (thief no longer attacks)
- Verify thief fully heals on disengagement (re-enter room, thief at full OSTRENGTH)
- Verify player wounds persist after fleeing (DIAGNOSE still shows wounds)
- Wait/explore for 30+ turns, running DIAGNOSE periodically to verify healing progress
- Verify healing completes (DIAGNOSE: "You are in perfect health")
- Re-engage thief at full strength, verify both sides reset

**wound-stacking.transcript** — Multiple wounds and healing math
- Take multiple wounds (light + serious = ASTRENGTH -3)
- Verify DIAGNOSE: "You have several wounds, which will be cured after N moves"
- Verify healing rate: 1 point per 30 turns, not all-at-once
- Verify near-death state: "You are at death's door" / "You can be killed by one more light wound"
- Verify full heal takes correct total turns (e.g., -3 = 90 turns)

**combat-stagger.transcript** — Stagger mechanic
- Get staggered, verify next attack is "still recovering"
- Stagger villain, verify they regain feet next turn

**combat-weapon-loss.transcript** — LOSE-WEAPON mechanic
- Lose weapon during combat
- Verify "fortunately you still have a ..." message if backup weapon
- Fight unarmed after losing all weapons

### Walkthrough Tests

**wt-10-thief-fight.transcript** — With torch as light source, score above 308
- Navigate to Treasure Room
- Kill thief with knife (best weapon)
- Verify frame spawns, loot drops, reality altered
- Pick up stolen treasures

### Score Bracket Validation

Use `$score` or GDT DA to set specific scores, then test combat outcomes at each bracket:
- 0 pts: fight-strength 2 (thief dominates)
- 150 pts: fight-strength 3 (thief advantage)
- 308 pts: fight-strength 5 (even)
- 500 pts: fight-strength 6 (player advantage)
- 616 pts: fight-strength 7 (player dominates)

These use `$teleport` to thief's lair + GDT commands for score manipulation.

---

## Key Decisions

### Story-level, not platform

The melee system is Dungeo-specific (FORTRAN port). The platform `CombatService` remains as-is for other stories. Dungeo intercepts combat resolution via story interceptors.

### Random source

Combat currently uses `Math.random()`. The melee system should accept a `SeededRandom` parameter for future `$seed` support (ISSUE-049). For now, pass through the existing random.

### SCORE-MAX value

Use 616 (pre-thief-death max). The hidden 650 max (post-thief-death) should NOT affect fight-strength — by the time the thief is dead, combat scaling is moot. This matches canonical behavior where SCORE-MAX is set at game initialization.

### Cyclops special case

Cyclops OSTRENGTH = 10000 → effectively invincible in combat. This is by design — you defeat the cyclops by saying "Odysseus", not fighting. No changes needed.

---

## File Inventory

### New Files (Story)
- `stories/dungeo/src/combat/melee.ts` — Combat engine
- `stories/dungeo/src/combat/melee-messages.ts` — Canonical message tables
- `stories/dungeo/src/combat/melee-tables.ts` — Result probability tables
- `stories/dungeo/src/combat/index.ts` — Exports
- `stories/dungeo/src/interceptors/melee-interceptor.ts` — Wire into attacking action
- `stories/dungeo/src/handlers/cure-daemon.ts` — Wound healing
- `stories/dungeo/src/actions/diagnose/diagnose-action.ts` — DIAGNOSE command

### Modified Files (Story)
- `stories/dungeo/src/npcs/thief/thief-helpers.ts` — Replace shouldEscalateToCombat with WINNING?
- `stories/dungeo/src/npcs/thief/thief-behavior.ts` — Use WINNING? for fight/flee, engrossed flag
- `stories/dungeo/src/npcs/thief/thief-entity.ts` — OSTRENGTH in attributes, remove skill:70 hack
- `stories/dungeo/src/npcs/troll/` — OSTRENGTH=2, register melee interceptor
- `stories/dungeo/src/index.ts` — Register interceptors, daemon, diagnose action
- `stories/dungeo/src/messages/` — Register melee messages with language layer

### New Files (Tests)
- `stories/dungeo/tests/transcripts/thief-combat-*.transcript` — Score bracket tests
- `stories/dungeo/tests/transcripts/troll-combat.transcript`
- `stories/dungeo/tests/transcripts/flee-and-recover.transcript` — Full disengage/heal/re-engage cycle
- `stories/dungeo/tests/transcripts/wound-stacking.transcript` — Multiple wounds, healing math, DIAGNOSE
- `stories/dungeo/tests/transcripts/combat-stagger.transcript`
- `stories/dungeo/tests/transcripts/combat-weapon-loss.transcript`
- `stories/dungeo/walkthroughs/wt-10-thief-fight.transcript`

### No Platform Changes
Zero modifications to packages/. The entire melee system is story-level.

---

## Phase Order & Dependencies

```
Phase 1 (melee engine) ──┬── Phase 2 (messages)
                         │
                         ├── Phase 3 (interceptor) ── Phase 5 (thief behavior)
                         │                                    │
                         ├── Phase 4 (healing daemon)         ├── Phase 7 (troll)
                         │                                    │
                         └── Phase 6 (diagnose)               └── Walkthrough tests
```

Phases 1-2 can be done in parallel. Phase 3 depends on both. Phases 4-6 can be done independently after Phase 3. Phase 7 and walkthroughs come last.
