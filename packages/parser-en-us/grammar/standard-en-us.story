## GENERATED ONCE by scripts/generate-standard-grammar-chord.cjs (ADR-269 D1)
## from the rules grammar.ts registered — now the EDITABLE SOURCE of the
## standard grammar (ADR-266 direction (iv)). Definition order is semantic
## (ADR-268): earlier definition wins remaining ties. Do not reorder blocks
## or lines without reading the LOAD-BEARING comments.

grammar "standard-en-us"

define action looking
  grammar
    look
    l
    look [around]

define action examining
  grammar
    examine the target
    x the target
    inspect the target
    check the target
    view the target
    observe the target
    look at the target
    look [carefully] at the target

define action searching
  grammar
    search [carefully]
    search the target
    look in or inside the target
    look through the target
    rummage in or through the target

define action dropping
  grammar
    drop the item
    discard the item
    release the item
    put down the item
    throw away the item
    let go of the item

define action wearing
  grammar
    wear the item
    don the item
    equip the item
    put on the item

## ORDER IS LOAD-BEARING (ADR-268 D3): `take the item off` ties
## `take up the item` (taking) on specificity — taking_off is defined first.

define action taking_off
  grammar
    remove the item
    doff the item
    unequip the item
    take off the item
    take the item off

define action taking
  grammar
    take the item
    get the item
    grab the item
    acquire the item
    collect the item
    pick up the item
    take up the item

define action eating
  grammar
    eat the item
    consume the item
    devour the item
    munch the item
    nibble the item
    munch on the item
    nibble on the item

define action drinking
  grammar
    drink the item
    sip the item
    quaff the item
    swallow the item
    imbibe the item
    drink from the target
    sip from the target

define action inserting
  grammar
    put the item in or into or inside the container
    insert the item in or into the container

## ORDER IS LOAD-BEARING (ADR-268 D3): putting's `move the item to the
## destination` must precede the pushing block below (`move the target
## <direction>` ties it on specificity); wearing's `put on the item` above
## must precede the generic put forms here.

define action putting
  grammar
    put the item on or onto the supporter
    hang the item on the hook
    move the item to the destination
    place the item in or into or inside the container
    place the item on or onto the supporter

define action reading
  grammar
    read the target
    peruse the target
    study the target

define action inventory
  grammar
    inventory
    inv
    i

define action opening
  grammar
    open the door
    open the container with or using the tool
    unwrap the door
    uncover the door
    open up the door
  the tool is an instrument

define action closing
  grammar
    close the door
    shut the door
    cover the door

define action switching_on
  grammar
    turn on the device
    switch on the device
    flip on the device
    turn the device on
    activate the device
    start the device
    power on the device

define action switching_off
  grammar
    turn off the device
    switch off the device
    flip off the device
    turn the device off
    deactivate the device
    stop the device
    power off the device

define action pushing
  grammar
    push the target
    press the target
    shove the target
    move the target
    move the target north
    move the target n
    move the target south
    move the target s
    move the target east
    move the target e
    move the target west
    move the target w
    move the target northeast
    move the target ne
    move the target northwest
    move the target nw
    move the target southeast
    move the target se
    move the target southwest
    move the target sw
    move the target up
    move the target u
    move the target down
    move the target d
    move the target in
    move the target inside
    move the target out
    move the target outside

define action pulling
  grammar
    pull the target
    drag the target
    yank the target
    tug the target

define action lowering
  grammar
    lower the target

define action raising
  grammar
    raise the target
    lift the target

define action waiting
  grammar
    wait
    z

define action saving
  grammar
    save
    save game

define action restoring
  grammar
    restore
    load
    load game
    restore game

define action restarting
  grammar
    restart

define action sleeping
  grammar
    sleep
    nap
    doze
    rest
    slumber

define action quitting
  grammar
    quit
    q
    exit game

define action undoing
  grammar
    undo

define action scoring
  grammar
    score
    points

define action version
  grammar
    version

define action help
  grammar
    help
    commands

define action about
  grammar
    about
    info
    credits

define action giving
  grammar
    give the item to the recipient
    give the recipient the item
    offer the item to the recipient
    hand the item to the recipient
    hand the recipient the item

define action showing
  grammar
    show the item to the recipient
    show the recipient the item
    display the item to the recipient
    present the item to the recipient

define action throwing
  grammar
    throw the item at the target
    throw the item
    toss the item
    hurl the item
    throw the item to the recipient
    toss the item at the target
    toss the item to the recipient
    hurl the item at the target
    hurl the item to the recipient

define action removing
  grammar
    take the item from the container
    get the item from the container
    take the item from the container with or using the tool
    remove the item from the container
    extract the item from the container
  the tool is an instrument

define action unlocking
  grammar
    unlock the door with or using the key
    unlock the target
    unsecure the target
  the key is an instrument

define action locking
  grammar
    lock the target
    lock the target with or using the key
    secure the target
  the key is an instrument

define action cutting
  grammar
    cut the object with or using the tool
    cut the target
    slice the target
    chop the target
  the tool is an instrument

define action attacking
  grammar
    attack the target
    kill the target
    fight the target
    slay the target
    murder the target
    hit the target
    strike the target
    break the target
    smash the target
    destroy the target
    attack the target with or using the weapon
    kill the target with or using the weapon
    hit the target with or using the weapon
    strike the target with or using the weapon
  the weapon is an instrument

define action digging
  grammar
    dig the location with or using the tool
    dig the target
  the tool is an instrument

define action telling
  grammar
    tell the recipient about the topic
    inform the recipient about the topic
  the topic is a topic

define action asking
  grammar
    ask the recipient about the topic
    question the recipient about the topic
    inquire of the recipient about the topic
  the topic is a topic

## The last three talking lines are the lexable continuation prompts (ADR-320
## D14, frozen list): targetless thread-advance input — stdlib's talking
## action resolves the conversation partner implicitly. The fourth frozen
## form, `and?`, is punctuation Chord cannot lex; it lives platform-side in
## src/platform-grammar.ts beside `?`.

define action talking
  grammar
    talk to or with the target
    speak to or with the target
    chat with the target
    converse with the target
    tell me more
    continue
    go on

## ORDER IS LOAD-BEARING (ADR-268 D3): exiting's `go out` must precede the
## going block below — the only duplicate pattern with different actions in
## the standard grammar; definition order decides it.

define action exiting
  grammar
    go out
    exit
    get out
    leave
    climb out
    exit the container
    get out of the container
    climb out of the container
    disembark
    disembark the vehicle
    get off the vehicle
    alight

define action going
  grammar
    go the direction
    walk the direction
    run the direction
    head the direction
    travel the direction
    the direction
  directions
    north or n
    south or s
    east or e
    west or w
    northeast or ne
    northwest or nw
    southeast or se
    southwest or sw
    up or u
    down or d
    in or inside
    out or outside

define action listening
  grammar
    hear
    hear the target
    listen
    listen to the target

define action turning
  grammar
    turn the target
    rotate the target
    twist the target

define action touching
  grammar
    touch the target
    rub the target
    feel the target
    pat the target
    stroke the target
    poke the target
    prod the target

define action smelling
  grammar
    smell
    sniff
    smell the target
    sniff the target

define action entering
  grammar
    enter the portal
    get in the portal
    get into the portal
    climb in the portal
    climb into the portal
    go in the portal
    go into the portal
    board the vehicle
    get on the vehicle

define action climbing
  grammar
    climb the target
    climb up the target
    climb down the target
    scale the target
    ascend the target
    descend the target

define action again
  grammar
    again
    g

define action hiding
  grammar
    hide behind the target
      means position behind
    duck behind the target
      means position behind
    crouch behind the target
      means position behind
    hide under the target
      means position under
    duck under the target
      means position under
    crouch under the target
      means position under
    hide on the target
      means position on
    hide in the target
      means position inside
    hide inside the target
      means position inside
    duck inside the target
      means position inside

define action revealing
  grammar
    stand up
    come out
    reveal myself
    unhide
    stop hiding
