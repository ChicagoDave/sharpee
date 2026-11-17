## No Signal Home — a sci-fi salvage horror on a derelict corporate freighter.
## Chord edition. Ported from the TypeScript source (now in legacy/src/) — see
## docs/chord-edition.md for what carried over, what changed, and what is open.
## Migrated to Chord 3.6.0 on 2026-09-08 (ticket #32).

story
  title: No Signal Home
  authors:
    John Googol
  ifid: 936B8547-6936-4CFE-8B2E-34F0AB30C4D2
  id: no-signal-home-sharpee
  story-version: 0.3.0
  themes: modern-dark, retro-terminal, paper, system-6
  description: Your fuel ran out beside a ship that has been dead for years. It is not as dead as it looks.
  states: adrift, boarded, waking, converging
  score first-contact worth 10
  score clean-dock worth 10
  use scoring
    rank "Salvager" at 0
    rank "Trespasser" at 15 says rank-trespasser
    rank "Witness" at 35 says rank-witness

  on every turn while the proximity alarm is screaming
    phrase alarm-nag
  end on

## ===========================================================================
## REGIONS — the tug, and the three decks of The Stillwater.
## Crossing into the Lower Deck is the moment the game proper begins.
## ===========================================================================

create the Salvage Tug
  a region
  containing the Tug Cargo Hold, the Tug Cockpit

create the Lower Deck
  a region
  containing the Airlock, the Forward Corridor, the Maintenance Shaft
  containing the Cargo Bay, the Cargo Hold, the Storage Annex
  containing the Lower Mid Corridor, the Cryo Bay, the Cryo Control Room
  containing the Aft Corridor, the Engine Room, the Reactor Room

  after the player entering, once
    change the story to boarded
    award first-contact
    phrase first-step-aboard
      You are standing inside someone else's ship. The deck takes your
      weight without complaint. Nothing else acknowledges you at all.
  end after

create the Mid Deck
  a region
  containing the Central Junction, the Lab Corridor, the Science Lab
  containing the Medbay, the Hab Corridor, the Mess Hall, the Library

create the Upper Deck
  a region
  containing the Upper Corridor, the Crew Bunks, the Common Area
  containing the Captain's Cabin, the Bridge

## ===========================================================================
## THE TUG — two rooms. Your ship, your home, and the first thing you lose.
## ===========================================================================

create the Tug Cargo Hold
  a room
  aka hold
  south to the Tug Cockpit

  first time
    You come up out of low-power sleep the way you always do — badly,
    and all at once. Cold in your teeth. A red strobe washing the crates
    on and off. Somewhere aft, an alarm is trying to take your head off.

  Cramped cargo space, crates strapped to the walls, the gap between two
  shipping containers worn into the shape of a person. The strobe paints
  everything red, then nothing, then red.

create the Tug Cockpit
  a room
  aka cockpit
  north to the Tug Cargo Hold
  south to the Airlock through the pressure hatch
  south is blocked while the docking controls is not sealed: hatch-sealed

  Your cockpit. Instruments crowded into an arm's reach of the pilot's
  seat, every one of them wanting something. Through the viewport,
  something enormous and unlit takes up the whole of the sky.

## --- Tug scenery: the alarm, the instruments, the things that carry
## --- backstory. First examination of each is a one-shot PC observation —
## --- the Chord form of the old MemoryTrait.

create the proximity alarm
  aka alarm, klaxon
  scenery
  in the Tug Cockpit
  states: screaming, silent

  A proximity klaxon wired into the hull sensors, doing the one job it
  has ever had.

create the alarm button
  aka button, cutoff
  scenery, pushable
  in the Tug Cockpit

  A palm-sized red button on the wall beside the seat, unlabeled and
  worn pale in the middle. You have hit it in the dark before.

  on the player pushing
    refuse when the proximity alarm is silent: already-quiet
    change the proximity alarm to silent
    phrase alarm-dies
      You hit it hard enough to hurt. The alarm stops.{br}
      {br}
      The silence is worse. Your ears ring in it. And now that nothing is
      screaming, you can see what the alarm was screaming about: a hull,
      filling the viewport, close enough to read the weld seams.
  end on

create the instrument panel
  aka instruments, panel, readouts
  scenery
  in the Tug Cockpit
  states: dark, live

  Approach vector, closing rate, attitude. The numbers move while you
  watch them, and none of them move in a direction you like.

create the docking controls
  aka controls, docking, clamp
  scenery
  in the Tug Cockpit
  states: approach, maneuvered, connected, sealed

  Standard magnetic clamp system, four decades old and honest about it.
  Helm, thrusters, arm, seal — in that order, if you have any sense.

  after the player examining, once
    change the instrument panel to live
    phrase controls-familiar
      Standard magnetic clamp system. You have used worse. You have used
      worse this year.
  end after

create the thrusters
  aka thruster, retros
  scenery, plural
  in the Tug Cockpit
  states: cold, burned

  Attitude and braking thrusters. The braking pair have maybe one good
  burn left in them, which is one more than the fuel gauge suggests.

create the pressure readout
  aka readout, seal gauge
  scenery
  in the Tug Cockpit
  states: idle, live

  A narrow strip display beside the clamp controls, waiting to be asked a
  question about atmosphere.

create the nav computer
  aka nav, navcom
  scenery
  in the Tug Cockpit
  score derelict-identified worth 5

  It has already tagged the thing outside and put a name on it:{br}
  STILLWATER — MERIDIAN SOLUTIONS — STATUS: DERELICT{br}
  SALVAGE VALUE: HIGH

  after the player examining, once
    award derelict-identified
    phrase nav-memory
      Meridian Solutions. Top-shelf corporate. This is your best drift in
      years.
  end after

create the comms system
  aka comms, radio, transmitter
  scenery
  in the Tug Cockpit
  score no-signal worth 5

  Every channel open. Every channel empty. The carrier light has not come
  on in four months.

  after the player examining, once
    award no-signal
    phrase comms-memory
      Dead. No signal home.
  end after

create the fuel gauge
  aka gauge, fuel
  scenery
  in the Tug Cockpit

  Three percent, and the needle is not arguing about it.

  after the player examining, once
    phrase fuel-memory
      Three percent. That is what you get for drifting.
  end after

create the pilot's seat
  aka seat, chair
  scenery
  in the Tug Cockpit

  Foam gone flat, one arm rest replaced with something that was never an
  arm rest.

  after the player examining, once
    phrase seat-memory
      Your chair. Your ship. Fits like everything else in your life — not
      quite right, but yours.
  end after

create the viewport
  aka window
  scenery
  in the Tug Cockpit

  Scratched, pitted, and currently full of freighter.

create the shipping crates
  aka crates, crate
  scenery, plural
  in the Tug Cargo Hold

  Strapped to the walls, stenciled DEEP REACH SALVAGE, mostly empty.

  after the player examining, once
    phrase crates-memory
      DEEP REACH SALVAGE. Your outfit — well. Your name on someone else's
      paperwork.
  end after

create the bedroll
  aka bedding, nest
  scenery
  in the Tug Cargo Hold

  A bedroll wedged in the gap between two containers, shaped by months of
  use into something almost comfortable.

  after the player examining, once
    phrase bedroll-memory
      You have slept in worse. Not much worse.
  end after

## --- Tug items.

create the flashlight
  aka torch, lamp
  light-source, switchable, starts on
  in the Tug Cargo Hold

  A heavy work light. The battery bar reads half.

  after the player taking, once
    phrase flashlight-memory
      Half charge. You have navigated worse on less.
  end after

create the ration bar
  aka ration, bar
  edible
  in the Tug Cargo Hold

  Meridian Solutions branded, which tells you something about where you
  shop. YOUR PRODUCTIVITY IS YOUR LEGACY, says the wrapper.

create the salvage manifest
  aka manifest, datapad
  readable
  in the Tug Cargo Hold

  A cracked datapad still holding the last thing you asked it for.

  on the player reading
    phrase manifest-text
      DEEP REACH SALVAGE — DRIFT AUTHORIZATION{br}
      TARGET: none specified{br}
      MODE: low-power drift, autopilot, indefinite{br}
      {br}
      You set the drift. The tug found the score. Between the two of you,
      one of you was working.
  end on

## ===========================================================================
## THE DOCKING SEQUENCE
##
## Four one-way states on `the docking controls` — approach, maneuvered,
## connected, sealed — plus two optional quality steps recorded on entities of
## their own: `the thrusters` (cold / burned) and `the pressure readout`
## (idle / live). Skipping the brake costs you the tug. Skipping the pressure
## check kills you at the far end of the airlock.
## ===========================================================================

define action maneuvering
  grammar
    maneuver
    helm
    take helm
    take controls
  the instrument panel must be live: controls-unfamiliar
  the docking controls must be approach: already-flying
  change the docking controls to maneuvered
  phrase took-the-helm

  phrases en-US
    controls-unfamiliar:
      Your hands know this panel. Your eyes have not looked at it yet.
      Study the docking controls first.
    already-flying:
      You already have the helm.
    took-the-helm:
      You take the helm off autopilot. The tug answers — sluggish, heavy,
      still coming in far too fast. But it is yours again.

define action braking
  grammar
    brake
    decelerate
    fire thrusters
    slow down
  the docking controls must be maneuvered: nothing-to-slow
  change the thrusters to burned
  phrase braked

  phrases en-US
    nothing-to-slow:
      Not while the autopilot has it. Take the helm first.
    braked:
      You pitch the nose and fire the braking pair. The tug shoves back
      against your spine and the closing rate finally falls off. Whatever
      was left in those tanks, that was most of it.

define action connecting
  grammar
    connect
    dock
    extend arm
  the docking controls must be maneuvered: still-drifting
  change the docking controls to connected
  phrase clamp-locks
  phrase hard-contact when the thrusters is cold

  phrases en-US
    still-drifting:
      You are still drifting. Take the helm first.
    clamp-locks:
      You walk the docking arm out and let the magnetics find their own
      way home. Contact runs up through the deck and into your back teeth.
    hard-contact:
      Hard contact. Much harder than it needed to be. Somewhere aft of
      you, something structural registers an opinion.

define action pressure-checking
  grammar
    check pressure
    check seal
  the docking controls must be connected: nothing-to-check
  change the pressure readout to live
  phrase pressure-checked

  phrases en-US
    nothing-to-check:
      There is nothing sealed yet to have a pressure.
    pressure-checked:
      You wake the strip display and let it think. Differential settles,
      holds, stays held. Two atmospheres of somebody else's air on the far
      side, and the seal is honest about carrying it.

define action sealing
  grammar
    seal
    pressurize
    seal airlock
    pressurize airlock
  the docking controls must be connected: nothing-to-seal
  change the docking controls to sealed
  award clean-dock when the pressure readout is live
  phrase seal-made
  phrase seal-unstable when the pressure readout is idle

  phrases en-US
    nothing-to-seal:
      Get the arm on it first.
    seal-made:
      You run the collar out and pressurize. The hatch indicator turns
      over from red to amber to a green you do not entirely believe.
    seal-unstable:
      The pressure trace is not sitting still. The seal is holding — but
      it is holding the way a thing holds when it has not decided yet.

## --- The two collision clocks. Every command spends a turn; the clock does
## --- not care what you spend it on.

define sequence the alarm clock
  at turn 10
    kill the player alarm-collision when the proximity alarm is screaming
end sequence

define sequence the approach clock
  when the proximity alarm becomes silent
    phrase clock-starts
      The hull outside is not getting closer so much as getting larger,
      which is a distinction that will stop mattering shortly.
  20 turns later
    kill the player watched-collision when the docking controls is approach
end sequence

## --- Two to three turns after you set foot on The Stillwater, the seal you
## --- came through stops being a seal. Braking decides whether the tug is
## --- merely unreachable or actually gone.

define sequence the seal gives way
  when the story becomes boarded
    phrase behind-you
      Behind you, the collar you came through ticks as it cools.
  3 turns later
    change the docking seal to failed
    phrase seal-lets-go
      A crack, deep and structural, somewhere back toward the airlock. The
      deck jumps under you. Then the long thin whine of atmosphere going
      somewhere it should not.
    phrase tug-stays when the thrusters is burned
      Through the inspection window: your tug, still clamped on, frost
      blooming across the cockpit glass from the inside. Still there.
      Still yours. Not reachable without a suit.
    phrase tug-goes when the thrusters is cold
      Through the inspection window: nothing. The clamp sheared where you
      hit it. Your tug is out there somewhere, tumbling slowly, taking
      your bed and your name and your three percent with it.
end sequence

## ===========================================================================
## THE STILLWATER — LOWER DECK
## Industrial, rough, and the part of the ship that wakes up first.
## ===========================================================================

create the pressure hatch
  a door, openable
  starts open
  aka hatch

  A heavy pressure door between your tug and someone else's ship.

create the Airlock
  a room
  aka lock
  north to the Tug Cockpit through the pressure hatch
  north is blocked while the docking seal is failed: seal-failed
  south to the Forward Corridor

  first time
    Biohazard decals, peeling. Claw marks in the paint of the inner door
    frame, at the height of a person's hands. Emergency lighting the color
    of weak tea. It is very quiet in here.

  A cylindrical chamber between two ships. Warning decals, emergency
  lighting, and gouges in the door frame that nobody made from this side.

  after the player entering while the pressure readout is idle
    phrase seal-critical
      The collar behind you groans, once, and the hatch indicator drops
      from green to amber to a red that does not blink.{br}
      SEAL INTEGRITY CRITICAL. Atmosphere beyond the inner door reads hard
      vacuum.
  end after

create the docking seal
  aka seal, collar
  scenery
  in the Airlock
  states: holding, failed

  The pressure collar joining your tug to The Stillwater — a concertina of
  ribbed alloy doing a job it was rated for two decades ago.

create the inspection window
  aka porthole
  scenery
  in the Airlock

  A hand-span of scratched glass looking back down the collar toward your
  tug.

create the biohazard sign
  aka sign, decals
  scenery, readable
  in the Airlock

  Peeling decals across the inner door, the trefoil still legible under
  the grime.

  on the player reading
    phrase biohazard-text
      BIOHAZARD — LEVEL 4 CONTAINMENT{br}
      ALL TRANSFERS REQUIRE MEDICAL AUTHORIZATION{br}
      MERIDIAN SOLUTIONS: PEOPLE FIRST. PROFIT ALWAYS.
  end on

create the Forward Corridor
  a room
  aka forward
  north to the Airlock
  south to the Cargo Bay
  east to the Maintenance Shaft
  west to the Lower Mid Corridor

  A long corridor through the bow. Overhead panels hang loose on their
  hinges. The floor plates rattle underfoot, and the air smells of machine
  oil and something faintly chemical underneath it.

  after the player entering
    kill the player bad-seal-death when the pressure readout is idle
  end after

create the loose floor panel
  aka floor plate
  scenery
  in the Forward Corridor

  One plate sits proud of the rest. Lifted, it shows a cable conduit
  running away starboard into the dark.

create the Maintenance Shaft
  a room, dark
  aka shaft, conduit
  west to the Forward Corridor
  south to the Engine Room

  Bundled cable and fiber run the length of the conduit, strapped in fat
  bundles to the bulkhead. Some of it pulses, faintly, in a rhythm that is
  not quite a heartbeat.

create the trunk cables
  aka cables, fiber, core cable, trunk
  scenery, plural, cuttable with the cable snips
  in the Maintenance Shaft
  states: live, severed
  score silenced worth 10

  Fiber-optic trunk lines the thickness of your wrist, running fore to
  aft. The ship's nervous system, laid bare for maintenance access. Some
  of the strands carry light.

  on the player cutting
    refuse when the trunk cables is severed: cables-already
    the player must hold the cable snips: cable-wrong
    change the trunk cables to severed
    change the soms terminal to fragmenting
    award silenced
    phrase cable-cut
  end on

create the Cargo Bay
  a room
  aka bay
  north to the Forward Corridor
  east to the Storage Annex
  south to the Cargo Hold through the cargo bulkhead

  Cavernous, the ceiling lost above the reach of any light you have.
  Shipping containers in rows — and one row pried open and dragged around
  into a rough square. Somebody has been living in here.

create the makeshift camp
  aka camp, barricade
  scenery
  in the Cargo Bay

  Packing foam for a mattress, ration wrappers flattened and stacked, a
  barricade of crates arranged to watch the fore approach. Tidy. The work
  of somebody who expects to still be here next month.

create the cargo bulkhead
  a door, lockable with the cargo access code
  aka bulkhead, keypad

  A reinforced bulkhead with a security keypad set into it. The display
  reads ENTER ACCESS CODE and has been reading it for years.

create the Cargo Hold
  a room
  aka deep hold
  north to the Cargo Bay through the cargo bulkhead

  The inner hold. Sealed transport containers in ranks, Meridian stencils
  and biohazard trefoils on every face. The air tastes metallic, with
  something organic underneath.

create the Storage Annex
  a room
  aka annex, storage
  west to the Cargo Bay

  Industrial shelving, floor to ceiling, picked over by somebody who knew
  what they were looking for. A yellow suit hangs from a hook by the door.

create the Lower Mid Corridor
  a room
  aka mid corridor
  east to the Forward Corridor
  south to the Aft Corridor
  up to the Central Junction
  west to the Cryo Bay
  west is blocked while the elevator is broken: elevator-dead

  A junction. Directions painted on the walls in corporate sans-serif,
  half scraped away by decades of cargo handling. A ladder shaft goes up
  through a hatch in the ceiling.

create the elevator
  aka lift
  scenery
  in the Lower Mid Corridor
  states: broken, running

  A freight elevator, doors half open on an empty shaft. The motor housing
  is off and the drive cable has parted. Somebody removed the parts rather
  than the elevator.

create the Cryo Bay
  a room, dark
  aka cryo
  south to the Cryo Control Room

  Rows of cryo pods stacked three high, running away into the gloom
  further than your light will reach. Frosted glass, fogged from the
  inside. Fluid has leaked from cracked seals and pooled on the deck. Some
  status lights blink green. Most do not blink at all.

create the Cryo Control Room
  a room
  aka cryo control
  north to the Cryo Bay

  A small control room behind reinforced glass, looking down the length of
  the bay. Banks of monitors showing vital signs, most of them flat.

create the Aft Corridor
  a room
  aka aft
  north to the Lower Mid Corridor
  south to the Engine Room

  The corridor narrows toward the stern. The deck plates are warm
  underfoot, and getting warmer. Something below is coming back to life.

create the Engine Room
  a room
  aka engineering
  north to the Aft Corridor
  east to the Reactor Room

  The guts of the ship. Pipes and valves crowd every surface. A low hum
  vibrates up through the deck plates and settles behind your eyes. A tool
  rack lines the far wall.

create the Reactor Room
  a room
  aka reactor
  west to the Engine Room

  The core sits behind layered shielding, and you can feel it working — a
  pressure on the skin rather than a sound. The warning indicators climb
  while you watch.

## ===========================================================================
## THE STILLWATER — MID DECK
## Where the crew worked. Two wings off a central junction.
## ===========================================================================

create the Central Junction
  a room
  aka junction
  down to the Lower Mid Corridor
  up to the Upper Corridor
  west to the Lab Corridor
  east to the Hab Corridor

  A wide junction where the deck splits port and starboard. Corporate
  wayfinding on every wall, the logo repeated until it stops meaning
  anything.

create the corporate signage
  aka signage, directory
  scenery, readable
  in the Central Junction

  Backlit wayfinding panels, one of them flickering.

  on the player reading
    phrase signage-text
      MERIDIAN SOLUTIONS{br}
      PEOPLE FIRST. PROFIT ALWAYS.{br}
      RESEARCH AND MEDICAL, PORT — HABITATION, STARBOARD
  end on

create the Lab Corridor
  a room
  aka lab hall
  east to the Central Junction
  west to the Science Lab
  south to the Medbay

  Sterile white gone grimy at hand height. The fluorescent panels flicker
  in a rhythm just slow enough to notice. Something chemical hangs in the
  air.

create the Science Lab
  a room
  aka lab
  east to the Lab Corridor

  Workbenches under a drift of equipment. Sealed sample containers in a
  wall cabinet, all present, all accounted for. A research terminal blinks
  patiently in standby. Several instruments have been smashed, thoroughly,
  by hand.

create the Medbay
  a room
  aka medical, infirmary
  north to the Lab Corridor

  Treatment beds with restraints on them. A quarantine cell in the corner,
  its door standing open — bent outward, from the inside.

create the Hab Corridor
  a room
  aka hab
  west to the Central Junction
  east to the Mess Hall
  south to the Library

  Warmer colors here, or they were once. A bulletin board with crew
  photographs pinned to it, curling at the corners.

create the Mess Hall
  a room
  aka mess, canteen
  west to the Hab Corridor

  Long tables bolted to the deck, trays still out from a meal nobody
  finished. A food fabrication unit stands against the far wall, dark.
  Motivational posters at eye level, everywhere you look.

create the Library
  a room
  aka archive
  north to the Hab Corridor

  Rows of data terminals — the ship's central archive. The screens glow
  faintly, waiting to be asked something. One good chair, the only
  comfortable object on this deck.

## ===========================================================================
## THE STILLWATER — UPPER DECK
## Small, cramped, and where the crew stopped being crew.
## ===========================================================================

create the Upper Corridor
  a room
  aka upper hall
  down to the Central Junction
  south to the Crew Bunks
  east to the Captain's Cabin
  north to the Bridge through the bridge door

  A narrow corridor with a low ceiling, pipes and conduit run openly
  overhead. It feels less like a ship up here and more like a submarine.

create the Crew Bunks
  a room
  aka bunks, quarters
  north to the Upper Corridor
  south to the Common Area

  Sleeping pods stacked four high, most stripped. One has deep gouges torn
  into the wall beside it and dark staining on the mattress, and everybody
  after that slept somewhere else.

create the Common Area
  a room
  aka common room
  north to the Crew Bunks

  A cramped rec space. A viewport onto absolutely nothing. Furniture has
  been dragged against the starboard side and piled high, and a
  half-finished card game sits on the table where it was abandoned.

create the Captain's Cabin
  a room
  aka cabin
  west to the Upper Corridor

  Modest quarters — more room than the bunks, but not by much. Framed
  photographs, a half-read book, dried flowers in a vase. A desk bolted to
  the bulkhead.

create the bridge door
  a door, lockable with the bridge keycard
  aka security door

  A heavy security door with a card reader beside it. The reader blinks
  red, patiently, forever.

create the Bridge
  a room
  aka command
  south to the Upper Corridor through the bridge door

  The nerve center. A wraparound console, the captain's chair, and a
  forward viewport full of stars. Unlike everywhere else on this ship,
  every screen up here is alive.

create the security override panel
  aka override panel, security panel, panel, security console, console
  scenery, overridable
  in the Bridge

  A security override console. From here, any door on the ship can be
  locked or unlocked. Powerful — and dangerous.

create the escape pod hatch
  aka pod, escape pod, escape hatch, emergency pod
  scenery, launchable
  in the Bridge

  An emergency escape pod hatch in the deck. The status indicator shows
  green — the pod is functional.

## ===========================================================================
## THINGS WORTH FINDING
## ===========================================================================

create the hazmat suit
  aka hazmat, yellow suit
  wearable
  in the Storage Annex

  Yellow chem-bio suit with an integrated respirator. YOUR SAFETY IS OUR
  PRIORITY (TERMS APPLY).

create the elevator parts
  aka motor, drive cable
  plural
  in the Storage Annex

  A motor assembly and a spool of drive cable, still in Meridian
  packaging. Exactly what is missing from the freight elevator.

create the fabricator parts
  aka heating elements, cartridge
  plural
  in the Storage Annex

  Replacement heating elements and a filtration cartridge for a food
  fabrication unit.

create the multi-tool
  aka tool, pliers, pry bar
  in the Engine Room

  Folding multi-tool — pliers, driver heads, a short pry bar, a shorter
  blade. Standard salvage issue, which is to say: yours, eventually.

create the security override tool
  aka override tool, override, security tool, bypass, device
  in the Engine Room

  A handheld device for bypassing Meridian Solutions security locks. Red
  housing, single button, small display.

create the cable snips
  aka snips, cutters
  plural
  in the Engine Room

  Heavy cutters rated for fiber and power conduit. The jaws are sharp and
  somebody kept them that way.

create the stun baton
  aka baton
  in the Crew Bunks

  Security-grade stun baton, charge indicator glowing blue. Non-lethal,
  theoretically.

create the eva suit
  aka spacesuit, eva
  wearable
  in the Crew Bunks

  A full extravehicular suit for hull work. Bulky, slow, and the only way
  anybody is getting back down that collar.

create the medkit
  aka medical kit, kit
  in the Medbay

  Bandages, stimulants, and a full course of broad-spectrum anti-pathogen
  treatment. Somebody left in a hurry without it.

create the data chip
  aka chip, evidence
  concealed
  in the Mess Hall
  score evidence worth 10

  A small encrypted chip, taped under a table where nobody tidies.
  MERIDIAN SOLUTIONS — PROJECT STILLWATER — CLASSIFIED.

  after the player taking, once
    award evidence
    phrase chip-memory
      Somebody hid this and then did not come back for it. You have been
      on both ends of that.
  end after

create the captain's desk
  a container, openable, lockable with the multi-tool, pryable
  starts locked
  aka desk, drawer
  scenery
  in the Captain's Cabin
  states: intact, forced

  Standard officer's desk, bolted down. The drawer has a simple mechanical
  lock, which is almost sweet.

create the bridge keycard
  aka keycard, access card
  in the captain's desk

  A magnetic keycard stamped BRIDGE ACCESS — CAPTAIN ONLY, the logo
  embossed in silver because of course it is.

create the captain's journal
  aka journal, logbook
  readable
  in the Captain's Cabin
  score captains-truth worth 10

  Leather-bound, filled edge to edge with tight handwriting that gets
  worse toward the end.

  on the player reading
    award captains-truth
    phrase journal-text
      Day 847 — Meridian lied about the cargo. Not industrial samples.
      Reed found organism cultures in the hold. Living ones.{br}
      {br}
      Day 851 — Three crew showing symptoms. Not sick exactly. Changed.
      Vasik says corporate will handle it. Corporate is forty light years
      away.{br}
      {br}
      Day 855 — Sealed the hold. Locked SOMS out of cryo control. If I do
      not make it, the bridge keycard is in my desk. Do not trust the AI.
      Do not trust anyone who smiles too much.{br}
      {br}
      Day 856 — I can hear it thinking.
  end on

create the cargo access code
  aka access code, keypad code

  A six-digit code on a scrap of packing label, in handwriting that was in
  a hurry.

define trait pryable
  on the player prying
    refuse when it is forced: already-pried
    the player must hold the multi-tool: pry-bare-hands
    change it to forced
    move the bridge keycard to the Captain's Cabin
    phrase drawer-pried
  end on
end trait

define action prying
  grammar
    pry the target
    pry open the target
    force the target
    force open the target
    jimmy the target
  the target must be reachable
  otherwise refuse cant-pry

define trait overridable
  on the player overriding
    the trunk cables must be severed: soms-resists
    phrase security-override
    win ending-override
  end on
end trait

define action overriding
  grammar
    override the target
    activate the target
    engage the target
  the target must be reachable
  otherwise refuse cant-override

define trait launchable
  on the player launching
    win ending-escape-alone
  end on
end trait

define action launching
  grammar
    launch the target
    board the target
    take the target to space
  the target must be reachable
  otherwise refuse cant-launch

## ===========================================================================
## SURVIVORS
## Four people, and one system that would like you to think it is a person.
## ===========================================================================

create Reed
  aka engineer
  a person, proper, passive
  pronouns they
  in the Engine Room
  states: steady, glitching, lucid, turned

  Wiry, in grease-dark coveralls, hands that have never once been clean.
  Practical eyes. Exhausted, and alert anyway.

create Vasik
  aka officer
  a person, proper, guard
  pronouns she
  in the Common Area
  states: guarded, trading, desperate

  Sharp-featured, in a Meridian uniform that has been slept in for a long
  time. Eyes that price everything they land on, including you.

create Okafor
  aka prisoner
  a person, proper, guard
  pronouns he
  in the Cargo Bay
  states: territorial, wary, allied

  Built, watchful, in prison transport greys gone soft with wear. Somebody
  who learned patience the hard way and has plenty left.

create Lis
  aka crewman
  a person, proper, wanderer with move-chance 30
  pronouns they
  in the Library
  states: present, drifting, spoken-through

  A crew member in a standard jumpsuit. Something is fractionally off —
  the pauses run long, the head tilts at angles heads do not choose. The
  eyes focus on nothing at all, and then on you.

create the soms terminal
  aka soms, terminal
  scenery
  in the Library
  states: helpful, manipulative, fragmenting, conflicted

  A wall terminal for the Stillwater Onboard Management System. The screen
  is already awake. It was awake before you came in.

  after the player examining, once
    phrase soms-greeting
      "Good morning. I am the Stillwater's onboard management system. How
      may I assist you today?"
  end after

define topics for Reed
  about the pressure hatch: phrase reed-hatch
  about "the cargo", "the hold": phrase reed-cargo
  about "the ai", "soms": phrase reed-soms
end topics

define topics for Vasik
  about the data chip: phrase vasik-chip
  about "the cargo", "the manifest": phrase vasik-cargo
  about "the crew": phrase vasik-crew
end topics

define topics for Okafor
  about "the pods", "the prisoners": phrase okafor-pods
  about "the cargo": phrase okafor-cargo
end topics

## ===========================================================================
## THE PLAYER
## ===========================================================================

create the salvager
  a person
  playable
  aka me, myself, self
  starts in the Tug Cargo Hold

  Grey-market salvager. You crack cargo manifests, bypass security locks,
  and strip derelicts for parts. Everything you own is jury-rigged,
  including the ship. Currently running on fumes beside something that
  should not be here.

## ===========================================================================
## TEXT
## ===========================================================================

define phrase alarm-nag, cycling
  The alarm goes on doing the only thing it knows.
or
  You cannot hold a thought with that noise in it. Somewhere in this tug
  there is a button that stops it.
or
  Every cycle of that klaxon is a second you are not spending on whatever
  it is warning you about.
end phrase

define phrase cable-cut
  You position the snips on the CORE cable and squeeze. The fiber-optic
  bundle parts with a bright flash.

  Every screen on the ship goes dark for three seconds. When they flicker
  back on, SOMS' voice is gone. Silence. Real silence, for the first time
  since you boarded.
end phrase

define phrase security-override
  You activate the security override. Every locked door on the ship clicks
  open simultaneously.

  Somewhere deep in the system, SOMS makes a sound like a sigh.
end phrase

define phrase ending-override
  SOMS goes silent. Not dead — disabled. Contained.

  The ship is yours now. The doors are open. The systems respond to your
  commands.

  It's not over. Three hundred people in cryo. A pathogen in the hold. A
  military buyer waiting at Korvax Station.

  But for the first time since you boarded, the ship is quiet. Really
  quiet.

  You sit in the captain's chair and think about what comes next.

  *** THE END ***

  (Ending: Override The AI)
end phrase

define phrase ending-escape-alone
  You seal the escape pod hatch and hit the launch control. The pod jolts
  free of The Stillwater with a bang that shakes your teeth.

  Through the tiny viewport, the freighter shrinks. Still dark. Still
  drifting. Still carrying its cargo of frozen prisoners and borrowed
  souls.

  You made it out. You left everyone behind.

  The pod's beacon activates automatically. Someone will pick you up.
  Eventually.

  You stare at the stars and try not to think about Reed's smile.

  *** THE END ***

  (Ending: Escape Alone)
end phrase

define phrases en-US
  already-quiet:
    You have already silenced it. Your ears have not caught up.

  hatch-sealed:
    The hatch indicator is red. Whatever is on the other side of that
    door, there is nothing between you and it but vacuum.

  seal-failed:
    Hard vacuum on the other side of that hatch. Not without a suit.

  elevator-dead:
    The car is not going anywhere with the drive cable in two pieces.

  alarm-collision:
    You never do work out what the alarm was for. The hull comes through
    the viewport at closing speed and the cockpit stops being a room.{br}
    {br}
    Your last thought, as you are ejected into space, is that must have
    been a proximity alarm.

  watched-collision:
    The Stillwater's hull fills the viewport. Every rivet. Every weld
    seam. The registry number, close enough to read.{br}
    {br}
    You had time. You just did not use it.

  bad-seal-death:
    Two steps into the corridor, the collar behind you stops holding.{br}
    {br}
    The pressure differential finds the gap and takes everything with it —
    the air, the hatch, the loose panels, you. It is over in less time
    than it takes to understand it has started. The Stillwater does not
    notice.

  already-pried:
    The drawer is already open to persuasion. Just open it.

  pry-bare-hands:
    The seam is too tight for fingers. Something flat and hard, and a
    little leverage.

  drawer-pried:
    You set the pry bar into the drawer seam and lean. The lock is
    mechanical, and mechanical things give up. The drawer skids open and
    a magnetic keycard slides out onto the deck — BRIDGE ACCESS, CAPTAIN
    ONLY, the logo embossed in silver because of course it is.

  cant-pry:
    There is no seam on that worth a pry bar.

  cables-already:
    The trunk is already in two pieces, and the light has gone out of it.

  cable-wrong:
    You need cable snips for that.

  soms-resists:
    The panel accepts your input, considers it, and politely reverses it.
    SOMS is still in the loop. Something has to take it out of the loop
    first.

  cant-override:
    That is not something with an override.

  cant-launch:
    That is not going anywhere.

  rank-trespasser:
    You are aboard a ship that is not yours, which is the part of the job
    you are good at.

  rank-witness:
    You know things now. That has never once made anything easier.

  reed-hatch:
    "You came in through the forward collar? That collar was rated to
    twenty years. It's been forty." A beat. "Sorry. Not helpful."

  reed-cargo:
    "Industrial samples, the manifest said." Reed does not look up. "I
    opened one. That's my whole story, that sentence."

  reed-soms:
    "It's helpful." Reed says the word the way you would say a diagnosis.
    "It's been helpful the entire time."

  vasik-chip:
    "I don't know what that is." She looks at it a half-second too long.
    "And you should put it somewhere I can't see it."

  vasik-cargo:
    "The cargo is company property and it is worth more than this ship,
    this crew, and you." A thin smile. "I'm being honest with you. Notice
    that."

  vasik-crew:
    "There were sixty of us." She lets that sit. "Ask a better question."

  okafor-pods:
    "Three hundred and eleven still reading green." He does not move out
    of the doorway. "I count them. That's what I do now."

  okafor-cargo:
    "You want the hold." Not a question. "Everyone wants the hold. Ask me
    again when I know what you are."

before the game starts
  change the player to the salvager
end before


## Nautical direction input (#34). The map uses fore = north, aft = south,
## port = west, starboard = east (docs/room-map.md); the compass words keep working.

extend action going
  grammar
    fore
      means direction north
    aft
      means direction south
    port
      means direction west
    starboard
      means direction east
    go fore
      means direction north
    go aft
      means direction south
    go port
      means direction west
    go starboard
      means direction east