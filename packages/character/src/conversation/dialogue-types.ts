/**
 * Dialogue extension types — character-model bindings (ADR-102 / ADR-142)
 *
 * The `DialogueExtension` and `DialogueResult` contracts moved to
 * `@sharpee/if-domain` (ADR-310 D19a) so that stdlib — the consumer —
 * need not depend on this package to know the shape of its own
 * extension point. This module binds the generic contract to the
 * character model's `ResponseIntent` and re-exports it, so nothing
 * inside this package spells the type parameter.
 *
 * Public interface: CharacterDialogueExtension, CharacterDialogueResult;
 *   DialogueExtension and DialogueResult re-exported from if-domain.
 * Owner context: @sharpee/character / conversation
 */

import type { DialogueExtension, DialogueResult } from '@sharpee/if-domain';
import { ResponseIntent } from './response-types.js';

export type { DialogueExtension, DialogueResult };

/**
 * A dialogue result carrying the character model's structured response
 * intent — mood, coherence, topic and the chosen response action.
 */
export type CharacterDialogueResult = DialogueResult<ResponseIntent>;

/**
 * The dialogue extension contract as this package implements it.
 * `CharacterModelDialogue` satisfies this type.
 */
export type CharacterDialogueExtension = DialogueExtension<ResponseIntent>;
