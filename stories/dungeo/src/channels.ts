/**
 * Dungeo story-defined `IOChannel`s.
 *
 * Phase 4 of the channel-io-event-retirement plan: these channels
 * replace the `handleStoryEvent` event-listener bypass that previously
 * intercepted `dungeo.event.rname` / `dungeo.event.objects` raw events
 * and pushed them directly into the browser's text display.
 *
 * Each channel reads the corresponding raw event from the turn's event
 * stream and emits a plain text string. Browser-side renderers
 * (registered in `browser-entry.ts`) push the string to
 * `client.displayText`. The CLI bundle has no story-specific renderer
 * — it gets the JSON-tree fallback warning once per channel id, which
 * is fine: the CLI surface uses the canonical `look` / `inventory` /
 * etc. flow and never invokes the GDT-flavoured `RNAME` / `OBJECTS`
 * commands.
 *
 * Owner context: stories/dungeo (ADR-163 §6 — story-defined channels).
 */

import type { IOChannel, IChannelRegistry } from '@sharpee/if-domain';

/** Channel ids — exported so renderers and tests can match by string. */
export const DUNGEO_RNAME_CHANNEL_ID = 'dungeo.rname' as const;
export const DUNGEO_OBJECTS_CHANNEL_ID = 'dungeo.objects' as const;

/**
 * Shape of an object entry as emitted by the `OBJECTS` action.
 */
interface ObjectEntry {
  id?: string;
  name?: string;
}

/**
 * Shape of a container's contents as emitted by the `OBJECTS` action.
 */
interface ContainerContent {
  containerId?: string;
  containerName?: string;
  preposition?: 'in' | 'on' | string;
  items?: ObjectEntry[];
}

/**
 * Format the `dungeo.event.objects` payload into the multi-line
 * string the original `handleStoryEvent` callback produced. Pure
 * function — no DOM dependency, so renderers in any host can reuse
 * it.
 */
export function formatDungeoObjects(data: Record<string, unknown> | undefined): string {
  const hasItems = data?.hasItems as boolean | undefined;
  const items = data?.items as ObjectEntry[] | undefined;
  const containerContents = data?.containerContents as ContainerContent[] | undefined;

  if (!hasItems || !items || items.length === 0) {
    return 'There is nothing here.';
  }

  const lines: string[] = [];
  for (const item of items) {
    if (typeof item.name === 'string') {
      lines.push(`There is a ${item.name} here.`);
    }
  }

  if (containerContents) {
    for (const container of containerContents) {
      const containerName = container.containerName;
      if (typeof containerName !== 'string') continue;
      const itemNames = (container.items ?? [])
        .map((i) => i.name)
        .filter((n): n is string => typeof n === 'string')
        .join(', ');
      const prep = container.preposition === 'in' ? 'In' : 'On';
      lines.push(`${prep} the ${containerName}: ${itemNames}`);
    }
  }

  return lines.join('\n');
}

/**
 * `dungeo.rname` channel — emits the current room's display name when
 * the player runs `RNAME`.
 */
export const rnameChannel: IOChannel<string> = {
  id: DUNGEO_RNAME_CHANNEL_ID,
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type !== 'dungeo.event.rname') continue;
      const data = event.data as { roomName?: unknown } | undefined;
      if (typeof data?.roomName === 'string') return data.roomName;
      return 'Unknown';
    }
    return undefined;
  },
};

/**
 * `dungeo.objects` channel — emits a formatted object listing when
 * the player runs `OBJECTS`.
 */
export const objectsChannel: IOChannel<string> = {
  id: DUNGEO_OBJECTS_CHANNEL_ID,
  contentType: 'text',
  mode: 'event',
  emit: 'sparse',
  produce: (ctx) => {
    for (const event of ctx.events) {
      if (event.type !== 'dungeo.event.objects') continue;
      return formatDungeoObjects(event.data as Record<string, unknown> | undefined);
    }
    return undefined;
  },
};

/**
 * `Story.registerChannels` helper — registers both story-defined
 * channels on the shared registry. Called by `DungeoStory.registerChannels`
 * during engine bootstrap.
 */
export function registerStoryEventChannels(registry: IChannelRegistry): void {
  registry.add(rnameChannel);
  registry.add(objectsChannel);
}
