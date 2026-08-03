story
  title: Gate 5
  authors: Nobody
  id: gate-5
  story-version: 0.0.1

create the box
  states: shut, open

  on reading it
    change the box to open
    refuse cant-read
  end on

define phrases en-US
  cant-read:
    No.
