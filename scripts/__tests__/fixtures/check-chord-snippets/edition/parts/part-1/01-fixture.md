# A fixture chapter

This file is the fixture for `scripts/__tests__/check-chord-snippets.test.ts`.
It is not part of any book. Each fence below is one case the checker must
sort correctly, and two of them are broken on purpose.

Fence 1 is two lines of the snapshot.

```chord
create the Pantry, a room
  north to the Scullery
```

Fence 2 is an excerpt of a snapshot block, with a line left out.

```chord
create the jar, a thing
  ...
  A jar.
```

Fence 3 is a fragment that stands at the top level of a story.

```chord
create the Larder, a room

  A larder.
```

Fence 4 is broken: `rom` is not a kind.

```chord
create the Cellar, a rom

  A cellar.
```

Fence 5 is fence 1 with its second line pulled out to the margin, which
changes what it means.

```chord
create the Pantry, a room
north to the Scullery
```

Fence 6 is one the chapter shows being refused. It has a harness of its own.

```chord
create the lid, a thing
  in the Attic
```

Fence 7 is broken and listed in the known issues.

```chord
create the Vat, a vatt

  A vat.
```

A fence in another language is not checked.

```text
create the Nothing, a rom
```
