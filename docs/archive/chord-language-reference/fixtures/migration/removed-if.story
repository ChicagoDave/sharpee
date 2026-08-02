story "Migration: if/else/end if is removed" by "Sharpee Docs"
  id: chord-ref-removed-if
  version: 0.0.1

create the strongbox
  openable
  states: locked-fast, sprung

  A dented strongbox.

  on opening it
    if it is locked-fast
      phrase clunk
    end if
  end on
