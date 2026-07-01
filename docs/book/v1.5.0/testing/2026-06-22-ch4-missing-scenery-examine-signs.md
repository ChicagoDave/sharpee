# Chapter 4 omits the scenery that v02 adds — `examine signs` in §4.7 "Try it" fails

**Labels:** `book`, `content`, `chapter-4`, `blocker`
**Found by:** book QA pass (following *The Sharpee Author and Developer Manual* literally as a naive reader)
**Date:** 2026-06-22
**Affected:** *The Sharpee Author and Developer Manual* — Chapter 4 "Rooms & Navigation" (§4.4 code listing, §4.7 "Try it")
**Reference code (correct):** `tutorials/familyzoo/src/v02.ts`
**Environment:** Linux, node v22.23.0, npm 11.17.0, `@sharpee/*` 1.0.8 (the 1.0.7 CLI blocker is fixed — CLI works end to end)

## Summary

A reader who builds the Chapter 4 zoo exactly as the §4.4 listing shows cannot
run one of the §4.7 "Try it" commands. The listing creates the four rooms and
then says scenery is *"placed exactly as before,"* but the corresponding
reference version (`v02.ts`) actually introduces **three new scenery objects** —
`direction signs` (Main Path), `pygmy goats` (Petting Zoo), and a `toucan`
(Aviary). The §4.7 transcript depends on one of them:

```
> examine signs            Read the direction signs
```

With no `direction signs` object created, this command fails for every reader.
Navigation itself — the actual subject of the chapter — is correct.

## Steps to reproduce

1. Build the zoo as printed in §4.4 (four rooms + both-way exits; entrance keeps
   only its welcome sign + ticket booth "as before").
2. `sharpee build`, serve `dist/web/`, play.
3. `south` (to Main Path), then `examine signs`.

## Actual result

```
> south

Main Path
A broad gravel path runs through the heart of the zoo...

> examine signs

You can't see any such thing.
```

Everything else in §4.7 passes: `south → Main Path`, `east → Petting Zoo`,
`west → Main Path`, `west → Aviary`, `east → Main Path`, `north → Zoo Entrance`.
Verified by driving the built web client headlessly (Playwright/Chromium).

## Root cause

§4.4's listing ends with the comment:

> `// ...scenery and the player are placed exactly as before.`

That is inaccurate for this version. `tutorials/familyzoo/src/v02.ts`
("Version 2: Multiple Rooms & Navigation") adds new scenery beyond Ch2's
entrance objects:

| Object | Room | aliases (relevant) | v02.ts line |
|---|---|---|---|
| `direction signs` | Main Path | `signs`, `direction signs`, `arrow signs`, `post` | 233 |
| `pygmy goats` | Petting Zoo | `goats`, `pygmy goats`, `goat` | 248 |
| `toucan` | Aviary | `toucan`, `bird`, `toco toucan` | 264 |

`examine signs` resolves via the `signs` alias on the omitted `direction signs`
object. Because the book's prose collapses all of this to "placed exactly as
before," the reader never creates it.

## Fix

Preferred — make §4.4 match `v02.ts`: add the three scenery objects to the Ch4
listing (or at minimum show the `direction signs` object and note the others are
built "the same way"). The reference definition to surface:

```ts
const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
directionSigns.add(new IdentityTrait({
  name: 'direction signs',
  description:
    'A cluster of brightly colored arrow signs nailed to a wooden post. ' +
    'They point to: PETTING ZOO (east), AVIARY (west), ' +
    'REPTILE HOUSE (south — coming soon!), and EXIT (north).',
  aliases: ['signs', 'direction signs', 'arrow signs', 'post'],
  article: 'some',
}));
directionSigns.add(new SceneryTrait());
world.moveEntity(directionSigns.id, mainPath.id);
```

Alternative (weaker): drop the `examine signs` line from §4.7. Not recommended —
the Main Path description already mentions direction signs, so a reader will try
to examine them regardless, and the goats/toucan are referenced by later
chapters.

## Note on chapter ↔ version mapping

`v02.ts` introduces `SceneryTrait` *and* the new scenery, yet the book defers the
deep `SceneryTrait` treatment to Chapter 5. So Chapter 4 is built on a version
that already contains scenery the chapter hasn't formally introduced. Worth a
deliberate decision: either Ch4 shows the new scenery (forward-referencing Ch5),
or the tutorial is re-split so the four-room nav version carries only navigation.
The current state — code present in v02, hidden behind "placed exactly as
before" in the book — is the worst of both.

## Acceptance criteria

- [ ] §4.4 listing creates (or explicitly directs the reader to create) the
      `direction signs` object on the Main Path, matching `v02.ts`.
- [ ] Every §4.7 "Try it" command, including `examine signs`, succeeds when run
      against a zoo built from the chapter as printed.
- [ ] Decision recorded on whether goats/toucan and `SceneryTrait` belong in
      Ch4's narrative or are deferred to Ch5.
- [ ] Re-run the book QA pass from §4.7 forward.
