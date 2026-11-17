define trait mendable
  states: cracked, sound
  score made-whole worth 5
  phrases en-US
    mended:
      You say the word and mean it. What was broken is whole, and has
      no memory of having been otherwise.

  on the player mending
    refuse when it is sound: already-whole
    change it to sound
    award made-whole
    phrase mended
  end on
end trait
