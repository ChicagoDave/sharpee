/**
 * chord-data-trait.ts — the runtime instance of a `define trait`.
 *
 * A `define trait` composed on an entity becomes one `ChordDataTrait` typed
 * `chord.trait.<name>`, whose data fields are own enumerable properties:
 * `set` writes them by name, the world serializer carries them with the
 * entity, and the dispatch runtime finds the field by `in`. Its own module
 * so the entity builder and the dispatch-verb runtime both import it
 * without either importing the other.
 *
 * Public interface: ChordDataTrait.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 */
import type { ITrait } from '@sharpee/world-model';

export class ChordDataTrait implements ITrait {
  readonly type: string;
  [field: string]: unknown;

  constructor(type: string, values: Record<string, unknown>) {
    this.type = type;
    Object.assign(this, values);
  }
}
