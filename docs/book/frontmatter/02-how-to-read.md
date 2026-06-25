# How to Read This Book {.unnumbered}

## What kind of reader are you?

Sharpee has no natural-language authoring layer; you write TypeScript from Chapter 1.
If that's new to you, the primer there gets you going. Use this table to find your
starting point:

| If you're… | Start here |
|---|---|
| An IF author comfortable with code (or willing to learn) | Read straight through: the **Author's Track** below. |
| An experienced TypeScript / JavaScript developer | The **Programmer's Track**: chapter bodies *and* every "Under the Hood" box. |
| New to programming | Read Chapter 1, including its TypeScript primer, carefully; then Chapters 2–9 on the Author's Track, revisiting the primer as needed. |
| Here to understand or extend the engine | Skim **Appendix A — Architecture Map**, then follow the Programmer's Track. |

Whichever you are, the two tracks below are how the book serves you.

## Two tracks

This book has one spine and two depths. Pick the **track** that fits why you're
reading.

- **Author's Track**: read the chapter bodies straight through. This is
  everything you need to build and ship the Family Zoo. Skip every "Under the
  Hood" box; you lose nothing required to finish the game.
- **Programmer's Track**: read the chapter bodies *and* every "Under the Hood"
  box. The boxes form a guided tour of the public `@sharpee/*` library API
  behind the author's code.

You can switch tracks at any time, and you can change your mind chapter to
chapter. The narrative never depends on the boxes.

> *We use "track" for reading order. "Path" in this book always means an API or
> import path, never a way of reading.*

## The "Under the Hood" box

Whenever the author code uses a piece of the Sharpee library, an **Under the
Hood** box shows the public surface of what was used: the class, its
constructor, the relevant methods and types. It shows *signatures only*: never
the implementation, never internal platform code, never anything you don't get
from the installed npm package. Here is the legend, and a live example:

::: under-the-hood
**Under the Hood: `ContainerTrait`** · `@sharpee/world-model`

```typescript
class ContainerTrait implements ITrait {
  constructor(data?: Partial<ContainerTrait>);
  capacity?: { maxWeight?: number; maxVolume?: number; maxItems?: number };
  isTransparent: boolean;
  enterable: boolean;
}
```

When you write `new ContainerTrait({ capacity: { maxItems: 10 } })`, you're
constructing this class. The standard `take` and `inventory` actions read its
`capacity` to decide what fits.
:::

If you're on the Author's Track, that box was safe to skip; the chapter body
already told you the player can carry things. If you're on the Programmer's
Track, you just saw the exact class behind it.

## How the zoo grows

Every chapter advances the same story. The code is versioned: `v01` is a single
room, `v02` adds a second room, and so on through the complete game. Each
chapter's code matches a real, compiled version in the book's companion
repository, under `tutorials/familyzoo/src/`; browse it on GitHub at
<https://github.com/ChicagoDave/sharpee/tree/main/tutorials/familyzoo/src>. You
don't need to clone anything to read along; anything you read here, you can run.

## Conventions

- Commands you type into the game are shown in a transcript block, prefixed `>`.
- TypeScript you write appears in fenced code blocks.
- Under the Hood boxes are the only place library *signatures* appear; author
  code in the body is always code *you* write.
