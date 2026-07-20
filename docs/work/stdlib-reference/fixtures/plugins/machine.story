story "The Ferry" by "ref"
  id: plugins-machine
  version: 0.0.1
  states: waiting, signaled
  use state-machines

create the Slipway
  a room

  A cobbled slipway running down into grey water.

create the capstan
  in the Slipway

  A tarred capstan wound with ferry rope.

  on turning it
    phrase capstan-turns
      You lean into the capstan and it comes round, pawls clacking.
  end on

create the signal cord
  aka cord
  scenery, pullable
  in the Slipway

  A cord for ringing the bell on the far bank.

  on pulling it
    change the story to signaled
    phrase cord-rings
      Far across the water, a bell answers the cord.
  end on

create the player
  starts in the Slipway

define machine ferry
  role capstan is the capstan
  starts moored

  state moored
    when turning the capstan: casting-off

  state casting-off
    on enter
      phrase rope-pays-out
    end on
    when signaled: underway

  state underway, terminal
    on enter
      phrase ferry-underway
    end on
end machine

define phrase rope-pays-out
  The rope pays out and the ferry noses off the far bank.
end phrase

define phrase ferry-underway
  The ferry is underway, beating slowly toward you.
end phrase
