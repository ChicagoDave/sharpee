/**
 * story-ir.ts — re-export of the Chord Story IR schema.
 *
 * The IR wire types' single source of truth is `@sharpee/chord` (ADR-210
 * Interface Contract 1, owner-confirmed 2026-07-10); this module publishes
 * them beside the ADR-184 manifest types so IDE/tooling consumers get both
 * contracts from one package. No re-declaration — a schema change in chord
 * compiles or fails here in the same commit (DEVARCH 8b).
 *
 * @packageDocumentation
 * @see ADR-210: Chord story language
 */

export type {
  StoryIR,
  IRMeta,
  IREntity,
  IRComposition,
  IRConfigSetting,
  IRPlacement,
  IRExit,
  IRBlockedExit,
  IROnClause,
  IRTopicRow,
  IRChannelDef,
  IRDataChannelDef,
  IRFamilyChannelDef,
  IRPhrases,
  IRPhrase,
  IRPhraseVariant,
  IRNamedCondition,
  IRVerbDef,
  IRPatternPart,
  IRHatch,
  IRStatement,
  IRSelectArm,
  IRParam,
  IRValue,
  IRCondition,
} from '@sharpee/chord';

export { IR_FORMAT } from '@sharpee/chord';
