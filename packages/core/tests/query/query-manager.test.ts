/**
 * Query Manager Tests
 *
 * Tests the PC communication system (ADR-018):
 * query presentation, input processing, validation, cancellation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQueryManager, QueryManager } from '../../src/query/query-manager';
import { IPendingQuery, QuerySource, QueryType, IQueryHandler } from '../../src/query/types';

function makeQuery(overrides: Partial<IPendingQuery> = {}): IPendingQuery {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source: QuerySource.SYSTEM,
    type: QueryType.FREE_TEXT,
    messageId: 'test.prompt',
    context: {},
    allowInterruption: false,
    created: Date.now(),
    ...overrides
  };
}

describe('QueryManager', () => {
  let qm: QueryManager;

  beforeEach(() => {
    qm = createQueryManager();
  });

  describe('state management', () => {
    it('should start with no pending query', () => {
      expect(qm.hasPendingQuery()).toBe(false);
      expect(qm.getCurrentQuery()).toBeUndefined();
    });

    it('should track pending query after askQuery', () => {
      const query = makeQuery();
      qm.askQuery(query); // Don't await — just initiate

      expect(qm.hasPendingQuery()).toBe(true);
      expect(qm.getCurrentQuery()?.id).toBe(query.id);
    });

    it('should clear pending query after processInput', () => {
      const query = makeQuery();
      qm.askQuery(query);

      qm.processInput('hello');

      expect(qm.hasPendingQuery()).toBe(false);
    });
  });

  describe('processInput', () => {
    it('should return "pass" when no query is pending', () => {
      const result = qm.processInput('test');
      expect(result).toBe('pass');
    });

    it('should return "handled" when query is pending and input is valid', () => {
      qm.askQuery(makeQuery());

      const result = qm.processInput('my answer');
      expect(result).toBe('handled');
    });

    it('should resolve askQuery promise with response', async () => {
      const query = makeQuery();
      const responsePromise = qm.askQuery(query);

      qm.processInput('42');

      const response = await responsePromise;
      expect(response).not.toBeNull();
      expect(response!.rawInput).toBe('42');
      expect(response!.queryId).toBe(query.id);
    });

    it('should record query in history after answering', () => {
      qm.askQuery(makeQuery());
      qm.processInput('answer');

      const state = qm.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].result).toBe('answered');
    });
  });

  describe('validation', () => {
    it('should reject invalid input for multiple_choice queries', () => {
      const query = makeQuery({
        type: QueryType.MULTIPLE_CHOICE,
        options: ['red', 'blue', 'green']
      });
      qm.askQuery(query);

      const invalidSpy = vi.fn();
      qm.on('query:invalid', invalidSpy);

      const result = qm.processInput('purple');

      expect(result).toBe('handled');
      expect(invalidSpy).toHaveBeenCalled();
      // Query should still be pending (invalid input doesn't consume it)
      expect(qm.hasPendingQuery()).toBe(true);
    });

    it('should accept valid numeric selection for multiple_choice', async () => {
      const query = makeQuery({
        type: QueryType.MULTIPLE_CHOICE,
        options: ['red', 'blue', 'green']
      });
      const promise = qm.askQuery(query);

      qm.processInput('2'); // Select "blue" (1-indexed)

      const response = await promise;
      expect(response).not.toBeNull();
      expect(response!.selectedIndex).toBe(1); // 0-indexed
    });

    it('should accept valid text match for multiple_choice', async () => {
      const query = makeQuery({
        type: QueryType.MULTIPLE_CHOICE,
        options: ['red', 'blue', 'green']
      });
      const promise = qm.askQuery(query);

      qm.processInput('blue');

      const response = await promise;
      expect(response).not.toBeNull();
    });
  });

  describe('cancellation', () => {
    it('should cancel the current query', async () => {
      const query = makeQuery();
      const promise = qm.askQuery(query);

      qm.cancelCurrentQuery();

      const response = await promise;
      expect(response).toBeNull();
      expect(qm.hasPendingQuery()).toBe(false);
    });

    it('should record cancellation in history', () => {
      qm.askQuery(makeQuery());
      qm.cancelCurrentQuery();

      const state = qm.getState();
      expect(state.history).toHaveLength(1);
      expect(state.history[0].result).toBe('cancelled');
    });
  });

  describe('handler registration', () => {
    it('should route answered query to matching handler', async () => {
      const handleResponse = vi.fn();
      const handler: IQueryHandler = {
        canHandle: (q) => q.source === QuerySource.SYSTEM,
        handleResponse
      };
      qm.registerHandler('system-handler', handler);

      const query = makeQuery({ source: QuerySource.SYSTEM });
      const promise = qm.askQuery(query);
      qm.processInput('yes');
      await promise;

      expect(handleResponse).toHaveBeenCalledTimes(1);
      expect(handleResponse).toHaveBeenCalledWith(
        expect.objectContaining({ rawInput: 'yes' }),
        expect.objectContaining({ id: query.id })
      );
    });
  });

  describe('clearAll', () => {
    it('should cancel pending query and clear stack', async () => {
      const promise = qm.askQuery(makeQuery());
      qm.clearAll();

      const response = await promise;
      expect(response).toBeNull();
      expect(qm.hasPendingQuery()).toBe(false);
      expect(qm.getState().queryStack).toHaveLength(0);
    });
  });
});
