story "Gate 2" by "Nobody"
  id: gate-2
  version: 0.0.1

create the message
  scenery
  states: intact, trampled

  on reading it
    phrase message-intact when the message is intactt
  end on

define phrases en-US
  message-intact:
    Fine.
