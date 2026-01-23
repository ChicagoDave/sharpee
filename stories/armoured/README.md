# Armoured - Sample Story

A sample Sharpee story demonstrating trait composition for equipment systems.

## Purpose

This story showcases the "Sharpee Way" of building game systems, contrasted with Inform 7's approach.

### Inform 7 Approach

```inform7
Armor is a kind of equipment. Armor is wearable. Armor has a number called AC.

Table of Body Protection
Armor        Cost    Weight    AC
padded robe    0.5    3.0    11
leather armor  15.0   20.0   13
```

Problems with this approach:
- No compile-time type checking
- Positional columns (reorder and things break)
- Limited IDE support
- Debugging is guesswork

### Sharpee Approach

```typescript
// Focused, single-purpose trait
class ArmorTrait implements ITrait {
  armorClass: number;
  slot: 'body' | 'shield';
}

// Type-safe data definition
const BODY_ARMOR: ArmorDefinition[] = [
  { id: 'leather-armor', name: 'leather armor', armorClass: 13, ... },
];

// Composition: entity has multiple traits
armor.add(new IdentityTrait({ name: 'leather armor', weight: 20 }));
armor.add(new WearableTrait());
armor.add(new ArmorTrait({ armorClass: 13, slot: 'body' }));
armor.add(new ValueTrait({ cost: 15 }));
```

Benefits:
- Compile-time type checking
- IDE autocomplete and refactoring
- Explicit composition (no hidden inheritance)
- Flexibility (items can have multiple capabilities)

## Structure

```
src/
├── traits/           # Custom story traits
│   ├── armor-trait.ts
│   ├── weapon-trait.ts
│   ├── value-trait.ts
│   └── combatant-trait.ts
├── data/             # Type-safe equipment definitions
│   ├── armor-data.ts
│   └── weapon-data.ts
├── factories/        # Entity creation functions
│   ├── equipment-factory.ts
│   └── scenery-factory.ts
├── regions/          # Room definitions
│   └── guild-hall.ts
├── combat/           # Combat calculations
│   └── combat-utils.ts
└── index.ts          # Story entry point
```

## Key Patterns

### 1. Single-Responsibility Traits

Each trait does one thing:

| Trait | Responsibility |
|-------|----------------|
| `ArmorTrait` | Defensive protection (AC, slot) |
| `WeaponTrait` | Offensive capability (damage, type) |
| `ValueTrait` | Economic worth (cost) |
| `CombatantTrait` | Combat state (health, AC, attack) |

### 2. Composition Over Inheritance

Instead of class hierarchies:

```typescript
// NOT this (inheritance)
class LeatherArmor extends Armor extends Equipment extends Item { }

// THIS (composition)
armor.add(new IdentityTrait({ ... }));
armor.add(new WearableTrait());
armor.add(new ArmorTrait({ ... }));
armor.add(new ValueTrait({ ... }));
```

### 3. Factory Functions

Consistent entity creation:

```typescript
export function createArmor(world, definition): IFEntity {
  const armor = world.createEntity(definition.id, EntityType.OBJECT);
  armor.add(new IdentityTrait({ ... }));
  armor.add(new WearableTrait());
  armor.add(new ArmorTrait({ ... }));
  armor.add(new ValueTrait({ ... }));
  return armor;
}
```

### 4. Derived Calculations

Query traits to compute values:

```typescript
function calculateArmorClass(entity, world): number {
  const combatant = entity.get(CombatantTrait);
  let ac = combatant?.baseArmorClass ?? 10;

  for (const item of world.getContents(entity.id)) {
    const armor = item.get(ArmorTrait);
    if (armor?.slot === 'body') ac = Math.max(ac, armor.armorClass);
    if (armor?.slot === 'shield') ac += armor.armorClass;
  }

  return ac;
}
```

## Equipment

### Body Armor

| Name | AC | Cost | Weight |
|------|-----|------|--------|
| Padded Robe | 11 | 0.5 | 3 |
| Leather Armor | 13 | 15 | 20 |
| Chain Mail | 15 | 75 | 50 |
| Plate Mail | 17 | 400 | 80 |

### Shields

| Name | AC Bonus | Cost | Weight |
|------|----------|------|--------|
| Wooden Shield | +1 | 1 | 5 |
| Metal Shield | +2 | 5 | 15 |

### Weapons

| Name | Damage | Type | Category | Cost |
|------|--------|------|----------|------|
| Dagger | 4 | Piercing | Melee | 2 |
| Shortsword | 6 | Slashing | Melee | 10 |
| Longsword | 8 | Slashing | Melee | 25 |
| Battleaxe | 10 | Slashing | Melee | 20 |
| Warhammer | 8 | Bludgeoning | Melee | 15 |
| Shortbow | 6 | Piercing | Ranged | 12 |
| Longbow | 8 | Piercing | Ranged | 30 |
| Crossbow | 10 | Piercing | Ranged | 50 |

## Rooms

- **Entrance Hall** - Starting location
- **Armory** - Equipment display (east of entrance)
- **Training Yard** - Practice dummy (north of entrance)

## Running

```bash
# Build the story
cd stories/armoured
pnpm install
pnpm build

# Play (requires engine setup)
# node dist/sharpee.js --story armoured --play
```
