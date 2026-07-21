/**
 * types.ts — extension vocabulary manifest shapes (ADR-215).
 *
 * Purpose: the static, declarative form in which a trusted platform
 * extension contributes vocabulary to the composable catalog. Manifests are
 * pure data — the analyzer merges a manifest's words only when its `use`
 * name is declared, and validates each adjective's `with`-fields against the
 * declared types. The platform-side trait mappings live in
 * @sharpee/story-loader (names-vs-mappings split), pinned together by the
 * manifest-conformance test there.
 *
 * Public interface: ExtensionManifest, ManifestAdjective, ManifestField.
 * Owner context: @sharpee/chord (language frontend; browser-safe — no
 * platform imports may ever appear in a manifest).
 */

/** One typed `with`-field an extension adjective accepts. */
export interface ManifestField {
  /** The field key as written in Chord (`skill-bonus`). */
  key: string;
  /** Required value kind, matching ConfigSetting's valueKind vocabulary. */
  valueKind: 'number' | 'string' | 'word' | 'name' | 'list';
}

/** One trait adjective an extension contributes (`combatant`, `weapon`). */
export interface ManifestAdjective {
  word: string;
  /** The typed `with`-fields the adjective accepts (closed set — unknown keys are load errors). */
  fields: ManifestField[];
}

/** A trusted extension's full vocabulary contribution (ADR-215). */
export interface ExtensionManifest {
  /** The `use` name (`combat`, `state-machines`); core manifests are named for diagnostics only. */
  name: string;
  /**
   * True for CORE vocabulary (the NPC library): always admitted, the
   * plugin auto-wires, and a `use <name>` line is a compile error — the
   * deliberate exception to one-`use`-per-extension (ADR-215 Q4).
   */
  core?: boolean;
  traitAdjectives: ManifestAdjective[];
}
