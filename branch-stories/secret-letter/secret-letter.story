## Jack Toresal and The Secret Letter — Chord port
##
## Chapter 1: the Prologue and Grubber's Market, as one extent.
##
## AUTHORITY. Every line of prose in this file and in the files it imports is
## either Michael Gentry's 2009 text carried over, or a marked placeholder for
## a line David has still to write. Nothing here is drafted by an assistant.
## Where the change document calls for new prose, this file carries a
## `## DAVID:` marker and a phrase whose body says so, so the gap is loud at
## run time instead of quiet.
##
## WHERE THIS FILE DEVIATES FROM GENTRY'S WORDS — the complete list, so the
## authority question never has to be re-audited:
##
##   1. The nine stall lines in `peering.chord` drop the source's trailing
##      "to the [quick best route]" clause. Chord cannot interpolate the
##      direction back as a compass word, so the route cannot be filled; see
##      the ruling flagged in that file. The three variants of each line are
##      otherwise verbatim.
##   2. `distant-silk-tent-outside` reads "…is that way" where the source reads
##      "…is [quick best route] from here". The two words "that way" are the
##      substitution.
##   3. `distant-silk-tent-inside` drops the source's closing "You can enter to
##      the [north/south]", route-dependent in the same way. What remains is
##      verbatim.
##   4. Teisha's five repeat prefixes are Gentry's five, but fixed one per quip
##      instead of drawn at random, because Chord does not interpolate a phrase
##      inside another phrase's body (GH #286).
##   5. `st-patience-third` in `stallkeepers.chord` expands Gentry's `[one of]
##      beat it[or]scram[or]get out of here[at random]` into three whole-phrase
##      variants, because Chord randomises phrase arms rather than words inside
##      one. Same three words, same odds. (Two quips are also FOLDED in that
##      file — `ST2`+`ST5` and `ST4`+`ST5` become one phrase each — but the
##      source always plays them in that order, so no word changes.)
##
## Everything else is carried verbatim from the 2009 source or is a marked
## `(PLACEHOLDER — David's line …)`.
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

## The P-8 "seen from elsewhere" layer: the peering action and its phrases.

import "peering"

## The market's ambient conversation: ten stallkeepers sharing the `ST` tree.

import "stallkeepers"

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
## TEISHA
##
## The silk seller, and the first perceiver the player meets (vision.md §3d).
## Her tree splits by occasion (change document, "Teisha's conversation"): the
## informational quips play here, in the calm walk, and TE1-TE9/TE16/TE20 stay
## in the chase. Text below is Gentry's, carried from `story.ni:3110-3219`.
##
## The `[first time]…[subsequently][rp]…[only]` shape the source uses for every
## one of these quips is Chord's `first-time` strategy, verified 2026-08-22
## (vision.md §3h). `[rp]` is the source's own randomised repeat prefix
## (`story.ni:655`). Chord does NOT interpolate one phrase inside another's
## body — `{key}` prints literally there — so the five prefixes are carried
## inline, one per quip, rather than drawn at random from a shared phrase.
## Every prefix is Gentry's; only the randomness is lost.
## ---------------------------------------------------------------------------

create Teisha
  a person, proper
  aka woman, merchant, saleswoman, seller, vendor, clothier, redhead, red curls, curls
  pronouns she
  mood calm
  starts in Inside the Silk Tent
  carries the measuring cord

  Teisha is a short, busty woman with a smile as warm as her tumbling red curls.
  She likes you, and she knows that you'd never nick from her stall, so she lets
  you hang around the stall and look through the merchandise. She also knows your
  big secret (guessed it the very first time she caught you loitering at the tent
  flap), which is a little bit scary and a little bit of a relief — it's nice to
  be able to let your guard down and talk to someone outside Maiden House.

  on every turn while one chance in 5
    phrase teisha-atmosphere
  end on

create the measuring cord
  aka cord, measuring tape

  It's a five-foot-long length of cord, marked off in ten segments, used to take
  a customer's measurements.

define topics for Teisha
  about "the market", "grubbers market", "the stalls", "who's selling what", "today":
    phrase teisha-the-market
  about "the tent", "behind the tent", "the pole", "the post":
    phrase teisha-behind-the-tent
  about "the clothes", "the silks", "the garments", "the gowns", "her wares":
    phrase teisha-the-clothes
  about "the monkey":
    phrase teisha-the-monkey
  about "fossville", "baron fossville", "the baron":
    phrase teisha-fossville
  about "the ascension":
    phrase teisha-the-ascension
end topics

define greetings for Teisha
  first time:
    phrase teisha-calm-opener
  on return:
    phrase teisha-calm-return
end greetings

define phrase teisha-atmosphere, randomly
  Teisha hums quietly to herself.
or
  Teisha smiles at you warmly.
or
  Teisha brushes a loose thread from the sleeve of one of her gowns.
or
  Teisha toys with her measuring cord, spinning it idly.
end phrase

define phrase teisha-the-market, first-time
  'I know that different merchants set up their stalls on different days of the
  week,' you say. 'So who's selling what today?'

  'Well, there's the fruit stall on the northeast corner, but that's there every
  day,' says Teisha. 'To the north is a grocer's stall; a hat seller to the
  southeast; to the west is an herb seller and the gem merchant; and the
  leatherworker and weaponsmith have set up shop on the south end. The inner ring
  is me, a rope merchant, a pottery merchant, and that awful candlemaker — the
  stench has been driving off my customers all morning.'
or
  'As I said,' says Teisha, 'there's the fruit stall to the northeast; the grocer to the
  north; the hat seller to the southeast; the herb seller and the gem merchant to
  the west; the leatherworker and weaponsmith to the south; and me, the rope
  merchant, the potter merchant, and the candlemaker in the inner ring.'
end phrase

define phrase teisha-behind-the-tent, first-time
  'What's that behind your tent?' you ask, nodding towards the back exit.

  'There's nothing back there except the central pole holding up the big awning
  over the market,' Teisha says. 'That's why all the merchants want this spot,'
  she adds, '...it's got the best shade.'
or
  'I told you already,' says Teisha, 'it's just a big pole.'
end phrase

define phrase teisha-the-clothes, first-time
  'These clothes are all so beautiful,' you say. 'Do you make them yourself?'

  Teisha smiles. 'Some of them,' she says. 'Most of them I sell on consignment.
  One of these days, I'm going to clear enough profit to rent a shop on Commerce
  Street and move out of this hot, smelly tent.'
or
  'Like I said,' says Teisha, 'some of them I make myself, some I sell for others.'
end phrase

define phrase teisha-the-monkey, first-time
  'The gem merchant sounds like he's got a real vendetta against that monkey,'
  you remark. 'What's the story with them?'

  Teisha rolls her eyes. 'That pesky thing came in on the fruit vendor's wagon
  yesterday and just made itself at home. Now it's all over the place, bothering
  everybody. Fortunately, it likes shiny things more than it likes women's
  clothes. Oh, and bananas. The little rodent loves bananas. Constantly drops the
  peels on the roof of my tent.'
or
  'I already told you,' says Teisha, 'it just runs around, eats bananas, and steals anything shiny
  that isn't nailed down.'
end phrase

define phrase teisha-fossville, first-time
  'It seems like everyone has an opinion about Baron Fossville, lately,' you
  remark. 'What's yours?'

  Teisha laughs. 'So you've noticed it too, huh? I don't usually like to talk
  politics, which means I haven't had much in the way of conversation in
  Grubber's Market lately.' She shrugs. 'I don't like his high taxes, but who
  does? Fossville doesn't strike me as a very nice person, but I guess he doesn't
  have to be.'
or
  'I told you,' says Teisha, 'I don't like him very much, but there's not much use
  complaining.'
end phrase

## DAVID: TE22 is marked "corrected per vision.md §3e" in the change document.
## The source's answer rests the succession on the King not having named his
## DAUGHTER heir; §3e moves the claim onto blood and makes Jack the heir, so the
## reply has to change and the new wording is yours. Gentry's original is kept
## verbatim in the corpus at `story.ni:3219` for reference.

define phrase teisha-the-ascension
  (PLACEHOLDER — David's line. TE22's answer needs rewriting under vision.md
  §3e; the 2009 text rests it on the King's unnamed daughter.)
end phrase

## DAVID: the calm opener. TE1 assumes Jack is already spooked and cannot be
## reused here (change document, "Teisha's conversation" — costs carried into
## Phase 6). This is your line to write, and the calm visit is also where the
## Vedd idiom register's voice is first fixed (vision.md §2).

define phrase teisha-calm-opener
  (PLACEHOLDER — David's line. Teisha's calm-walk greeting.)
end phrase

define phrase teisha-calm-return
  (PLACEHOLDER — David's line. Teisha's calm-walk return greeting.)
end phrase

## ---------------------------------------------------------------------------
## THE FRUIT STALL
##
## The stall the apple and the banana both come from — which is why the change
## document's theft decision matters here ("Theft — calm theft is quiet, chase
## theft is noisy"): a source-faithful apple theft would block this stall before
## the monkey puzzle needs its banana.
##
## The displays are the source's `storage bin`s (`story.ni:2380-2390`), each
## with a corresponding item. Descriptions are Gentry's, carried verbatim. The
## apple and the banana are created without a location: nothing places them yet,
## because the taking and stealing mechanism is the next increment.
## ---------------------------------------------------------------------------

create the display of apples
  aka apples, apple display
  scenery, a supporter, plural
  in the Fruit Stall

  These don't look half bad. If you hadn't stumbled into so much trouble, you'd
  be eating one right now.

create the display of pears
  aka pears, pear display
  scenery, plural
  in the Fruit Stall

  These vary in color from yellowish-green to dusky orange-brown, with thick,
  twisty stems.

create the display of kello fruit
  aka kello, kello fruit, kello display
  scenery, plural
  in the Fruit Stall

  Normally you'd kill for a slice of kello, but these look a bit too green. Not
  quite in season.

create the display of brambleberries
  aka brambleberries, brambleberry clusters, clusters, berries
  scenery, plural
  in the Fruit Stall

  The thumb-sized clusters are shiny and bluish-black. Your mouth waters at the
  thought of how tart they must be.

create the display of bananas
  aka bananas, banana display, bushel
  scenery, plural
  in the Fruit Stall

  You rarely see bananas this far north. These look just about perfect — plump,
  bright yellow with just a sprinkling of brown freckles.

create the apple
  aka round, firm, green apple
  edible
  on the display of apples

  The apple is round, firm, green at the bottom shading up to red near the stem.

  after taking it while calm, once
    phrase apple-lifted-quietly
  end after

  on eating it
    refuse when the player is not in the Alley: apple-not-here
    phrase apple-first-bite
  end on

create the banana
  aka kozarian banana, yellow banana
  edible

  The banana is plump, bright yellow with just a sprinkling of brown freckles.

create the pear
  edible

  The pear is yellowish green with a bit of light brown on the bottom.

create the kello fruit
  aka green fruit, unripe fruit
  edible

  It's a little bit too green, but probably still tasty.

create the cluster of brambleberries
  aka brambleberry cluster, berry cluster
  edible

  The thumb-sized cluster is shiny and bluish-black.

## ---------------------------------------------------------------------------
## THE APPLE AND THE ALLEY
##
## The walk's exit condition (change document, "What ends the walk"). Jack
## steals the apple, wants to eat it, and cannot eat it in the open; the refusal
## points her northwest, where the Alley advertises itself through the peering
## layer — `distant-alley` in `peering.chord` is Gentry's own line, carried
## verbatim from `story.ni:1488`, and it is the only one of the fourteen with no
## route-clause deviation, because he wrote the compass word into the sentence.
##
## Theft is situational, not universal (change document, "Theft"): quiet while
## the market is calm, and the source's noisy rule (`story.ni:1978-1997` — the
## player is spotted, ejected to a random adjacent room, and the stall is
## permanently blocked) once the mercenaries are sweeping. Only the calm half is
## built here; the noisy half belongs with the chase.
##
## OPEN — what the walk ends INTO. The change document settles that the first
## bite ends the walk and that the eavesdrop poisons it. It does not settle what
## occasion the bite hands off to: the story declares two states, `calm` and
## `chase`, and the eavesdrop is neither — Jack is not yet being hunted, which
## is the whole point of the scene. So this file does NOT change state on the
## bite. That gate waits on David.
##
## MECHANISM DEVIATION from the source, recorded here rather than in the story
## header's list, which covers prose. The source keeps each fruit off-stage and
## materialises it on theft (`storage bin` with a `corresponding item`,
## `story.ni:2380-2390`, reached through `Before taking a stall display: try
## stealing`). That shape does not survive the port: Sharpee's `taking` refuses
## scenery inside `validate`, before any story hook is consulted
## (`packages/stdlib/src/actions/standard/taking/taking.ts:112`), so an
## `on taking` clause on a scenery display can never fire. The apple therefore
## SITS on the display, which is a scenery supporter, and `take apple` is an
## ordinary take that the apple's own `after` clause narrates. Same outcome,
## one fewer indirection — but it means the display cannot gate the theft, so
## the calm/noisy split rides the story state on the fruit itself.
## ---------------------------------------------------------------------------

create the wooden crates
  aka crates, crate, box, boxes, stack, wood, shipping crates
  a supporter, enterable, plural
  in the Alley

  Just ordinary wooden crates, used by merchants throughout Miradania to store
  and ship goods. There are scores more just like these to be found all over the
  market.

## DAVID: the calm theft. The source has only the noisy message, written for a
## market already on edge (`story.ni:1990`). The calm lift exists in Gentry's
## words only as third-person narration inside the deleted opening block —
## "nicking an apple from the fruit stall while its owner argues with a fat
## Easterner over local politics" (`story.ni:1469`). Turning that into a line
## the player is shown at the moment of the theft is a rewrite, so it is yours.

define phrase apple-lifted-quietly
  (PLACEHOLDER — David's line. The quiet lift, calm market.)
end phrase

## DAVID: the refusal, and the hardest of the three. The change document
## requires it be directional — it has to leave the player knowing where would
## work "without naming a waypoint". The source's only eat-refusal is the chase
## one, "No time for breakfast right now!" (`story.ni:2417`), which is the wrong
## occasion and says nothing about where. Gentry's own reason is in the opening
## block: the alley is "where you can catch a breath from the crowds and enjoy
## your apple in peace" (`story.ni:1469`).

define phrase apple-not-here
  (PLACEHOLDER — David's line. Refused in the open; points northwest without
  naming it.)
end phrase

## DAVID: the first bite. Two Gentry lines are candidates and either can be
## carried verbatim if you want it: the generic "Crisp and delicious!"
## (`story.ni:2419`), or the opening block's "You settle yourself on a crate and
## take a bite of your apple. Suddenly, from the alley's entrance, you hear
## voices." (`story.ni:1469`) — which is also where the eavesdrop begins.

define phrase apple-first-bite
  (PLACEHOLDER — David's line. The first bite, taken in the Alley.)
end phrase
