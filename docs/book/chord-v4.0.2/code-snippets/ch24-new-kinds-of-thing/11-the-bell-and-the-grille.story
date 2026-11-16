define trait hushable
  score quieted worth 5

  on the player hushing
    it must be tolling: already-quiet
    change it to silent
    award quieted
    phrase bell-hushed
  end on
end trait

define trait ward
  score unsealed worth 5

  on the player unbinding
    refuse when the tower bell is unrung: ward-asleep
    refuse when the tower bell is tolling: ward-in-the-bell
    change it to lifted
    move it offstage
    award unsealed
    phrase ward-lifts
  end on
end trait
