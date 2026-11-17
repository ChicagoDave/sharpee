define machine shutter-gear
  role crank is the shutter crank
  starts shut

  state shut
    when turning the crank: half

  state half
    on enter
      phrase shutters-shift
    end on
    when turning the crank while the lens is in the Great Lantern: drawn
    when pushing the crank: shut
    on exit
      phrase gear-ticks
    end on

  state drawn, terminal
    on enter
      change the shutter to drawn
      phrase shutters-open
    end on
end machine
