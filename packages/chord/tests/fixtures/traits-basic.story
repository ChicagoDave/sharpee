story "Trait Declarations Fixture" by "Sharpee Platform"
  id: traits-basic
  version: 0.0.1
  blurb: design.md 2.2/3.2 + ownership package - data types, trait states, ordering, role binding, hatches.
  states: open-hours, after-hours

define trait sealable
  states, reversible: sealed, ajar

  phrases en-US
    already-ajar:
      {capitalize the item} {verb:is item} already open.
    unsealed:
      {You} {open} {the item}.
    unsealed-empty:
      {You} {open} {the container}, which is empty.

  on opening it
    it must be sealed: already-ajar
    change it to ajar
    emit unsealed
    phrase unsealed-empty when it is a container and it holds nothing
  end on
end trait

define trait barrable
  data
    key: entity

  phrases en-US
    barred:
      {capitalize the item} {verb:is item} barred shut.

  on opening it, before sealable
    refuse when its key is in the Break Room: barred
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
    refuse when the taker holds the flimsy basket: hands-full
  end on
end trait

define action snoozing
  grammar
    snooze
    nap → each quiet corner
  score napped worth 1
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

define phrases en-US
  closed-up:
    The north door is bolted after hours.
