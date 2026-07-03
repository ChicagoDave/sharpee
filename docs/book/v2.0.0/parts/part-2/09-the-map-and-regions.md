# The Map & Regions: Grouping Rooms

You've quietly been building a map since Chapter 4. Every `RoomTrait` you gave an
`exits` table added another connection, and together the zoo's six rooms
(entrance, main path, petting zoo, aviary, and the supply room and nocturnal
exhibit behind the staff gate) form a small but complete map. This chapter steps
back to look at
that map as a whole, and introduces **regions**: a way to treat a group of rooms as
a single named place.

## The map is the exits

There is no separate "map" object in Sharpee. The map *is* the set of exits you
declared on each room: a graph of rooms joined by directions. A couple of habits
keep that graph sane as it grows:

- **Make exits reciprocal.** If the main path leads east to the petting zoo, the
  petting zoo should lead west back. Sharpee won't add the return exit for you, and
  a one-way passage the player can't retrace is almost always a bug.
- **Keep directions consistent.** If north takes the player somewhere, south should
  bring them back. Players build a mental map from your compass; contradicting it is
  disorienting.
- **Route doored connections through the door.** The staff gate connection uses
  `via` so the door is actually checked (Chapter 7); the map and the barrier on it
  are the same link.

For six rooms you can hold the whole map in your head. For sixty, you'll want a way
to talk about *areas* rather than individual rooms. That's what regions are for.

## Regions: grouping rooms

A **region** is a named area that owns a set of rooms. The zoo divides naturally
into two: the public area the visitor wanders freely (entrance, main path, petting
zoo, aviary) and the staff area behind the gate (supply room, nocturnal exhibit).
Regions let you name that division and act on it.

Create regions in `initializeWorld()`, before the rooms that belong to them:

```typescript
world.createRegion('reg-public', {
  name: 'Public Zoo',
});

world.createRegion('reg-staff', {
  name: 'Staff Area',
  ambientSmell: 'disinfectant and animal feed',
});
```

By convention region IDs take a `reg-` prefix, to tell them apart from room IDs at
a glance.

Then, after the rooms exist, assign each one to its region:

```typescript
world.assignRoom(entrance.id, 'reg-public');
world.assignRoom(mainPath.id, 'reg-public');
world.assignRoom(pettingZoo.id, 'reg-public');
world.assignRoom(aviary.id, 'reg-public');

world.assignRoom(supplyRoom.id, 'reg-staff');
world.assignRoom(nocturnalExhibit.id, 'reg-staff');
```

## Region-wide properties

The reason to group rooms is that a region can carry properties
its rooms inherit. A `RegionOptions` object accepts a few:

| Property | What it does |
|---|---|
| `name` | The region's human-readable name (required) |
| `defaultDark` | Rooms in the region start dark unless they say otherwise |
| `ambientSound` | A region-wide sound (dripping water, distant traffic) |
| `ambientSmell` | A region-wide smell |
| `parentRegionId` | Nest this region inside another |

Setting `defaultDark: true` on, say, a cave region saves you marking every room
`isDark` by hand: a property that belongs to the *area* lives on the area.

## Crossing the boundary

The real power shows up when the player moves *between* regions. When a `go`
command carries the player from a room in one region to a room in another, the
engine emits two events automatically:

- `if.event.region_exited`, fired once for each region being left,
- `if.event.region_entered`, fired once for each region being entered.

You react to them exactly the way you'll react to any event in Volume IV, by
registering a handler:

```typescript
world.registerEventHandler('if.event.region_entered', (event, world) => {
  const data = event.data as { regionId?: string } | undefined;
  if (data?.regionId === 'reg-staff') {
    // The visitor just slipped into the staff area: flavor, a warning,
    // a scoring hook, whatever the moment calls for.
  }
});
```

(`event.data` is typed `unknown`, so the cast is what lets the strict compiler
accept the field access.)

This is the natural home for "as you enter the old town, the noise of the market
swells": atmosphere keyed to an area instead of bolted onto every room's
description.

## Nesting and querying

Regions can nest. Give one a `parentRegionId` and a room in the child counts as
being in the parent too:

```typescript
world.createRegion('reg-underground', { name: 'The Underground', defaultDark: true });
world.createRegion('reg-mine', { name: 'Coal Mine', parentRegionId: 'reg-underground' });
// a room in reg-mine answers true for reg-underground as well
```

And you can ask the world about membership at any time:
`world.isInRegion(roomId, 'reg-staff')` gives a yes/no. If you add the optional
`@sharpee/queries` package, its entity-query API lists every room in an area:
`world.rooms.inRegion('reg-staff', world).toArray()`. The package installs
`world.rooms` as a side effect, so it only exists after an
`import '@sharpee/queries';` line somewhere in your story; without that import,
the plain `WorldModel` gives you `isInRegion`.

## Key takeaway

The map is nothing more than the exits you declare on each room: keep them
reciprocal and consistent and the graph stays trustworthy. When a map grows past
what you can hold in your head, **regions** group rooms into named areas that can
share properties (`defaultDark`, ambient sound and smell) and, best of all, fire
`if.event.region_entered` / `region_exited` as the player crosses between them, the
hook for area-wide atmosphere and events. The zoo is small enough to skip regions
entirely; reach for them when your world gets big enough to think about in
neighborhoods.
