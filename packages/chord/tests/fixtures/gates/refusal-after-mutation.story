story "Gate 5" by "Nobody"
  id: gate-5
  version: 0.0.1

create the box
  states: shut, open

  on reading it
    change the box to open
    refuse cant-read
  end on

define phrases en-US
  cant-read:
    No.
