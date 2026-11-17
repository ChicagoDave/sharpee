## Chapter 24, two things that take the burner trait with values. The
## harness supplies the trait as the fence before it gives it, the verb its
## clause is for, and the thing the second value names.

define action stoking
  grammar
    stoke the target
  the target must be reachable

define trait burner
  data
    fuel: one of tallow, oil
    keeper: optional entity

  on the player stoking
    phrase fuel-tallow when its fuel is tallow
    phrase fuel-oil when its fuel is oil
  end on
end trait

create the stub, a thing
  in the Yard

  A stub.

<<fence>>
