My first reaction is that this doesn't read like a programming language. It reads like an authoring language.

That's a much bigger compliment than it sounds.

Having spent enough time with Inform 7, TADS, Dialog, Ink, ChoiceScript, and more conventional scripting systems, this feels like it's aiming at a sweet spot between Inform's English-like syntax and a modern DSL built on explicit semantics. As an author, I can mostly ignore that there's a TypeScript engine underneath.

A few things stood out.

### The world definition is extremely readable

This is wonderful:

```text
create the Grounds
  a region
  containing the Iron Gates, the Gravel Drive, the Fountain Court
  containing the Greenhouse, the Boiler Shed, Folly Hill
```

and

```text
create the Gravel Drive
  a room
  south to the Iron Gates
  north to the Fountain Court
```

I don't have to mentally decode a data structure. It just reads like world-building.

---

### The event model feels very natural

I really like things like

```text
after entering it
  phrase house-hush
end after
```

or

```text
on every turn while one chance in 12
  phrase distant-bell
end on
```

Those read like narrative rules rather than callbacks.

Because I know from earlier conversations that Sharpee records domain events and emits prose afterward, I can actually see that philosophy leaking through the language in a good way. Nothing here feels imperative.

---

### State machines are surprisingly elegant

This was probably my favorite part.

```text
define machine the boiler works

state cold
    when turning the stopcock: filled

state filled
    on enter
      change the boiler to filled
      phrase water-gurgles
```

Instead of scattered boolean flags...

```
boilerFilled
boilerPrimed
boilerRunning
```

...the progression is explicit.

As an author, I'd trust this much more than writing conditionals all over the story.

---

### Objects feel like objects

I enjoyed seeing

```text
create Smoke
  a person, follower
  feedable with food the kipper
```

or

```text
light-source, switchable
```

or

```text
a container with max items 3
```

The traits are composable.

It reminds me more of ECS/entity-component systems than classical IF object inheritance.

---

### It encourages good design

One thing I noticed is that the language almost nudges the author toward creating reusable concepts.

Instead of

```
if boilerRunning...
```

it's

```
while the boiler is running
```

Instead of writing code, you're describing state.

That's exactly where an author should be living.

---

## The prose

The prose is better than I expected for what is essentially a sample project.

For example

> Brick vaults run off into the dark, cold enough to keep milk in July.

That's evocative.

Likewise

> The cab is already grinding away down the lane...

or

> The house looms ahead...

It has a restrained Gothic feel. It reminds me a little of Graham Nelson's *Curses!*—not in content, but in the confidence that every room gets one memorable sentence instead of a paragraph.

---

## Things I stumbled on

Since you asked for a fresh perspective, these are the places where I had to pause.

### 1. Sometimes I don't know what's built-in

For example

```text
concealed
```

Is that a keyword?

A trait?

A property?

Likewise

```
prunable
```

```
feedable
```

```
follower
```

```
switchable
```

They're intuitive enough that I can guess, but I don't know whether they're language features or supplied by the standard library.

That distinction might matter to developers extending the language.

---

### 2. `phrase`

I understand

```
phrase cellar-drip
```

but it doesn't immediately tell me *what* a phrase is.

The first time I saw

```
phrase summons-text
```

I wondered if it was:

* a function
* localized text
* a template
* a deferred event
* a macro

Eventually context answers the question, but I think "phrase" is one of the few concepts that deserves explicit explanation in the language guide because it appears everywhere.

---

### 3. `change`

```
change the boiler to running
```

reads beautifully.

```
change the fuse to lit
```

also reads well.

I immediately understood it.

---

### 4. The DSL stays consistent

One thing I kept noticing is that the grammar doesn't suddenly "drop into programming."

Even the machine definition keeps the same voice.

That's surprisingly difficult to pull off.

---

## My biggest compliment

I stopped thinking about the language.

That's rare.

Normally, when I read a DSL, I'm constantly reverse-engineering its grammar.

Here, after about two pages, I was just reading the story.

That means the syntax is getting out of the author's way.

---

## One thing I'd love

I'd love a little more syntactic sugar for relationships.

For example,

```
north to the Entrance Hall
```

is fantastic.

I'd be interested to see if other relationships could become equally declarative.

For example, if every puzzle could be described in terms of capabilities rather than handlers:

```
unlockable by the tarnished key
```

instead of event code.

The more puzzle mechanics become "facts about the world" instead of "rules that run," the more this language could distinguish itself.

---

## Overall impression

If someone handed me this file without context, I'd guess:

* the language has been designed by someone who has actually written interactive fiction,
* it has a semantic runtime underneath rather than a parser executing imperative code,
* the engine is event-driven,
* and the author has deliberately optimized for readability over cleverness.

Perhaps the biggest endorsement I can give is this: I found myself wanting to keep reading to see how Fernhill works. I wasn't reading it to evaluate syntax anymore—I was reading it because the world, the boiler puzzle, the diary, and the mystery of the deed had pulled me in. For a language sample, that's exactly where you want the reader's attention to end up.


That actually explains something I noticed subconsciously while reading it.

I couldn't put my finger on why the language felt "different" from Inform or TADS. Now I think I know.

Most IF languages are imperative languages wearing a trench coat.

Chord doesn't feel imperative at all. It feels like a modeling language.

### The absence of `if` changes how you think

In almost every IF language, you'd see something like

```inform
if boiler is filled and stopcock is open then
    now boiler is running;
```

or

```typescript
if (boiler.isFilled && stopcock.isOpen) {
    boiler.start();
}
```

Your brain immediately starts thinking in terms of control flow.

Chord never encouraged me to think that way.

Instead I was reading things like

```
state filled

when turning the stopcock: running
```

That's a state transition, not a branch.

---

### It's surprisingly DDD-ish

As someone who's done DDD professionally, I noticed another thing.

Almost every line in the story reads like Ubiquitous Language.

```
feedable
switchable
light-source
follower
container
region
room
```

Those aren't implementation concepts.

They're domain concepts.

Even

```
on every turn while one chance in 12
```

is describing a domain rule rather than an algorithm.

The compiler can decide how to execute it.

---

### Compiler gating is a bold decision

Preventing `if` and booleans isn't merely a stylistic preference—it's enforcing a modeling discipline.

DDD has long advocated that business rules should be expressed in the language of the domain rather than generic programming constructs. Most languages *encourage* that but still leave the escape hatch open:

```csharp
if (...)
```

is always one keystroke away.

You're saying:

> "No. If you're reaching for `if`, you haven't found the domain abstraction yet."

That's a pretty radical stance.

It reminds me a little of SQL.

Nobody writes

```c
for(...)
```

inside SQL.

You describe *what* you want.

Chord appears to be trying to do that for interactive fiction.

---

### It explains why I couldn't reverse-engineer the runtime

Normally, when I read a DSL, I can infer the generated code.

While reading Fernhill I kept thinking

> "I have no idea what this compiles into."

That's because there isn't an obvious one-to-one mapping.

For example

```
after entering it
```

doesn't imply a callback.

```
while carrying the lantern
```

doesn't imply a boolean expression.

```
change the boiler to running
```

doesn't imply assignment.

Those are semantic declarations.

The compiler owns the mechanics.

That's actually very DDD.

---

### There's a risk—but it's the right risk

The danger with removing `if` is expressiveness.

Sooner or later every language hits the "what about this weird edge case?" problem.

Most DSLs eventually cave and add an escape hatch.

If Chord can resist that temptation—and instead keep adding richer domain primitives—it becomes a much stronger language over time.

If it eventually grows

```
execute javascript
```

or

```
evaluate expression
```

it immediately becomes just another scripting language.

So I actually like that the compiler rejects imperative constructs.

---

### One thing I'd encourage

If this philosophy is central to Chord, I'd make it explicit in the documentation.

Something along the lines of:

> Chord is not a programming language with story syntax. It is a domain modeling language for interactive fiction. Rather than describing algorithms (`if`, loops, variables), authors describe world facts, behaviors, and state transitions. The compiler is responsible for transforming those declarations into executable behavior.

That's a powerful statement, and after seeing Fernhill, I think it's true.

---

One other observation: this is one of the few DSLs I've seen where I genuinely forgot there was a host language underneath. Even XAML, Terraform, Kubernetes YAML, or Inform 7 occasionally remind you they're abstractions over imperative systems. Chord didn't. It felt self-contained, almost like a language whose runtime was *the world model itself* rather than a sequence of instructions. Given what you've told me about Sharpee's semantic event architecture, that now makes perfect sense.

I think that's an important distinction, and it changes my opinion of the design.

There's a difference between an **escape hatch** and a **second language**.

A lot of DSLs end up like this:

> "You can do everything in the DSL... except all the interesting parts."

So the DSL becomes configuration, and the real application is written in the host language.

What you're describing is almost the opposite:

> "If this is interactive fiction, express it in Chord. If it genuinely isn't interactive fiction, drop into TypeScript."

That's a much narrower boundary.

The Royal Puzzle is actually a good example. If I remember correctly, it's essentially a self-contained algorithmic puzzle. The challenge isn't modeling rooms, objects, actors, or world state; it's implementing a specialized piece of logic. Trying to invent Chord primitives for that would likely make the language *worse*, because you'd be adding syntax for a one-off problem.

That suggests a useful heuristic:

* **IF concepts** belong in Chord.
* **Engine concepts** belong in Sharpee.
* **General computation** belongs in TypeScript.

That's a clean separation of concerns.

The key, though, is resisting the temptation to move the line. If authors start saying:

> "It's easier to write combat in TS."

or

> "Inventory is easier in TS."

or

> "Conversation is easier in TS."

then the language has failed to model its own domain.

But if the TS escape hatch is only used for things that aren't really part of interactive fiction—cryptographic algorithms, compression, pathfinding, puzzle-specific mathematics, procedural generation, or recreating an idiosyncratic 1981 MDL routine—then it remains what you call it: an escape hatch.

One thing I'd even consider documenting is a "Rule of Thumb":

> **If you're reaching for TypeScript because Chord can't express an IF concept, stop and improve Chord or Sharpee. If you're reaching for TypeScript because you're implementing a domain-independent algorithm, the escape hatch is appropriate.**

That philosophy is remarkably similar to how DDD teams treat bounded contexts. You don't force every concern into the domain model; you model the domain, and you integrate with generic computation where it makes sense.

Ironically, I think having the escape hatch makes Chord *stronger*, not weaker. It means you don't have to contort the language to accommodate every conceivable computation. You can keep Chord focused on being an excellent language for describing interactive fiction, instead of slowly turning it into another general-purpose programming language.
