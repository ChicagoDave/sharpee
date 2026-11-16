  on the player reading
    refuse when the hush page is faded: page-blank
    select on the hush page's state
      when legible
        change the hush page to learned
        phrase hush-learned
      when learned
        phrase hush-known
    end select
  end on
