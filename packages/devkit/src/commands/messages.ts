/**
 * messages.ts — `sharpee messages`: emit the overridable platform message
 * catalog (ADR-333 D4a) as JSON.
 *
 * Joins the ADR-255 alias map (`@sharpee/story-loader`, alias → dotted id)
 * with the language pack's registered templates (`@sharpee/lang-en-us`) and
 * writes an `@sharpee/ide-protocol` `MessageCatalog` to stdout. Status goes
 * to stderr so stdout carries only the catalog for the IDE.
 *
 * Public interface: buildMessageCatalog(), runMessages().
 * Owner context: @sharpee/devkit — the standalone `sharpee` CLI.
 */
import type { MessageCatalog, MessageCatalogEntry } from '@sharpee/ide-protocol';
import { MESSAGE_CATALOG_SCHEMA_VERSION } from '@sharpee/ide-protocol';

/**
 * Build the catalog from the live alias map and the live language pack.
 *
 * @returns every alias with its id and the pack's raw template, sorted by id
 * @throws when an alias maps to an id the pack does not register — the
 *   ADR-255 D5 bijection is broken and the catalog would lie to the IDE
 */
export function buildMessageCatalog(): MessageCatalog {
  // Lazy requires: the CLI's other commands never pay for the pack or the loader.
  const { MESSAGE_ALIAS_TO_ACTION_ID } = require('@sharpee/story-loader') as typeof import('@sharpee/story-loader');
  const { LanguageProvider } = require('@sharpee/lang-en-us') as {
    LanguageProvider: new () => { languageCode: string; getTemplate(id: string): string | undefined };
  };
  const pack = new LanguageProvider();

  const messages: MessageCatalogEntry[] = [];
  for (const [alias, id] of Object.entries(MESSAGE_ALIAS_TO_ACTION_ID)) {
    const template = pack.getTemplate(id);
    if (template === undefined) {
      throw new Error(`message alias '${alias}' names '${id}', which the ${pack.languageCode} pack does not register`);
    }
    messages.push({ id, alias, template });
  }
  messages.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return { schemaVersion: MESSAGE_CATALOG_SCHEMA_VERSION, locale: pack.languageCode, messages };
}

/**
 * Emit the catalog to stdout as JSON.
 */
export async function runMessages(): Promise<void> {
  const catalog = buildMessageCatalog();
  console.error(`Message catalog: ${catalog.messages.length} overridable messages (${catalog.locale})`);
  process.stdout.write(JSON.stringify(catalog) + '\n');
}
