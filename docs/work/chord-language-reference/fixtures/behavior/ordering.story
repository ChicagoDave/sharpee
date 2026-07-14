story "Clause Ordering" by "Sharpee Docs"
  id: chord-ref-ordering
  version: 0.0.1

define trait alarmed
  phrases en-US
    alarm-bell:
      A bell above the door rattles into life.

  on opening it
    phrase alarm-bell
  end on
end trait

define trait creaky
  phrases en-US
    hinge-creak:
      The hinges creak horribly.

  on opening it, before alarmed
    phrase hinge-creak
  end on
end trait

create the Tool Shed
  a room

  Rakes and hoes hang in size order.

create the shed cabinet
  aka cabinet
  scenery, openable, alarmed, creaky
  in the Tool Shed

  A tall metal cabinet with a rattling bell mounted above it.

create the player
  starts in the Tool Shed
