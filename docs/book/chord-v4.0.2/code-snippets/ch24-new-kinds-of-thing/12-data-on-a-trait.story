define trait burner
  data
    fuel: one of tallow, oil
    keeper: optional entity

  on the player stoking
    phrase fuel-tallow when its fuel is tallow
    phrase fuel-oil when its fuel is oil
  end on
end trait
