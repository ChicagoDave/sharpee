import type {
  Choice,
  Literal,
  Optional,
} from '@sharpee/if-domain';
import { OpenableBehavior } from '@sharpee/world-model';

const lit = (text: string): Literal =>
  ({ kind: 'literal', text });

const openClause: Optional = {
  kind: 'optional',
  child: lit(', standing wide open'),
  present: OpenableBehavior.isOpen(gate),
};

context.event('game.message', {
  messageId: ZooMessages.GATE_STATUS,
  params: { openClause },
});
