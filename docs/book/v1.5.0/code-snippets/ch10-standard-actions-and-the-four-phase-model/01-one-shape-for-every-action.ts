const someAction: Action = {
  id: 'if.action.taking',

  validate(context): ValidationResult { /* can this happen? */ },
  execute(context): void           { /* change the world */ },
  report(context): ISemanticEvent[]  { /* record what happened */ },
  blocked(context, result): ISemanticEvent[] { /* explain the refusal */ },
};
