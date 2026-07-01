if (!hasCapabilityBehavior(PettableTrait.type, PETTING_ACTION_ID)) {
  registerCapabilityBehavior(
    PettableTrait.type,     // which trait
    PETTING_ACTION_ID,      // which capability
    pettingBehavior,        // which behavior
  );
}
