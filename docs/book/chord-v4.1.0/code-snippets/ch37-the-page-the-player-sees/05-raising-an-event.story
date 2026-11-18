on the player reading
  select on the spark page's state
    when legible
      change the spark page to learned
      change the story to waking
      start waking
      raise workings by 1
      emit relighting-working-learned with working "spark" and gloss "wakes a flame"
      award first-working
      phrase spark-learned
