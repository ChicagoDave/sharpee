story "Broken" by "Nobody"
  id: broken-3
  version: 0.0.1

create the message
  scenery
  states: intact, trampled

  on reading it
    select on its state
      when intact
        phrase message-intact
    end on
  end select

define phrases en-US
  message-intact:
    Fine.
