  on the player reading
    select on the spark page's state
      when legible
        change the spark page to learned
        change the story to waking
        phrase spark-learned
        each faded-page
          change the match to legible
        end each
      when learned
        phrase spark-known
    end select
  end on
