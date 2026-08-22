## Jack Toresal and The Secret Letter — Chord port
##
## Chapter 1: the Prologue and Grubber's Market, as one extent.
##
## AUTHORITY. Every line of prose in this file is either Michael Gentry's 2009
## text carried over, or a marked placeholder for a line David has still to
## write. Nothing here is drafted by an assistant. Where the change document
## calls for new prose, this file carries a `## DAVID:` marker and a phrase
## whose body says so, so the gap is loud at run time instead of quiet.
##
## What the port is checked against:
##   docs/references/textfyre/secretletter/           the 2009 I7 source and design archive
##   docs/references/textfyre/secretletter/INVENTORY.md   84 rooms, 47 NPCs, 23 quip trees
##   docs/work/secret-letter-port/change-document.md  Chapter 1's decisions (the content authority)
##   docs/work/secret-letter-port/vision.md           the whole-remake premises
##   docs/work/secret-letter-port/plan.md             the eleven-phase plan
##
## This is a RETARGET, not a faithful port. The original's non-IF middle-school
## audience constraint is gone, so the 2009 game is the reference, not the spec.

story
  title: Jack Toresal and The Secret Letter
  authors:
    David Cornelson
    Michael Gentry
  id: secret-letter
  ifid: B4647034-34D8-40E3-B2F3-B590573387CB
  story-version: 0.1.0
  description: Grubber's Market, a stolen apple, and a girl the whole city is about to start looking for.
  states: calm, chase

## ---------------------------------------------------------------------------
## THE MARKET
##
## Seventeen rooms: the alley, fourteen market locations, and the two stages of
## the centre post. Geometry and room text are the source's, converted from
## `story.ni:1474, 2206-3005, 3623, 3666`. The market is a ring of stalls
## around a hub, and almost every stall names its own exits in its description,
## so the exit lists below are checkable against the prose beside them.
##
## The P-8 spike (per-room "seen from elsewhere" text — the source's `distant
## description` / `dead-end description`, `Adjacent Rooms`) is NOT wired here
## yet. It runs as its own increment against these rooms; see the plan's
## Phase 6 deliverable.
## ---------------------------------------------------------------------------

create the Alley
  a room
  aka narrow alley
  southeast to the Northwest Junction

  This narrow alley is tucked away between a storehouse on one side and the
  canvas wall of a stallkeeper's tent on the other. It serves primarily as
  somewhere out-of-the-way for stallkeepers to sweep their garbage, so it's not
  exactly the most pleasant-smelling place in all of Miradania, but at least no
  one is likely to bother you here. You can leave to the southeast.

create the Northwest Junction
  a room
  aka junction, northwest corner
  northwest to the Alley
  northeast to the Grocery Stall
  south to the Herb Stall
  east to the Candlemaker's Stall
  southeast to the Rope Stall

  This is the northwest corner of Grubber's Market. You can skirt around the
  edge of the market to the northeast or south, or head into the thick of it to
  the east or southeast. A wide, paved road leads north. You can also duck back
  into the alley to the northwest.

create the Grocery Stall
  a room
  aka grocer, grocers stall
  southwest to the Northwest Junction
  southeast to the Fruit Stall
  south to the Candlemaker's Stall

  This is a typical grocer's stall, with various kinds of food set out. There
  are baskets bristling with loaves of bread, yellow pyramids of cheese, and
  spiced jerky hanging in bundles overhead. You can continue along the market's
  outer ring to the southwest or southeast, or head in towards the center of the
  market to the south.

create the Fruit Stall
  a room
  aka fruit
  northwest to the Grocery Stall
  west to the Candlemaker's Stall
  southwest to the Pottery Stall
  south to the Eastern Junction
  states: orderly, chaotic

  Bins heaped high with brightly colored fruit lend a pleasant fragrance to this end
  of the market (though by afternoon it will have become a cloying reek that
  attracts more flies than customers). They have apples and pears from the city
  orchards, and brambleberries from the northern counties. Oranges, limes, kello
  fruit — even a bushel of bananas from the Kozar Delta. Aisles between the
  stalls lead northwest, west, southwest, and south.

create the Eastern Junction
  a room
  aka eastern edge
  north to the Fruit Stall
  south to the Hat Stall
  west to the Pottery Stall

  You're near the eastern edge of Grubber's Market. Commerce Street lies to the east.
  You can travel along the outer ring of stalls to the north or south, or
  head towards the market's central hub to the west.

create the Hat Stall
  a room
  aka hats, hatter
  north to the Eastern Junction
  northwest to the Pottery Stall
  west to Outside the Silk Tent
  southwest to the Leather Stall

  Hats of all styles and sizes hang from scores of wooden pegs, a forest of
  varied headgear. They have big, flop-brimmed traveling hats; small, leather
  workman's caps; wide sappans of woven straw from the Kozar delta; fancy,
  feathered hats for courtly balls; and even a few ordinary bonnets. More stalls
  lie to the north, northwest, west, and southwest.

create the Leather Stall
  a room
  aka leather, leather shop, leather goods
  northeast to the Hat Stall
  northwest to Outside the Silk Tent
  west to the Weaponsmith's Stall

  This merchant mostly deals in riding equipment — reins, harnesses, stirrups,
  and the like. A full riding saddle sits on proud display near the back. There
  are a few scabbards and belts for sale, as well. More stalls lie to the west, northwest,
  and northeast.

create the Weaponsmith's Stall
  a room
  aka weapons stall, weapons, weaponsmith, smith
  east to the Leather Stall
  northeast to Outside the Silk Tent
  northwest to the Exotic Gems Stall

  The weaponsmith's wares hang along the sides of his stall, a grim picket fence
  of down-hanging blades. You can find less intimidating stalls to the east, northeast,
  and northwest.

create the Exotic Gems Stall
  a room
  aka gems stall, gems, jewels, jeweler
  north to the Herb Stall
  northeast to the Rope Stall
  east to Outside the Silk Tent
  southeast to the Weaponsmith's Stall

  Dozens of jewels in exotic colors and cuts are spread out on display here,
  glittering in the dusty sunlight. Some of them are loose stones, others are set in
  finely wrought rings and necklaces. Most of them were probably smuggled in
  from over the western mountains, which is why they're cheap enough to be
  affordable to anyone in Grubber's Market. Still, they're far, far out of your
  price range. Other stalls lie to the north, northeast, east, and southeast.

create the Herb Stall
  a room
  aka herbs, herbalist
  north to the Northwest Junction
  east to the Rope Stall
  south to the Exotic Gems Stall

  The herb stall is usually a quiet place. Customers here like to browse, poke
  their noses into the various jars, and judge the potency of a potential
  purchase at their leisure. Other stalls are to the south, and east, and the
  market opens out a little to the north.

create the Rope Stall
  a room
  aka rope, rope dealer, ropemaker
  northwest to the Northwest Junction
  northeast to the Candlemaker's Stall
  west to the Herb Stall
  southwest to the Exotic Gems Stall
  southeast to Outside the Silk Tent

  One thing you can say about the rope stall: you'll never spend a moment
  wondering what's for sale. It's all rope, and lots of it: thick and thin,
  knotted and loose, in heaps and in coils, stacked on the ground and dangling in
  loops. More stalls are to the northeast, southeast, west, and southwest, and
  the market opens out a bit to the northwest.

create the Candlemaker's Stall
  a room
  aka candle stall, candles, candlemaker, chandler
  north to the Grocery Stall
  east to the Fruit Stall
  west to the Northwest Junction
  southeast to the Pottery Stall
  southwest to the Rope Stall

  The heat and fumes from the candlemaker's tallow pots make this stall an
  unpleasant place to loiter. Still, people need candles, and customers seem to be
  buying them as fast as the stallkeeper can dip them. Most of the candles are
  tallow, fast-burning and cheap, but there are also a number of premade wax
  candles in different colors. Other stalls are to the north, east, west, southeast,
  and southwest.

create the Pottery Stall
  a room
  aka pottery, potter, urns
  northwest to the Candlemaker's Stall
  northeast to the Fruit Stall
  east to the Eastern Junction
  southeast to the Hat Stall
  southwest to Outside the Silk Tent

  The wares at the pottery stall are spread out on the ground, forcing browsers
  and passers-by to step carefully around them. The urns, jars, and bowls are each
  uniquely shaped, yet they all share a common, graceful curve. Most of them are
  made of fired clay from the Westlands, decorated with colorful glazes. There are
  more stalls to the northwest, northeast, southeast, and southwest, or you can
  head out to the market's edge to the east.

create Outside the Silk Tent
  a room
  aka silk stall, outside the tent, teishas stall
  north to Inside the Silk Tent
  east to the Hat Stall
  west to the Exotic Gems Stall
  northeast to the Pottery Stall
  northwest to the Rope Stall
  southeast to the Leather Stall
  southwest to the Weaponsmith's Stall

  Teisha has done well enough for herself that her 'stall' is actually a full-on
  tent. You can enter the tent to the north, or move on to one of the many other
  stalls to the east, west, northeast, northwest, southeast, or southwest.

create Inside the Silk Tent
  a room
  aka silk tent, tent, inside the tent
  south to Outside the Silk Tent
  north to the Base of the Center Post

  The walls of the tent provide a bit of quiet and privacy from the crowds outside
  (in addition to keeping dust off the merchandise). Beautiful silk garments hang on
  either side. Gowns, robes, capes, cloaks, and shawls, the fabric rippling
  with the slightest movement of air, shimmering with that soft, liquid glow that
  only silk has. The main market lies to the south. A narrow gap to the north
  leads behind the tent.

create the Base of the Center Post
  a room
  aka center post, centre post, post, base of the post, behind the tent
  south to Inside the Silk Tent
  up to the Top of the Post

  This is a cramped little square formed by the backs of three stalls and Teisha's
  tent. It's barely big enough to stretch your arms out in. Right in the middle is
  the base of the huge central support post. You can duck back into Teisha's tent
  to the south.

create the Top of the Post
  a room
  aka top of the center post, top of the centre post, top
  down to the Base of the Center Post

  Perched atop the high central post, you can look out over the whole market
  square. To the north, Lord's Road heads out of the city towards Lord's Keep.
  Commerce Street and the rest of the city beckon to the east. In every other
  direction the city is surrounded by rolling meadows and farmlands.

  Four anchor cables stretch away in four directions: northwest, northeast, southwest,
  and southeast.

## ---------------------------------------------------------------------------
## THE PLAYER
##
## Jack begins the walk in the market rather than holding the apple in the alley
## (change document, "The opening"): the 2009 game opened with a ~350-word
## narrated block (`story.ni:1469`) and started Jack already holding the apple
## (`story.ni:2415`). Both are gone. She walks in from the north road, at the
## junction the alley also opens onto.
##
## STRUCTURAL CHOICE, not a content one: the change document fixes that the walk
## is played and that the apple ends it, but not which square it starts on. The
## junction is the market's own entrance and the alley's doorstep, so the walk
## can end where the source's narration ended.
## ---------------------------------------------------------------------------

create the player
  starts in the Northwest Junction
  wears the old gray cloak

  Jack Toresal, who has been a boy in this market for as long as anyone here has
  bothered to look.

create the old gray cloak
  aka gray cloak, grey cloak, cloak, old cloak
  wearable

  Your cloak is made of undyed wool, stained and patched in several places. You
  wear it in the masculine style, fastened on the side and thrown back over your
  right shoulder.

## ---------------------------------------------------------------------------
## P-8 — "SEEN FROM ELSEWHERE"
##
## The source's `distant description` (the `Adjacent Rooms` extension) carried a
## short line about the room a direction leads to. There is no platform
## equivalent, so P-8 authorises it as story content. The spike's answer, run
## against these rooms 2026-08-22, is below; the three shapes P-8 offered were
## a room-body field, a `define trait`, and a phrase key.
##
##   * A ROOM-BODY FIELD does not exist. `create` accepts no such property
##     (`packages/chord/src/parser.ts:1190-1420`).
##   * A `define trait` cannot hold the text. Trait data types are `entity`,
##     `number`, `name`, and `flag` (`packages/chord/src/parser.ts:3360`) — there
##     is no text-valued field.
##   * A PHRASE KEY wins by elimination, and it has to be a story-level named
##     phrase rather than a per-room `phrase distant:` override: an override
##     does register `<room-id>.distant`, but `phrase` statements take a STATIC
##     key (`packages/chord/src/parser.ts:6366`), so nothing can say "emit that
##     room's distant phrase." The dispatch must name every pair.
##
## Hence: one phrase per target room, and one dispatch line per (room,
## direction) pair. Flat and greppable, and the analyzer checks every name.
##
## THE DIRECTION WORDS ARE DELIBERATELY NOT COMPASS WORDS. A `directions` block
## whose canonicals are compass words binds a value that never compares equal,
## so every `when the direction is …` is silently false — filed as GH #285. The
## `wayNE`-style canonicals below are the workaround; the compass words the
## player actually types are aliases, so nothing changes at the keyboard.
##
## OPEN — DAVID'S RULING. The source's line ended "…to the [quick best route]",
## naming the way to walk. That clause is dropped here, because the player has
## just supplied the direction and Chord cannot interpolate the canonical back
## as a compass word (it would read "wayNE"). If the route should survive, it
## needs a per-pair phrase instead of a per-room one — roughly sixty phrases
## rather than fourteen.
## ---------------------------------------------------------------------------

define action peering
  grammar
    peer the direction
    look toward the direction
    look the direction
  directions
    wayN or north or n
    wayNE or northeast or ne
    wayE or east or e
    waySE or southeast or se
    wayS or south or s
    waySW or southwest or sw
    wayW or west or w
    wayNW or northwest or nw
    wayUp or up or u
    wayDown or down or d
  refuse without direction: peer-where

  phrase distant-northwest-junction when the direction is waySE and the player is in the Alley

  phrase distant-herb-stall when the direction is wayS and the player is in the Northwest Junction
  phrase distant-candle-stall when the direction is wayE and the player is in the Northwest Junction
  phrase distant-rope-stall when the direction is waySE and the player is in the Northwest Junction

  phrase distant-northwest-junction when the direction is waySW and the player is in the Grocery Stall
  phrase distant-fruit-stall when the direction is waySE and the player is in the Grocery Stall
  phrase distant-candle-stall when the direction is wayS and the player is in the Grocery Stall

  phrase distant-candle-stall when the direction is wayW and the player is in the Fruit Stall
  phrase distant-pottery-stall when the direction is waySW and the player is in the Fruit Stall
  phrase distant-eastern-junction when the direction is wayS and the player is in the Fruit Stall

  phrase distant-fruit-stall when the direction is wayN and the player is in the Eastern Junction
  phrase distant-hat-stall when the direction is wayS and the player is in the Eastern Junction
  phrase distant-pottery-stall when the direction is wayW and the player is in the Eastern Junction

  phrase distant-eastern-junction when the direction is wayN and the player is in the Hat Stall
  phrase distant-pottery-stall when the direction is wayNW and the player is in the Hat Stall
  phrase distant-silk-tent-outside when the direction is wayW and the player is in the Hat Stall
  phrase distant-leather-stall when the direction is waySW and the player is in the Hat Stall

  phrase distant-hat-stall when the direction is wayNE and the player is in the Leather Stall
  phrase distant-silk-tent-outside when the direction is wayNW and the player is in the Leather Stall
  phrase distant-weapons-stall when the direction is wayW and the player is in the Leather Stall

  phrase distant-leather-stall when the direction is wayE and the player is in the Weaponsmith's Stall
  phrase distant-silk-tent-outside when the direction is wayNE and the player is in the Weaponsmith's Stall
  phrase distant-gems-stall when the direction is wayNW and the player is in the Weaponsmith's Stall

  phrase distant-herb-stall when the direction is wayN and the player is in the Exotic Gems Stall
  phrase distant-rope-stall when the direction is wayNE and the player is in the Exotic Gems Stall
  phrase distant-silk-tent-outside when the direction is wayE and the player is in the Exotic Gems Stall
  phrase distant-weapons-stall when the direction is waySE and the player is in the Exotic Gems Stall

  phrase distant-northwest-junction when the direction is wayN and the player is in the Herb Stall
  phrase distant-rope-stall when the direction is wayE and the player is in the Herb Stall
  phrase distant-gems-stall when the direction is wayS and the player is in the Herb Stall

  phrase distant-northwest-junction when the direction is wayNW and the player is in the Rope Stall
  phrase distant-candle-stall when the direction is wayNE and the player is in the Rope Stall
  phrase distant-herb-stall when the direction is wayW and the player is in the Rope Stall
  phrase distant-gems-stall when the direction is waySW and the player is in the Rope Stall
  phrase distant-silk-tent-outside when the direction is waySE and the player is in the Rope Stall

  phrase distant-fruit-stall when the direction is wayE and the player is in the Candlemaker's Stall
  phrase distant-northwest-junction when the direction is wayW and the player is in the Candlemaker's Stall
  phrase distant-pottery-stall when the direction is waySE and the player is in the Candlemaker's Stall
  phrase distant-rope-stall when the direction is waySW and the player is in the Candlemaker's Stall

  phrase distant-candle-stall when the direction is wayNW and the player is in the Pottery Stall
  phrase distant-fruit-stall when the direction is wayNE and the player is in the Pottery Stall
  phrase distant-eastern-junction when the direction is wayE and the player is in the Pottery Stall
  phrase distant-hat-stall when the direction is waySE and the player is in the Pottery Stall
  phrase distant-silk-tent-outside when the direction is waySW and the player is in the Pottery Stall

  phrase distant-silk-tent-inside when the direction is wayN and the player is in Outside the Silk Tent
  phrase distant-hat-stall when the direction is wayE and the player is in Outside the Silk Tent
  phrase distant-gems-stall when the direction is wayW and the player is in Outside the Silk Tent
  phrase distant-pottery-stall when the direction is wayNE and the player is in Outside the Silk Tent
  phrase distant-rope-stall when the direction is wayNW and the player is in Outside the Silk Tent
  phrase distant-leather-stall when the direction is waySE and the player is in Outside the Silk Tent
  phrase distant-weapons-stall when the direction is waySW and the player is in Outside the Silk Tent

  phrase distant-silk-tent-outside when the direction is wayS and the player is in Inside the Silk Tent

  phrase distant-silk-tent-inside when the direction is wayS and the player is in the Base of the Center Post
  phrase distant-top-of-post when the direction is wayUp and the player is in the Base of the Center Post

  phrases en-US
    peer-where:
      Look which way?

define phrase distant-fruit-stall, randomly
  There's a fruit stall.
or
  There's fruit for sale.
or
  Looks like they're selling fruit.
end phrase

define phrase distant-hat-stall, randomly
  There's a hat stall.
or
  There's hats for sale.
or
  Looks like they're selling hats.
end phrase

define phrase distant-leather-stall, randomly
  There's a leather goods stall.
or
  There's leather goods for sale.
or
  Looks like they're selling leather goods.
end phrase

define phrase distant-weapons-stall, randomly
  There's a weapon stall.
or
  There's weapons for sale.
or
  Looks like they're selling weapons.
end phrase

define phrase distant-gems-stall, randomly
  There's a gem stall.
or
  There's gems for sale.
or
  Looks like they're selling gems.
end phrase

define phrase distant-herb-stall, randomly
  There's a herb stall.
or
  There are herbs for sale.
or
  Looks like they're selling herbs.
end phrase

define phrase distant-rope-stall, randomly
  There's a rope stall.
or
  There's rope for sale.
or
  Looks like they're selling rope.
end phrase

define phrase distant-candle-stall, randomly
  There's a candle stall.
or
  There's candles for sale.
or
  Looks like they're selling candles.
end phrase

define phrase distant-pottery-stall, randomly
  There's a pottery stall.
or
  There's pottery for sale.
or
  Looks like they're selling pottery.
end phrase

define phrase distant-northwest-junction
  The junction is a relatively open space at the market's northwest corner.
end phrase

define phrase distant-eastern-junction
  There is a relatively open space at the market's eastern edge.
end phrase

define phrase distant-silk-tent-outside
  Teisha's silk tent is that way.
end phrase

define phrase distant-silk-tent-inside
  Teisha's tent is bright blue, though now it's somewhat faded and covered with market dust.
end phrase

define phrase distant-top-of-post
  The top of the central post is high, high above you.
end phrase
