create the cat
  a person, wanderer with move-chance 50 and allowed-rooms [the Yard, the Shed]
  in the Yard

  A grey cat.

create the watchman
  a person, patrol with route [the Yard, the Shed] and loop true and wait-turns 1 and announces-movement true
  pronouns he
  in the Yard

  A watchman.
