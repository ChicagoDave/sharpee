on the player reading
  select on the kindle page's state
    when legible
      change the kindle page to learned
      change the story to waking
      start waking
      raise workings by 1
      emit relighting-working-learned with working "kindle" and gloss "wakes a flame"
      award first-working
      phrase kindle-learned
