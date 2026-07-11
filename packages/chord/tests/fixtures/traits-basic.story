story "Trait Declarations Fixture" by "Sharpee Platform"
  id: traits-basic
  version: 0.0.1
  blurb: design.md 2.2/3.2 - data types, ordering, role binding, hatches.

define trait openable
  data
    open: flag, starts false

  phrases en-US
    already-open:
      {capitalize the item} {verb:is item} already open.
    opened:
      {You} {open} {the item}.
    opened-empty:
      {You} {open} {the container}, which is empty.

  on opening it
    if open then
      refuse already-open
    end if
    set open to true
    emit opened
    if it is a container and it holds nothing then
      phrase opened-empty
    else
      phrase opened
    end if
  end on
end trait

define trait lockable
  data
    locked: flag
    key: entity

  phrases en-US
    locked:
      {capitalize the item} {verb:is item} locked.

  on opening it, before openable
    if locked then
      refuse locked
    end if
  end on
end trait

define trait carrying-limit
  data
    max items: optional number
    body part: optional name

  phrases en-US
    hands-full:
      {You're} carrying too much already.

  on taking anything as the taker
    if the taker holds the flimsy basket then
      refuse hands-full
    end if
  end on
end trait

define action snoozing
  grammar
    snooze
    nap → each quiet corner
  otherwise refuse no-napping

  phrases en-US
    no-napping:
      There is no napping on duty.

define action juggling from "./stunts.ts"
define behavior crowd-control from "./stunts.ts"

create the Break Room
  a room
  north is blocked while after-hours: closed-up

  Lockers, a kettle, one sagging couch.

create the flimsy basket
  aka basket
  in the Break Room

  Woven this morning, regretted by noon.

define flag after-hours starts false

define phrases en-US
  closed-up:
    The north door is bolted after hours.
