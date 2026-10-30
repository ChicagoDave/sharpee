/**
 * Language content for platform events (save/restore/undo lifecycle).
 *
 * The engine's prose pipeline renders a `platform.*` event by looking up a
 * message registered under the event type itself (the event type IS the
 * messageId) and binding params from the event payload. Only events with a
 * registered message produce text — request-phase events (save_requested,
 * quit_requested, ...) and quit/restart outcomes stay silent by default.
 *
 * Stories override any of these by registering the same id:
 * `language.addMessage('platform.undo_completed', ...)`.
 *
 * Public interface: `platformLanguage`. Owner context: lang-en-us
 * (user-facing text for engine platform operations).
 */

export const platformLanguage = {
  messages: {
    // Save / restore outcomes
    'platform.save_completed': 'Saved.',
    'platform.save_failed': 'Save failed.',
    'platform.restore_completed': 'Restored.',
    'platform.restore_failed': 'Restore failed.',

    // Undo outcomes
    'platform.undo_completed': 'Previous turn undone.',
    'platform.undo_failed': 'Nothing to undo.',

    // ADR-388 D5: the one line a player sees when a restore reconciled a
    // save against an updated story and some progress could not be carried
    // over. Never names a key; the author's report rides the diagnostics
    // channel.
    'core.save_reconciled': 'This story has been updated since that game was saved, and some of your progress could not be carried over.',
  }
};
