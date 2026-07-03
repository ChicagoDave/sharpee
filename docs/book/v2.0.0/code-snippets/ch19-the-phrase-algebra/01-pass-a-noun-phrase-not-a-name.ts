import { nounPhraseFor } from '@sharpee/stdlib';

context.event('game.message', {
  messageId: ZooMessages.ADMIRED,
  params: { animal: nounPhraseFor(animal) },
});
