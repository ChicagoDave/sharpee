/**
 * Story installation as an explicit step list: the contract, the runner,
 * the list, and the two load-time validators consumers call directly.
 *
 * Public interface: everything re-exported below.
 * Owner context: `@sharpee/engine` — story installation.
 *
 * References: ADR-334 A1.
 */

export type { InstallStep, InstallContext, StoryInstallDraft, StoryInstallResult, StoryMetadata } from './context.js';
export { runInstallSteps } from './runner.js';
export { STORY_INSTALL_STEPS } from './steps.js';
export { configureLanguageProviderNarrative } from './narrative-language.js';
export { validateRoomSnippets, lintUnusedSnippetEntries, SnippetValidationError } from './validate-room-snippets.js';
export { validateCombatantHealth, CombatantHealthValidationError } from './validate-combatant-health.js';
