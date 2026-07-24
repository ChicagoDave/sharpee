## The Folly at Fernhill — one winter night to find the deed.
## File-header comment (ADR-249): `##` lines are legal between
## top-level constructs and contribute nothing to the compile.

story "The Folly at Fernhill" by "The Sharpee Project"
  id: fernhill
  version: 0.1.0
  blurb: One winter night to find the deed that keeps Fernhill in the family.
  states: evening, midnight
  use state-machines
  use scoring

  on every turn while one chance in 12
    phrase distant-bell
  end on

## The estate exterior — the night begins here.

create the Grounds
  a region
  containing the Iron Gates, the Gravel Drive, the Fountain Court
  containing the Greenhouse, the Boiler Shed, Folly Hill

  on every turn while one chance in 6
    phrase night-wind
  end on

  after entering it
    phrase cold-returns
    play ambient night-wind when client has sound
  end after

  after leaving it
    stop ambient when client has sound
    phrase out-of-the-wind
  end after

create the House
  a region
  containing the Entrance Hall, the Study, the Pantry
  containing the Kitchen, the Cellar Stairs and the Cellar

  after entering it
    phrase house-hush
  end after

create the Iron Gates
  a room
  aka gates, gate
  north to the Gravel Drive
  south is blocked: long-road

  after entering it while the player has the deed
    play music dawn-theme when client has music
    win fernhill-saved
  end after

  first time
    The cab is already grinding away down the lane, its lamps swallowed
    by the dark. An auction notice is nailed to the left-hand gate,
    ruffling in the wind: FERNHILL HOUSE AND GROUNDS, BY ORDER OF THE
    ESTATE, AT DAWN.

  Wrought-iron gates stand open on one hinge apiece, rust freckling
  the scrollwork. The gravel drive runs north toward the dark shape of
  the house.

create the Gravel Drive
  a room
  aka drive
  south to the Iron Gates
  north to the Fountain Court

  The drive curves between bare lime trees, gravel crunching underfoot.
  The house looms ahead to the north; the gates are back south.

create the Fountain Court
  a room
  aka court, courtyard
  south to the Gravel Drive
  north to the Entrance Hall
  west to the Greenhouse
  east to the Boiler Shed

  A paved court before the front door, holding a dry fountain crusted
  with last summer's leaves. The greenhouse glimmers palely to the
  west; a squat brick shed hunches to the east; the front door of the
  house is north.

create the Greenhouse
  a room
  aka glasshouse
  east to the Fountain Court
  north to Folly Hill
  north is blocked while the boiler is off: frost-sealed

  Glass panes furred with frost on both sides. Staging benches run the
  length of the house, and a door in the north wall — glass too — leads
  up toward the folly, if it would open.

create the Boiler Shed
  a room
  aka shed
  west to the Fountain Court

  Brick, low, and bitter with old coal dust. The estate's boiler sits
  cold as a tomb against the back wall, its pipes running off through
  the earth toward the greenhouse.

create Folly Hill
  a room
  aka hill
  south to the Greenhouse
  north to the Folly through the folly door

  The hill rises behind the greenhouse, and on its crown stands the
  folly: a little stone temple, fire-scarred about the windows, that
  nobody has entered in twenty years.

create the Folly
  a room

  Soot still ghosts the walls in here, twenty years on. The night sky
  shows through a scorched hole in the dome, and a cache of ancient
  estate fireworks slumps against the far wall.

  after entering it, once
    change the fuse to lit
    phrase fuse-catches
  end after

create the Entrance Hall
  a room
  aka hall
  south to the Fountain Court
  west to the Study
  west is blocked while Mrs Kettle is guarded: kettle-blocks
  east to the Kitchen
  north to the Cellar Stairs

  The heart of the house: a cold marble floor, a dead fireplace under
  a wide mantel{mantel-hint}, and a tall case clock standing silent
  against the stairs. Doors lead west to the study and east to the
  kitchen; a colder passage runs north.

create the Study
  a room
  east to the Entrance Hall

  Verity's study, exactly as she left it: a desk under the window, a
  travelling trunk against the wall, and the smell of pipe smoke that
  never quite left the curtains.

create the Kitchen
  a room
  west to the Entrance Hall
  north to the Pantry through the pantry door

  Copper pans hang in ranks over the cold range. The pantry door
  stands in the north wall.

create the Pantry
  a room

  Narrow shelves of preserves and crockery. With the door shut, no one
  in the kitchen would know you were here.

create the Cellar Stairs
  a room
  aka stairs, landing
  south to the Entrance Hall
  down to the Cellar through the cellar door

  A bare landing at the top of the cellar steps. An oil lamp sits in a
  wall niche, left where a careful hand could always find it.

create the Cellar
  a room
  dark

  Brick vaults run off into the dark, cold enough to keep milk in
  July. Somewhere back in the blackness, water is dripping.

  on every turn
    phrase cellar-drip
  end on

  on every turn while the oil lamp is lit, once
    phrase lamplight-startle
  end on

create the folly door
  a door
  aka warped door

  A stone-framed door of oak, warped and silvered by the fire. It has
  not been opened in twenty years.

  on opening it while tobias is not shaken
    refuse folly-jammed
  end on

create the pantry door
  a door, lockable, starts unlocked
  aka white door

  A plain white-painted door with a bolt on the pantry side.

create the cellar door
  a door, lockable with the tarnished key
  aka grey door
  score unsealed worth 5

  A heavy grey door, locked as long as anyone can remember. The
  keyhole is tarnished black.

  after opening it, once
    award unsealed
  end after

create the doormat
  aka mat
  scenery, a supporter
  in the Fountain Court

  A bristle mat worn bald in the middle, older than you are. It sits a
  little proud of the flagstone, as if something kept it from lying
  flat.

create the tarnished key
  aka key
  concealed
  on the doormat
  score found worth 5

  A small key gone black with weather.

  after taking it, once
    award found
  end after

create the oil lamp
  aka lamp
  light-source, switchable
  in the Cellar Stairs

  A hurricane lamp with a full reservoir and a clean chimney.

create the boiler
  aka furnace
  scenery, switchable
  in the Boiler Shed
  states: cold, filled, primed, running
  score lit worth 10

  A cast-iron estate boiler, cold now, its dial at rest. Pipes run
  from its flank toward the greenhouse. A stopcock and a primer
  plunger stand ready on its flank, and a small brass plate reads:
  FILL. PRIME. LIGHT. IN THAT ORDER.

  on switching_on it
    refuse when it is cold: boiler-clank
    refuse when it is filled: boiler-clank
    award lit, once
  end on

create the stopcock
  aka cock, water valve
  scenery
  in the Boiler Shed

  A quarter-turn stopcock on the feed pipe from the rain tank.

  on turning it
    phrase stopcock-turns
  end on

create the primer plunger
  aka primer, plunger
  scenery, pushable
  in the Boiler Shed

  A long-handled primer plunger, worn smooth by fifty winters of use.

  on pushing it while the boiler is cold
    refuse primer-dry
  end on

define machine the boiler works
  role furnace is the boiler
  starts cold

  state cold
    when turning the stopcock: filled

  state filled
    on enter
      change the boiler to filled
      phrase water-gurgles
    end on
    when pushing the primer plunger: primed

  state primed
    on enter
      change the boiler to primed
      phrase primer-thumps
    end on
    when switching_on the furnace: running

  state running, terminal
    on enter
      change the boiler to running
      change the vine to flowering
      phrase pipes-warm
      phrase vine-stirs
      play sound boiler-thump when client has sound
    end on
end machine

create the solicitor's letter
  aka summons
  readable

  The letter that brought you here: Fernhill goes to auction at dawn,
  and whatever Great-Aunt Verity hid is lost with it unless someone
  finds the deed tonight.

  on reading it
    phrase summons-text
      "…the property known as FERNHILL to be sold at public auction at
      first light. Any party asserting prior title must produce the
      original deed of the estate before the fall of the hammer."
  end on

create the travelling trunk
  aka trunk
  a container with max items 3
  openable
  in the Study

  Verity's old travelling trunk, papered with steamer labels from
  ports she never mentioned. The lid is heavy but unlocked.

create the diary page
  aka page, diary
  readable
  in the travelling trunk
  states: folded, read

  A page torn from a diary, the hand young and furious.

  on reading it
    change it to read
    phrase diary-text
      "K. says the greenhouse will take the worst of the frost and the
      vine with it. Let it. What matters is safe where the fire went,
      and only the little silver thing will open it. If I cannot keep
      Fernhill, no bank and no buyer shall have the proof of it."
  end on

create the half-burned letter
  aka burned letter
  readable with text "…arrangements with the county bank, where the deed may rest secure until…"
  in the travelling trunk

  Only the middle of the letter survived its trip through a grate. It
  seems to say the deed went to the bank in town. It seems to.

create the mantel
  aka mantelpiece, shelf
  scenery, a supporter with capacity 2
  in the Entrance Hall

  A wide stone mantel over the dead fireplace, dusted but bare except
  for a single framed photograph.

create the framed photograph
  aka photograph, photo, frame
  scenery
  on the mantel

  Verity at thirty, on the folly steps, squinting into some summer
  long gone.

  phrase detail while the diary page is read:
    Knowing what the diary knows, you see it now: the folly whole
    behind her, and on her knee a small steel box with a bright slot
    in its lid.

  after examining it
    show image folly-photograph when client has images
  end after

create the grey overcoat
  aka overcoat, coat, verity's overcoat
  wearable, a container
  in the Entrance Hall

  A great grey wool overcoat hanging by the door, too heavy for
  anyone's shoulders but hers. The pockets are deep.

create the winding key
  aka clock key
  concealed
  in the grey overcoat

  A small brass crank key — the kind that winds a tall case clock.

create the crowbar
  aka bar, pry bar
  in the Cellar

  A forge-made crowbar, cold and certain.

create the nailed crate
  aka crate
  a container
  openable with the crowbar
  in the Boiler Shed

  A pine crate nailed shut hard, stencilled FERNHILL ESTATE — BOILER
  SPARES.

create the tin opener
  aka opener
  in the nailed crate

  A wooden-handled tin opener, estate issue.

create the brass valve handle
  aka valve handle, handle
  in the nailed crate

  A four-spoked brass handle, sized for the boiler's water valve.

create the kipper tin
  aka tin
  a container
  openable with the tin opener
  in the Pantry

  A flat tin of kippers with no ring-pull and no mercy.

create the kipper
  aka fish
  edible
  in the kipper tin

  One bronze kipper, pungent enough to summon any cat in the county.

create the garden shears
  aka shears
  in the Kitchen

  Long-bladed garden shears, oiled and sharp — Tobias's pride, judging
  by the edge.

create the sherry bottle
  aka sherry, bottle
  in the Kitchen

  A dusty bottle of oloroso, the good stuff, hidden behind the pans at
  hip height where a housekeeper might know to look.

create the vine
  aka determined vine
  scenery, prunable
  in the Greenhouse
  states: seedling, flowering, fruiting
  score fruited worth 5

  Verity's vine, at the warm end of the staging over the buried
  pipes: barely more than a seedling now, twenty years after the
  frost that should have killed it.

  after pruning it while it is fruiting, once
    award fruited
  end after

create Smoke
  aka cat, grey cat
  a person, follower
  feedable with food the kipper
  in the Pantry

  A smoke-grey cat with lantern eyes, appointed to the pantry mice
  and answerable to no one.

  on every turn while it is fed and the player is in the Greenhouse, once
    phrase smoke-nose
  end on

create the furnace poker
  aka poker
  in the Boiler Shed

  A long iron poker for the furnace grate.

  on taking it while the boiler is running
    refuse poker-hot
  end on

define trait feedable
  data
    food: entity
  states: peckish, fed

  phrases en-US
    no-morsel:
      You have nothing that would interest a cat of standing.
    already-fed-cat:
      A slow blink. The account is already settled.
    cat-eats:
      The kipper vanishes with terrifying efficiency, and something is
      decided about you. From now on, you have a shadow.

  on feeding it
    the actor must have its food: no-morsel
    it must be peckish: already-fed-cat
    change it to fed
    phrase cat-eats
  end on
end trait

define action feeding
  grammar
    feed :creature
  the creature must be reachable
  otherwise refuse not-feedable

  phrases en-US
    not-feedable:
      That has no appetite you can help with.

define trait prunable
  on pruning it
    the player must hold the garden shears: need-shears
    select on its state
      when seedling
        phrase vine-too-young
      when flowering
        change it to fruiting
        move the silver locket to the Greenhouse
        phrase vine-fruits
      when fruiting
        phrase vine-done
    end select
  end on
end trait

define trait windable
  on winding it
    the player must hold the winding key: need-winding-key
    it must be stopped: clock-already-going
    change it to ticking
    phrase clock-wound
  end on
end trait

define action pruning
  grammar
    prune :target
    trim :target
  the target must be reachable
  otherwise refuse cannot-prune

  phrases en-US
    cannot-prune:
      There's nothing to prune about that.

define action winding
  grammar
    wind :target
    wind up :target
  the target must be reachable
  otherwise refuse cannot-wind

  phrases en-US
    cannot-wind:
      That doesn't wind.

create the fuse
  aka fireworks fuse
  scenery
  cuttable with the garden shears
  in the Folly
  states: coiled, lit, cut
  score nerve worth 5

  A long waxed fuse snaking from the fireworks cache across the
  floor. Old, but not too old to burn.

  on every turn while it is lit
    phrase fuse-hiss
  end on

  on cutting it
    change it to cut
    award nerve, once
    phrase fuse-cut-through
  end on

define sequence the fuse burn
  when the fuse becomes lit
    phrase fuse-racing
  3 turns later
    kill the player fuse-blast when the fuse is lit
end sequence

define sequence the long night
  at turn 14
    phrase dusk-deepens
    change the story to midnight
  at turn 70
    phrase small-hours
  at turn 130
    lose dawn-comes
end sequence

create the deed box
  aka box, steel box, silver box
  a container
  openable with the silver locket
  in the Folly

  A small steel box under a shroud of soot, unmarked but for a neat
  bright slot in the lid — the exact size of a locket that does not
  open like a locket.

create the deed
  aka title deed, title
  readable
  in the deed box
  score recovered worth 10

  Heavy paper, folded in oiled cloth, whole and legible after twenty
  years in the dark: the original deed of Fernhill.

  after taking it, once
    award recovered
  end after

  on reading it
    phrase deed-text
      "…the house and grounds known as FERNHILL, held in perpetuity by
      the family and heirs of the bearer of this instrument."
  end on

create Mrs Kettle
  aka housekeeper, kettle
  a person, proper, guard
  pronouns she
  in the Entrance Hall
  states: guarded, softened
  score softened worth 5

  The housekeeper, planted before the study door with her knitting and
  no intention of moving. Her eyes say the study is not for visitors.

  on giving it
    change it to softened when it has the sherry bottle
    award softened, once when it is softened
    phrase kettle-softened when it is softened
  end on

create Tobias
  aka groundskeeper
  a person, proper, patrol with route [the Gravel Drive, the Fountain Court, the Boiler Shed] and wait-turns 5 and announces-movement true
  pronouns he
  in the Gravel Drive
  states: steady, shaken
  score truth worth 5

  The groundskeeper, out in all weathers on his rounds, a storm
  lantern swinging at his knee. Weathered, watchful, in no hurry to
  help.

  on asking it
    phrase tobias-shrug
  end on

create the silver locket
  aka locket

  A little silver locket on a fine chain, its face engraved with the
  folly before the fire. It is heavier than it looks, and it does not
  open like a locket.

define topics for tobias
  about the boiler:
    phrase tobias-boiler-reply
  about the silver locket:
    phrase tobias-locket-reply
  about "the folly", "the fire":
    change it to shaken
    award truth, once
    phrase tobias-folly-reply
  about "the bank": phrase tobias-bank-reply
end topics

define topics for Mrs Kettle
  about the grey overcoat: phrase kettle-coat-reply
  about "the study", "verity's study": phrase kettle-study-reply
end topics

create the player
  starts in the Iron Gates
  carries the solicitor's letter

  Cold, underslept, and the last of the family who still believes
  Verity hid the deed.

create the auction notice
  aka notice, sign
  scenery, readable
  in the Iron Gates

  Fresh print on old iron: FERNHILL HOUSE AND GROUNDS, BY ORDER OF THE
  ESTATE, AT DAWN.

  on reading it
    phrase notice-text
      "Sale to be conducted at the property at first light. Viewing by
      arrangement with the solicitors, Messrs. Hobbes & Vane."
  end on

create the lime trees
  aka trees, limes
  scenery, plural
  in the Gravel Drive

  Bare pollarded limes, planted two lifetimes ago, creaking in the
  wind.

create the fountain
  aka basin
  scenery
  in the Fountain Court

  A dry stone basin drifted with last summer's leaves. The cherub in
  the middle has lost his nose to some hard winter.

create the staging benches
  aka benches, staging
  scenery, plural
  in the Greenhouse

  Slatted staging the length of the glasshouse, empty but for one
  determined vine at the warm end, over the buried heating pipes.

create the iron pipes
  aka pipes
  scenery, plural
  in the Boiler Shed

  Lagged iron pipes leaving the boiler's flank, running toward the
  greenhouse through the earth.

create the fireplace
  aka hearth
  scenery
  in the Entrance Hall

  Cold ash and a firedog, under the wide stone mantel.

create the case clock
  aka clock, tall clock
  scenery, windable
  in the Entrance Hall
  states: stopped, ticking

  A tall case clock, stopped at some hour years gone. The winding
  hole waits behind the little brass door in its face.

  on every turn while it is ticking and one chance in 8
    phrase clock-chime
    emit estate-clock with hour "evening" when evening
    emit estate-clock with hour "past midnight" when midnight
  end on

create the writing desk
  aka desk
  scenery, a supporter
  in the Study

  A leather-topped desk under the window, its blotter still dented by
  a heavy hand.

create the long curtains
  aka curtains
  scenery, plural
  hiding-spot with position behind
  in the Study

  Floor-to-ceiling curtains of faded bottle green, deep enough to
  swallow a person whole.

create the copper pans
  aka pans
  scenery, plural
  in the Kitchen

  Ranks of copper pans, dull with disuse but hung in strict order.

create the cold range
  aka range, stove
  scenery
  in the Kitchen

  A black iron range, cold to the wrist, its fire door hanging open.

create the preserve shelves
  aka shelves, preserves, jars
  scenery, plural
  in the Pantry

  Narrow shelves of preserves in ranked jars: damson, quince, and
  things gone too dark to name.

create the wall niche
  aka niche
  scenery
  in the Cellar Stairs

  A little arched niche worn smooth at the lip — a lamp has lived here
  a long time.

create the scorched dome
  aka dome, hole
  scenery
  in the Folly

  The folly's little dome, breached by fire; the night sky shows
  through the black-edged hole.

define sound night-wind from "audio/night-wind.wav"
define sound boiler-thump from "audio/boiler-thump.wav"
define music dawn-theme from "audio/dawn-theme.wav"
define image folly-photograph from "images/folly-photograph.png"

define channel clock
  mode replace
  gated by sidebar
  return "The clock: (hour)" from estate-clock
end channel

define phrase long-road
  The lane runs three dark miles to the village, and the cab is gone.
  You are not leaving without what you came for.
end phrase

define phrase frost-sealed
  The glass door to the folly path is sealed fast under a rind of
  frost. Nothing short of real warmth in these pipes will shift it.
end phrase

define phrase night-wind, randomly
  The wind comes off the downs and worries at the bare limes.
or
  A gust rattles every pane in the greenhouse at once.
or
  The wind drops for a moment, and the night is very quiet.
end phrase

define phrase distant-bell
  Far off in the village, the church bell counts another quarter hour
  gone.
end phrase

define phrase cold-returns, first-time
  The cold finds you the moment you step out, and means it.
or
  The cold again, familiar now.
end phrase

define phrase out-of-the-wind
  You step out of the wind, and your ears sing in the sudden quiet.
end phrase

define phrase house-hush
  The house holds its old hush — mothballs, cold ash, and wax.
end phrase

define phrase kettle-blocks
  Mrs Kettle does not move from the study door. "The study is not for
  visitors," she says, to her knitting.
end phrase

define phrase kettle-softened
  Mrs Kettle turns the bottle to read the label, and something in her
  shoulders comes down an inch. "Her ladyship's oloroso. Well." She
  steps away from the study door. "Five minutes, mind."
end phrase

define phrase kettle-coat-reply
  "Her walking coat. Twenty winters old and warmer than anything you
  could buy now. She'd not begrudge you the loan of it tonight."
end phrase

define phrase kettle-study-reply
  "Shut since the spring, and it'll stay shut. Unless," she looks at
  you over the needles, "you were to bring me something that made the
  evening kinder."
end phrase

define phrase tobias-shrug
  Tobias turns his head and spits, which appears to be his whole
  opinion on the subject.
end phrase

define phrase tobias-boiler-reply
  "She's not dead, just cold. Fill her, set the valve, then light
  her — in that order, mind, or she'll clank at you like church
  bells."
end phrase

define phrase tobias-locket-reply
  Tobias goes very still when he sees it. "Her little silver box.
  She wore it the night of the fire and never after. Whatever it
  opens, it's up at the folly."
end phrase

define phrase tobias-folly-reply
  The lantern stops swinging. "Twenty years I've not opened that
  door, and her ladyship neither." He looks up the dark hill for a
  long moment. "Go on then, if you must. The door's only warped, not
  cursed. Shoulder it."
end phrase

define phrase tobias-bank-reply
  "Bank?" He snorts. "Bank never had it. Her ladyship trusted banks
  the way foxes trust hounds."
end phrase

define phrase boiler-clank
  You twist the dial and the boiler answers with a hollow CLANK, like
  church bells dropped down a well. Cold, dry iron. The brass plate
  insists: FILL. PRIME. LIGHT.
end phrase

define phrase stopcock-turns
  You crank the stopcock a hard quarter-turn.
end phrase

define phrase primer-dry
  The plunger sinks with a dry wheeze and comes up again. Nothing to
  prime — the jacket is empty.
end phrase

define phrase water-gurgles
  Somewhere inside the iron, water gurgles down into the jacket.
end phrase

define phrase primer-thumps
  The plunger meets resistance at last and thumps home. The boiler
  is primed.
end phrase

define phrase pipes-warm
  Flame catches with a soft whump, and within moments the pipes begin
  to tick and stretch as warmth crawls toward the greenhouse.
end phrase

define phrase fuse-catches
  The warped door's first draught in twenty years drags across the
  floor — and wakes a thread of sparks in the old blasting cord. The
  fuse is burning toward the cache.
end phrase

define phrase fuse-hiss, cycling
  The fuse hisses on, eating its slow way toward the fireworks.
or
  Sparks walk the waxed cord, closer now.
end phrase

define phrase fuse-racing
  It is racing you.
end phrase

define phrase fuse-cut-through
  The shears bite through the waxed cord. The spark train staggers,
  gutters, and dies a hand's breadth from the cache.
end phrase

define phrase fuse-blast
  The cache goes up in one white roar, and the folly keeps its
  secrets after all.
end phrase

define phrase dusk-deepens
  Somewhere beyond the grounds the last light goes out of the sky.
  Midnight is coming on.
end phrase

define phrase cellar-drip, cycling
  Somewhere back in the vaults, a drop falls.
or
  Drip. The dark keeps its own time.
end phrase

define phrase lamplight-startle
  Something small skitters away from your lamplight and is gone.
end phrase

define phrase need-shears
  Bare-fingered pinching will mangle it. This wants the garden shears.
end phrase

define phrase vine-too-young
  It is all stem and hope — nothing to prune yet. What it wants is
  warmth in these pipes.
end phrase

define phrase vine-fruits
  You take the dead growth off in three clean cuts, and the vine
  answers the warmth almost while you watch: a single heavy fruit
  swells, splits — and something small and silver slides out into the
  leaf mould. Verity's own way of banking.
end phrase

define phrase vine-done
  The vine has given everything it kept.
end phrase

define phrase vine-stirs
  At the warm end of the greenhouse staging, something green stirs.
end phrase

define phrase need-winding-key
  The little brass door wants its crank key — the kind a careful
  housekeeper leaves in a coat pocket.
end phrase

define phrase clock-already-going
  It is wound and walking. Tick, tock.
end phrase

define phrase clock-wound
  The key turns, the weights climb, and the old clock clears its
  throat and begins to walk again: tick, tock, after twenty years.
end phrase

define phrase clock-chime
  The case clock counts the quarter, bright and even, through the
  whole house.
end phrase

define phrase poker-hot
  The poker has been drinking the furnace's heat — it would take the
  skin off your palm.
end phrase

define phrase smoke-nose
  Smoke pads down the staging, ignores the vine entirely, and noses
  hard at the leaf mould at the warm end. Cats know where things are
  buried.
end phrase

define phrase mantel-hint while the diary page is read
   — and over it Verity's photograph, which you cannot stop looking
  at now
end phrase

define phrase small-hours
  The small hours settle over Fernhill. Dawn — and the auction — are
  no longer an abstraction.
end phrase

define phrase dawn-comes
  Grey light finds the gates, and with it the first motorcar of the
  auction party. Whatever Fernhill still hides, it will hide it for
  strangers now.
end phrase

define phrase fernhill-saved
  You come down the drive with the deed of Fernhill inside your coat,
  and the iron gates, for the first time tonight, look like they are
  holding the world out rather than you in. At dawn the hammer will
  fall on nothing: the proof came out of the fire after all.
end phrase

define phrase folly-jammed
  The warped door doesn't shift. Twenty years of weather have set it
  like a jaw — and something in you doesn't care to force Verity's
  folly without knowing more of it.
end phrase

## ADR-250 phrasebooks — the night changes the voice (E2E spine, D9).
## The weathervane is the deterministic probe: vane-mood lives only in
## the books (per-book first-time counters), vane-story is story text no
## book may beat, vane-quiet is covered only by the default book.

create the iron weathervane
  aka weathervane, vane
  scenery, pushable
  in the Iron Gates

  An iron weathervane on the gatepost, older than the house behind it.

  after examining it
    phrase vane-mood
  end after

  after pushing it
    phrase vane-story
  end after

  after touching it
    phrase vane-quiet
  end after

define phrase vane-story
  The weathervane creaks the same one story it always tells, whatever
  the hour.
end phrase

define phrasebook midnight-voice while midnight
  vane-mood, first-time:
    The vane swings hard north, as if the night had opinions.
  or
    The vane holds north. Of course it does.

  vane-story:
    A book must never win this line.
end phrasebook

define phrasebook evening-voice
  vane-mood, first-time:
    The vane noses the evening breeze, unhurried.
  or
    The vane sits easy in the last of the light.

  vane-story:
    Nor this one.

  vane-quiet:
    The vane keeps its own counsel.
end phrasebook
