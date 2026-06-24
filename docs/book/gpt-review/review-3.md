Yes, I think that's one place where a tiny amount of extra clarification would pay off.

Reading Chapter 3, my interpretation was correct after a few paragraphs, but I initially assumed "events" meant something closer to what many developers expect:

* Event handlers
* Event listeners
* Pub/sub
* Event bus
* Reactive callbacks

What Sharpee is actually doing (at least from the prose I saw) is much closer to:

> Actions append domain events to a turn record. At the end of the turn, the language layer consumes those events and renders prose.

That's a very different mental model.

The current text says:

> actions never print anything.
>
> Instead, the report phase emits events...

and later:

> the engine's prose pipeline takes those events, looks each message id up in the language layer, and renders the actual words

That's enough to understand the mechanism, but not enough to disambiguate it from "event-driven architecture."

For a developer audience, I'd consider one sentence like:

> These are domain events, not dispatched callbacks. They are recorded as the action runs and collected until the turn ends, when the language layer renders them into prose.

Or even:

> Think of them as entries in a turn log, not notifications sent to listeners.

I actually like the second wording better because it teaches the behavior rather than the architecture buzzword.

One thing I'd be careful about is introducing the term **Domain Event** if you don't use DDD terminology elsewhere.

Many developers hear "Domain Event" and immediately start importing assumptions:

* eventual consistency
* event sourcing
* aggregates
* CQRS
* message buses

If Sharpee isn't really participating in that ecosystem, the label may create more confusion than it removes.

Personally, I would write something like:

> An event in Sharpee is a record of something that happened during a turn. It isn't dispatched to handlers or listeners. Think of it as an entry in the turn's event log. After the turn ends, the language layer reads those events and turns them into prose.

That gives me the exact mental model I think you're aiming for:

```
Action
  ↓
Record events
  ↓
Turn ends
  ↓
Language layer reads events
  ↓
Text emitted
```

And that's actually a fairly distinctive architectural idea. It's worth making explicit because it's one of the cleaner separations in Sharpee's design.
