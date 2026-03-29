/**
 * Tests for ActionMenuComputer (ADR-136)
 *
 * Two APIs:
 * - compute(): player-facing menu — baseline (directions + intransitives) + author hints
 * - computeAll(): full grammar palette for the editor
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ActionMenuComputer } from '../src/action-menu-computer';
import type { CompiledActionOverrides } from '../src/action-menu-computer';
import type { GrammarRule } from '@sharpee/if-domain';
import type { ActionMenuConfig } from '@sharpee/if-domain';
import { SlotType } from '@sharpee/if-domain';
import {
  WorldModel,
  TraitType,
  IdentityTrait,
  RoomTrait,
  OpenableTrait,
} from '@sharpee/world-model';
import { StandardScopeResolver } from '@sharpee/stdlib';

// ─── Test Helpers ───────────────────────────────────────────────

function makeRule(opts: {
  pattern: string;
  action: string;
  traitFilters?: Record<string, string[]>;
  priority?: number;
}): GrammarRule {
  const tokens = opts.pattern.split(' ').map(t => {
    if (t.startsWith(':')) return { type: 'slot' as const, value: t.slice(1) };
    return { type: 'literal' as const, value: t };
  });

  const slots = new Map<string, any>();
  for (const token of tokens) {
    if (token.type === 'slot') {
      slots.set(token.value, {
        name: token.value,
        constraints: [],
        traitFilters: opts.traitFilters?.[token.value] || [],
        slotType: SlotType.ENTITY,
      });
    }
  }

  return {
    id: `rule_${opts.action}_${opts.pattern.replace(/\s/g, '_')}`,
    pattern: opts.pattern,
    compiledPattern: {
      tokens,
      slots: new Map(tokens
        .filter(t => t.type === 'slot')
        .map((t) => [t.value, tokens.indexOf(t)])),
      minTokens: tokens.length,
      maxTokens: tokens.length,
    },
    slots,
    action: opts.action,
    priority: opts.priority ?? 100,
  } as GrammarRule;
}

function setupWorld() {
  const world = new WorldModel();

  const room = world.createEntity('Test Room', 'room');
  room.add(new IdentityTrait({ name: 'Test Room' }));
  room.add(new RoomTrait({
    exits: {
      north: { destination: 'other-room' },
      south: { destination: 'garden' },
    },
  }));

  const player = world.createEntity('player', 'actor');
  player.add(new IdentityTrait({ name: 'player' }));
  world.moveEntity(player.id, room.id);
  world.setPlayer(player.id);

  const lamp = world.createEntity('lamp', 'object');
  lamp.add(new IdentityTrait({ name: 'brass lantern' }));
  world.moveEntity(lamp.id, room.id);

  const chest = world.createEntity('chest', 'object');
  chest.add(new IdentityTrait({ name: 'wooden chest' }));
  chest.add(new OpenableTrait({ isOpen: false }));
  world.moveEntity(chest.id, room.id);

  const scopeResolver = new StandardScopeResolver(world);
  return { world, room, player, lamp, chest, scopeResolver };
}

const TAKE_RULE = makeRule({ pattern: 'take :target', action: 'if.action.taking' });
const GET_RULE = makeRule({ pattern: 'get :target', action: 'if.action.taking' });
const EXAMINE_RULE = makeRule({ pattern: 'examine :target', action: 'if.action.examining' });
const OPEN_RULE = makeRule({
  pattern: 'open :target', action: 'if.action.opening',
  traitFilters: { target: [TraitType.OPENABLE] },
});
const LOOK_RULE = makeRule({ pattern: 'look', action: 'if.action.looking' });
const INVENTORY_RULE = makeRule({ pattern: 'inventory', action: 'if.action.inventory' });
const WAIT_RULE = makeRule({ pattern: 'wait', action: 'if.action.waiting' });

const ALL_RULES = [TAKE_RULE, GET_RULE, EXAMINE_RULE, OPEN_RULE, LOOK_RULE, INVENTORY_RULE, WAIT_RULE];

// ─── Tests ──────────────────────────────────────────────────────

describe('ActionMenuComputer', () => {
  let computer: ActionMenuComputer;

  beforeEach(() => {
    computer = new ActionMenuComputer();
  });

  describe('compute() — player-facing menu', () => {
    it('returns directions and intransitives only (no entity actions)', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.compute(world, player.id, ALL_RULES, scopeResolver);

      const movements = actions.filter(a => a.category === 'movement');
      expect(movements.length).toBe(2);
      expect(movements.map(a => a.command).sort()).toEqual(['north', 'south']);

      const intransitives = actions.filter(a =>
        ['if.action.looking', 'if.action.inventory', 'if.action.waiting'].includes(a.actionId),
      );
      expect(intransitives.length).toBe(3);

      // No entity-targeted actions in baseline
      const entityActions = actions.filter(a => a.targetId);
      expect(entityActions.length).toBe(0);
    });

    it('includes author hints as entity actions', () => {
      const { world, player, lamp, scopeResolver } = setupWorld();
      const overrides: CompiledActionOverrides = {
        suppressions: [],
        hints: [{
          command: 'take brass lantern',
          actionId: 'if.action.taking',
          label: 'Pick up the lantern',
          targetId: lamp.id,
          priority: 150,
        }],
      };

      const actions = computer.compute(
        world, player.id, ALL_RULES, scopeResolver, undefined, overrides,
      );

      const hint = actions.find(a => a.targetId === lamp.id);
      expect(hint).toBeDefined();
      expect(hint!.label).toBe('Pick up the lantern');
      expect(hint!.auto).toBe(false);
    });

    it('suppresses baseline actions', () => {
      const { world, player, scopeResolver } = setupWorld();
      const overrides: CompiledActionOverrides = {
        suppressions: [{ actionId: 'if.action.waiting' }],
        hints: [],
      };

      const actions = computer.compute(
        world, player.id, ALL_RULES, scopeResolver, undefined, overrides,
      );

      expect(actions.find(a => a.actionId === 'if.action.waiting')).toBeUndefined();
    });

    it('respects maxActions cap', () => {
      const { world, player, scopeResolver } = setupWorld();
      const config: ActionMenuConfig = { maxActions: 3, intransitives: ['look'] };

      const actions = computer.compute(world, player.id, ALL_RULES, scopeResolver, config);
      expect(actions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('computeAll() — grammar palette', () => {
    it('includes all entity-targeted actions', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.computeAll(world, player.id, ALL_RULES, scopeResolver);

      const examines = actions.filter(a => a.actionId === 'if.action.examining');
      expect(examines.length).toBe(2); // lamp + chest

      const takes = actions.filter(a => a.actionId === 'if.action.taking');
      expect(takes.length).toBe(2);
    });

    it('respects trait filters', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.computeAll(world, player.id, ALL_RULES, scopeResolver);

      const opens = actions.filter(a => a.actionId === 'if.action.opening');
      expect(opens.length).toBe(1);
      expect(opens[0].targetName).toBe('wooden chest');
    });

    it('deduplicates aliases (take/get)', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.computeAll(world, player.id, ALL_RULES, scopeResolver);

      const takingLamp = actions.filter(
        a => a.actionId === 'if.action.taking' && a.targetName === 'brass lantern',
      );
      expect(takingLamp.length).toBe(1);
    });

    it('includes directions and intransitives too', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.computeAll(world, player.id, ALL_RULES, scopeResolver);

      expect(actions.filter(a => a.category === 'movement').length).toBe(2);
      expect(actions.find(a => a.actionId === 'if.action.looking')).toBeDefined();
    });
  });

  describe('directions', () => {
    it('produces direction actions from room exits', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.compute(world, player.id, [], scopeResolver);

      expect(actions.filter(a => a.category === 'movement').length).toBe(2);
      expect(actions.some(a => a.command === 'north')).toBe(true);
      expect(actions.some(a => a.command === 'south')).toBe(true);
    });
  });

  describe('sorting', () => {
    it('sorts by category order then priority', () => {
      const { world, player, scopeResolver } = setupWorld();
      const actions = computer.compute(world, player.id, ALL_RULES, scopeResolver);

      const categories = actions.map(a => a.category);
      const firstMovement = categories.indexOf('movement');
      const firstMeta = categories.indexOf('meta');

      if (firstMovement !== -1 && firstMeta !== -1) {
        expect(firstMovement).toBeLessThan(firstMeta);
      }
    });
  });

  describe('empty world', () => {
    it('returns only directions and intransitives for empty room', () => {
      const world = new WorldModel();
      const room = world.createEntity('room', 'room');
      room.add(new IdentityTrait({ name: 'Empty Room' }));
      room.add(new RoomTrait({ exits: { north: { destination: 'other' } } }));

      const player = world.createEntity('player', 'actor');
      player.add(new IdentityTrait({ name: 'player' }));
      world.moveEntity(player.id, room.id);
      world.setPlayer(player.id);

      const scopeResolver = new StandardScopeResolver(world);
      const actions = computer.compute(world, player.id, ALL_RULES, scopeResolver);

      // 1 direction + 3 intransitives
      expect(actions.length).toBe(4);
    });
  });
});
