story
  title: Bad Sequence
  authors: Nobody
  id: bad-seq
  story-version: 0.0.1

define sequence countdown
  at turn 2
    phrase tick
      Tick.
  eventually
    phrase tock
      Tock.
end sequence
