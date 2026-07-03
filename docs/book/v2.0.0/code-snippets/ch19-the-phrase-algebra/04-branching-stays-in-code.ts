const parrotLine: Choice = {
  kind: 'choice',
  selector: 'cycling',
  alternatives: [
    lit('The parrot whistles a jaunty tune.'),
    lit('The parrot rasps, "Pretty bird! Pretty bird!"'),
    lit('The parrot preens one wing, ignoring you.'),
  ],
  entityId: parrot.id,
  messageKey: 'parrot-flavor',
};
