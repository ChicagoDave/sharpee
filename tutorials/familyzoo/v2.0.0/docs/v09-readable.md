# Version 9: Readable Objects

## What This Version Does

Info plaques appear at the petting zoo and aviary with detailed animal facts. A warning sign near the nocturnal exhibit cautions about flash photography. A zoo brochure at the entrance can be picked up and read anywhere.

## What's New (Compared to V8)

V8 introduced light and dark. V9 adds ReadableTrait — entities with text the player can read, separate from their physical description.

## What You'll Learn

### ReadableTrait

ReadableTrait gives an entity text that the `read` action displays:

```typescript
plaque.add(new ReadableTrait({
  text: 'PYGMY GOATS — These Nigerian Dwarf goats are gentle...',
}));
```

### Read vs Examine

This is the key distinction:

| Command | Trait Used | What It Shows |
|---------|-----------|--------------|
| `examine plaque` | `IdentityTrait.description` | What the object looks like |
| `read plaque` | `ReadableTrait.text` | What the object says |

A brass plaque *looks like* "a brass plaque mounted on a wooden post." But it *says* "PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and always hungry."

Not everything readable needs to look the same. A brochure looks like a glossy pamphlet but reads as a guide to the zoo.

### Readable + Scenery = Info Plaques

Plaques are scenery (can't take them) that you can read:

```typescript
plaque.add(new IdentityTrait({ description: 'A brass plaque...' }));
plaque.add(new ReadableTrait({ text: 'PYGMY GOATS...' }));
plaque.add(new SceneryTrait());  // Can't take it
```

### Readable + Portable = Brochures, Letters, Books

Portable readable items can be taken and read anywhere:

```typescript
brochure.add(new IdentityTrait({ description: 'A glossy tri-fold brochure.' }));
brochure.add(new ReadableTrait({ text: 'WILLOWBROOK FAMILY ZOO — Your Guide...' }));
// No SceneryTrait — player can take it
```

### When to Use ReadableTrait vs Just a Long Description

Use **ReadableTrait** when the object has distinct written content — signs, books, letters, labels, inscriptions.

Use **IdentityTrait.description** alone when the object is just a physical thing to look at — a rock, a fence, a tree.

The test: would a real person say "I want to *read* this"? If yes, use ReadableTrait.

## Commands to Try

```
> take brochure          Pick up the brochure
> read brochure          Read the zoo guide
> examine brochure       See the physical brochure
> south; east            Go to Petting Zoo
> read plaque            Read about the animals
> examine plaque         See the plaque itself
```

## The Code

See `src/v09.ts` for the complete, commented source.

## Key Takeaway

ReadableTrait separates what an object *says* from what it *looks like*. `examine` shows the description; `read` shows the text. Use ReadableTrait for anything with written content.
