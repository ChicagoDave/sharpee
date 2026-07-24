story "Scoring" by "Sharpee Docs"
  id: chord-ref-scoring
  version: 0.0.1
  score green-thumb worth 5
  use scoring

define trait prunable
  score tidy-secateurs worth 5

  phrases en-US
    pruned:
      You snip away the dead wood.

  on pruning it
    award tidy-secateurs
    phrase pruned
  end on
end trait

create the Rose Border
  a room

  Ranks of roses in their full July extravagance.

create the damask rose
  aka damask
  prunable
  in the Rose Border
  score deadheaded worth 5

  A crimson damask, badly overgrown.

  after pruning it
    award deadheaded
    award green-thumb
  end after

create the moss rose
  aka moss
  prunable
  in the Rose Border
  score deadheaded worth 5

  A pink moss rose with sticky buds.

  after pruning it
    award deadheaded
  end after

define action composting
  grammar
    compost :stuff
  score turned-the-heap worth 10
  award turned-the-heap
  phrase composted
  phrases en-US
    composted:
      Straight onto the heap with it.

create the player
  starts in the Rose Border
