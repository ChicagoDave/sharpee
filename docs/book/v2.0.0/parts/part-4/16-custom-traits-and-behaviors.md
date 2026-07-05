# Custom Traits & Behaviors: Data and Logic, Kept Apart

Every object in the zoo has been assembled from traits, including: `IdentityTrait`,
`RoomTrait`, `ContainerTrait`, `LightSourceTrait`. You've even written one:
`PettableTrait`, back in *Capability Dispatch*. This chapter steps back to the
layer those traits live in, the world model, and shows how to build your own
trait, and the **behavior** that owns the rules around it, when the standard kit
doesn't carry the state your story needs.

## Traits are data; behaviors are rules

The world model draws a sharp line:

- A **trait** is *data*. It holds the state an entity carries (a name, a
  capacity, whether a light is lit) and nothing else. No logic.
- A **behavior** is *rules*. It's the code that reads and changes trait data,
  enforcing whatever constraints apply.

Every built-in pair follows this split. `LightSourceTrait` is just fields:
`brightness`, `isLit`, `fuelRemaining`. The matching `LightSourceBehavior` is where
the *logic* lives: lighting fails when the fuel is gone, extinguishing flips the
flag, "is it lit?" falls back to the switch. The trait never decides anything; the
behavior decides everything.

This is the same principle you met in Chapter 10 from the action side: *behaviors
own mutations, actions coordinate them*. Here you see the other half: the trait
that holds the state, and the behavior that guards it.

## Defining a custom trait

A trait is a small class that implements `ITrait`. It needs a `type` string (both
as a static, so code can refer to it, and as an instance field, so the engine can
identify it on an entity) and whatever data fields it carries. By convention,
custom trait types take a story-specific prefix, `zoo.trait.…`, to stay clear of
the platform's built-ins.

Suppose the feed dispenser in the petting zoo should run dry after a few uses. The
state it needs, a count of charges, isn't in any standard trait, so you write
one. Put it in a new file, `src/dispenser-trait.ts`:

```typescript
import { ITrait } from '@sharpee/world-model';

export class DispenserTrait implements ITrait {
  static readonly type = 'zoo.trait.dispenser';
  readonly type = DispenserTrait.type;

  /** How many servings remain. */
  chargesRemaining = 3;

  constructor(data?: Partial<DispenserTrait>) {
    if (data) Object.assign(this, data);
  }
}
```

That's the whole trait: pure data and a constructor that copies in any overrides,
exactly like the built-ins. You would add it to an entity the same way you add
any trait; the line below shows the shape only (the illustrative rule). The zoo
leaves this pair unwired, as the honest note at the chapter's end explains, so
nothing in `index.ts` changes in this chapter and there is no import to add
there:

```typescript
dispenser.add(new DispenserTrait({ chargesRemaining: 5 }));
```

## Defining the behavior

The trait holds the count; the *rule* ("you can dispense only while charges
remain, and each use spends one") belongs in a behavior. A behavior is typically a
class of static methods that take the entity, fetch the trait, and change it:

The behavior gets its own file too: `src/dispenser-behavior.ts`. This is the
first time we import from one of our *own* files rather than a
`@sharpee/*` package. The project's TypeScript is configured for Node's ESM
resolution, which requires a `.js` extension on relative imports (the `.js` points
at the compiled output of `dispenser-trait.ts`):

```typescript
import { IFEntity } from '@sharpee/world-model';
import { DispenserTrait } from './dispenser-trait.js';

export class DispenserBehavior {
  /**
   * Spend one charge. Returns false if the dispenser is
   * already empty.
   */
  static dispense(dispenser: IFEntity): boolean {
    const trait = dispenser.get(DispenserTrait);
    if (!trait || trait.chargesRemaining <= 0) return false;
    trait.chargesRemaining -= 1;
    return true;
  }

  static isEmpty(dispenser: IFEntity): boolean {
    const trait = dispenser.get(DispenserTrait);
    return !trait || trait.chargesRemaining <= 0;
  }
}
```

Notice what the behavior does and doesn't do. It performs the mutation
(`chargesRemaining -= 1`) and returns a small result (`true`/`false`); it doesn't
print anything or emit events. That keeps it pure and testable: you can call
`DispenserBehavior.dispense(d)` in a test and assert the count dropped, with no
parser, no turn, no text in the way. (The platform's own behaviors share this
shape; many extend a small `Behavior` base class that adds helpers like a
trait-required check, but the essence is just static methods over trait data.)

## Putting the pair to work

A trait and behavior are inert on their own; something has to *call* the behavior.
That caller is one of the coordination tools from earlier volumes:

```typescript
// inside a custom "operate dispenser" action's execute phase,
// or an event handler:
if (DispenserBehavior.dispense(dispenser)) {
  // success: hand out a serving of feed
} else {
  // empty: report that it's out
}
```

The action or handler decides *when* to act and *what to say*; the behavior decides
*what changes*. The trait just remembers. Each layer has one job.

One honest note before you go looking for a "Try it": the zoo doesn't wire this
pair up. The two files compile alongside your story, but no action calls
`DispenserBehavior.dispense` yet, so the dispenser never actually runs dry in
play. That's deliberate: the caller would be a custom "operate dispenser" action,
and you already know how to build one from Chapter 14; wiring it end-to-end makes
a good exercise. What this chapter adds is the pattern itself: state in a trait,
rules in a behavior, coordination elsewhere.

## Which tool, when?

Custom traits and behaviors are powerful, but they're not always the answer. Before
reaching for a new trait, run down the lighter options, most of which you've
already seen:

| You want to… | Reach for |
|---|---|
| React to something that already happened | An **event handler** (Chapter 13) |
| Add a brand-new verb | A **custom action** (Chapter 14) |
| Make one verb behave differently per entity | **Capability dispatch** (Chapter 15) |
| Give entities genuinely new *state* and *rules* | A **custom trait + behavior** (this chapter) |

The deciding question is whether your idea is really new *state on entities*. If an
object needs to remember something the standard traits don't model (charges, a
temperature, a loyalty score) and needs rules around how that something changes,
that's a trait-and-behavior. If you only need to react, or to add a verb, the
lighter tools fit better.

## Key takeaway

The world model keeps data and logic apart: a **trait** holds state and nothing
else, while a **behavior** is pure static methods that read and mutate that state.
Behaviors emit no text or events, which is what keeps them testable. Add a trait
with `entity.add(...)` and namespace its type (`zoo.trait.…`), then let actions or
event handlers call the behavior to decide *when* and *what to say*. Reach for a
custom trait only when your story genuinely needs new state and logic. For
reactions, verbs, or per-entity behavior, the lighter tools from earlier chapters
fit better.
