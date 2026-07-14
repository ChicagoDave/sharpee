story "Bad Sequence" by "Nobody"
  id: bad-seq
  version: 0.0.1

define sequence countdown
  at turn 2
    phrase tick
      Tick.
  eventually
    phrase tock
      Tock.
end sequence
