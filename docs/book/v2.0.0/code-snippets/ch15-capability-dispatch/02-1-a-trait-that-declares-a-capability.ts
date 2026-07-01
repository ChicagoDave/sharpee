class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable' as const;
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;

  readonly animalKind: 'goats' | 'rabbits' | 'parrot' | 'snake';
  constructor(kind: 'goats' | 'rabbits' | 'parrot' | 'snake') {
    this.animalKind = kind;
  }
}
