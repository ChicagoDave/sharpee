define trait wick
  on the player sparking
    refuse when it is lit: already-burning
    change it to lit
    phrase sparked
  end on

  on the player lighting
    refuse light-needs-the-word
  end on
end trait
