/**
 * compose-fix.ts — fill a chord diagnostic's fix from the story's language (ADR-409 D7.2).
 *
 * Chord attaches a fix to a refusal it knows how to clear, and where the fix
 * needs a word only the language knows (the singular of `houses`), it leaves a
 * form slot. Compose holds the story's language, so it fills the slot here,
 * from the language's own `numberForms`, before the fix reaches the wire. The
 * heads apply the text as written and work nothing out. A fix whose slot the
 * language cannot fill is dropped: an edit that leaves the marker in the
 * source would not compile, and a fix must leave a source that compiles
 * (ADR-409 AC-10).
 *
 * Public interface: fillFix(fix, language) → ComposeFix | undefined.
 * Owner context: @sharpee/devkit — the `sharpee compose` command.
 */
// Type-only at the top: the CLI imports compose eagerly and the compiler
// lazily (compose.ts), so the marker's value is required inside fillFix.
import type { DiagnosticFix } from '@sharpee/chord';
import type { NounExtractorResolution } from '@sharpee/if-domain/nouns';
import type { ComposeFix } from '@sharpee/ide-protocol';

/**
 * A chord fix with every form slot filled, ready for the wire.
 *
 * @param fix the fix chord attached to a diagnostic
 * @param language the story language's noun extractor, or why there is none
 * @returns the fix with each slot's marker replaced by the slot's form, in the
 *   edits and the label, and no slot left; undefined when a slot needs a
 *   language the story does not have
 */
export function fillFix(fix: DiagnosticFix, language: NounExtractorResolution): ComposeFix | undefined {
  const { FIX_FORM_MARKER } = require('@sharpee/chord') as typeof import('@sharpee/chord');
  const slotted = fix.edits.some((edit) => edit.slot !== undefined);
  if (slotted && !language.found) return undefined;
  let label = fix.label;
  const edits = fix.edits.map((edit) => {
    if (!edit.slot || !language.found) return { span: edit.span, text: edit.text };
    const form = language.extractor.numberForms(edit.slot.word)[edit.slot.want];
    // Chord's invariant: a slotted edit holds the marker once, and the label
    // holds one per slotted edit, in edit order.
    label = label.replace(FIX_FORM_MARKER, () => form);
    return { span: edit.span, text: edit.text.replace(FIX_FORM_MARKER, () => form) };
  });
  return { label, edits };
}
