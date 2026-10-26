/**
 * Tests for `handleClientQuery`: a clarification query renders the language's
 * seat question from its message id and bindings (ADR-387 D3); the handler
 * holds no sentence of its own.
 */

import { describe, it, expect } from 'vitest';
import { handleClientQuery } from '../../../src/prose-pipeline/handlers/client-query';
import { makeEvent, makeProvider, makeContext } from '../test-helpers';

const textOf = (blocks: ReturnType<typeof handleClientQuery>) =>
  blocks.map((b) => b.content.map((c) => (typeof c === 'string' ? c : 'text' in c ? c.text : '')).join('')).join('\n');

describe('handleClientQuery', () => {
  const provider = makeProvider({ 'parser.error.missingIndirect': '{Verb} it where?' });

  it('renders a clarification through the provider with the query\'s bindings', () => {
    const event = makeEvent('client.query', {
      source: 'clarification',
      messageId: 'parser.error.missingIndirect',
      params: { Verb: 'Unlock', verb: 'unlock' },
    });
    expect(textOf(handleClientQuery(event, makeContext(provider)))).toBe('Unlock it where?');
  });

  it('renders nothing for a clarification that names no message', () => {
    const event = makeEvent('client.query', { source: 'clarification', params: { verb: 'unlock' } });
    expect(handleClientQuery(event, makeContext(provider))).toEqual([]);
  });

  it('echoes the id when there is no provider to word it', () => {
    const event = makeEvent('client.query', { source: 'clarification', messageId: 'parser.error.missingObject', params: { verb: 'take' } });
    expect(textOf(handleClientQuery(event, { languageProvider: undefined }))).toBe('parser.error.missingObject');
  });
});
