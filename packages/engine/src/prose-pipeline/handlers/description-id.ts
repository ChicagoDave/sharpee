/**
 * Description id resolution (ADR-107 id mode, ADR-333 D1a).
 *
 * An entity may carry a message id in place of literal description text
 * (`IdentityTrait.descriptionId`, `RoomTrait.initialDescriptionId`). The
 * description handlers resolve that id here, and the stamp helper marks
 * the blocks they realize with the id so a consumer can open the author's
 * phrase (ADR-333 D1a: the entity's key overrides the platform template id
 * `renderViaPhrase` would otherwise stamp).
 *
 * Resolution reads the RAW template, never the substituted message: a
 * description is author prose bound verbatim, and the substituted path
 * conjugates any single braced word it does not recognise, which would
 * mangle a hatch marker such as `{trapdoor}`. The raw template is byte for
 * byte the text the literal path binds, so id mode is lossless.
 *
 * Public interface: `resolveDescriptionId`, `stampDescriptionSource`.
 *
 * Owner context: `@sharpee/engine` — internal prose pipeline.
 */

import type { ITextBlock } from '@sharpee/text-blocks';
import type { LanguageProvider } from '@sharpee/if-domain';

/**
 * Resolve a description id to its registered text.
 *
 * @param languageProvider the provider the id was registered with
 * @param descriptionId the id, or undefined when the entity carries none
 * @returns the raw registered template; on a provider without `getTemplate`
 *   the substituted message; undefined when the id is absent or unregistered
 */
export function resolveDescriptionId(
  languageProvider: LanguageProvider | undefined,
  descriptionId: string | undefined,
): string | undefined {
  if (!descriptionId || !languageProvider) return undefined;
  if (typeof languageProvider.getTemplate === 'function') {
    return languageProvider.getTemplate(descriptionId);
  }
  const resolved = languageProvider.getMessage(descriptionId, {});
  return resolved && resolved !== descriptionId ? resolved : undefined;
}

/**
 * Stamp realized description blocks with the entity's description id
 * (ADR-333 D1a), replacing the template id `renderViaPhrase` stamped.
 *
 * @param blocks the blocks a description handler realized
 * @param descriptionId the id the text was resolved from; no-op when absent
 * @returns the same blocks, each carrying `source.messageId === descriptionId`
 */
export function stampDescriptionSource(blocks: ITextBlock[], descriptionId: string | undefined): ITextBlock[] {
  if (!descriptionId) return blocks;
  return blocks.map((b) => ({ ...b, source: { messageId: descriptionId } }));
}
