  on the player reading
    select on the kindle page's state
      when legible
        change the kindle page to learned
        change the story to waking
        phrase kindle-learned
        each faded-page
          change the match to legible
        end each
      when learned
        phrase kindle-known
    end select
  end on
