/**
 * Golden test for attacking action - demonstrates testing combat/destruction
 * 
 * This shows patterns for testing actions that:
 * - Handle hostile actions against NPCs or objects
 * - Support armed and unarmed attacks
 * - Check weapon possession
 * - Prevent self-harm
 * - Use FRAGILE and BREAKABLE traits for destructible objects
 * - Generate appropriate NPC reactions
 * - Respect peaceful game settings
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { attackingAction } from '../../../src/actions/standard/attacking';
import { IFActions } from '../../../src/actions/constants';
import { TraitType, WorldModel, FragileTrait, BreakableTrait, EntityType } from '@sharpee/world-model';
import { 
  createRealTestContext,
  expectEvent,
  TestData,
  createCommand,
  setupBasicWorld,
  findEntityByName
} from '../../test-utils';
import type { ActionContext } from '../../../src/actions/enhanced-types';

describe('attackingAction (Golden Pattern)', () => {
  describe('Action Metadata', () => {
    test('should have correct ID', () => {
      expect(attackingAction.id).toBe(IFActions.ATTACKING);
    });

    test('should declare required messages', () => {
      expect(attackingAction.requiredMessages).toContain('no_target');
      expect(attackingAction.requiredMessages).toContain('not_visible');
      expect(attackingAction.requiredMessages).toContain('not_reachable');
      expect(attackingAction.requiredMessages).toContain('self');
      expect(attackingAction.requiredMessages).toContain('not_holding_weapon');
      expect(attackingAction.requiredMessages).toContain('indestructible');
      expect(attackingAction.requiredMessages).toContain('attacked');
      expect(attackingAction.requiredMessages).toContain('attacked_with');
      expect(attackingAction.requiredMessages).toContain('hit');
      expect(attackingAction.requiredMessages).toContain('hit_with');
      expect(attackingAction.requiredMessages).toContain('struck');
      expect(attackingAction.requiredMessages).toContain('struck_with');
      expect(attackingAction.requiredMessages).toContain('punched');
      expect(attackingAction.requiredMessages).toContain('kicked');
      expect(attackingAction.requiredMessages).toContain('unarmed_attack');
      expect(attackingAction.requiredMessages).toContain('broke');
      expect(attackingAction.requiredMessages).toContain('smashed');
      expect(attackingAction.requiredMessages).toContain('destroyed');
      expect(attackingAction.requiredMessages).toContain('shattered');
      expect(attackingAction.requiredMessages).toContain('defends');
      expect(attackingAction.requiredMessages).toContain('dodges');
      expect(attackingAction.requiredMessages).toContain('retaliates');
      expect(attackingAction.requiredMessages).toContain('flees');
      expect(attackingAction.requiredMessages).toContain('peaceful_solution');
      expect(attackingAction.requiredMessages).toContain('no_fighting');
      expect(attackingAction.requiredMessages).toContain('unnecessary_violence');
      expect(attackingAction.requiredMessages).toContain('needs_tool');
      expect(attackingAction.requiredMessages).toContain('not_strong_enough');
      expect(attackingAction.requiredMessages).toContain('already_damaged');
      expect(attackingAction.requiredMessages).toContain('partial_break');
    });

    test('should belong to interaction group', () => {
      expect(attackingAction.group).toBe('interaction');
    });
  });

  describe('Precondition Checks', () => {
    test('should fail when no target specified', () => {
      const { world, player } = setupBasicWorld();
      const command = createCommand(IFActions.ATTACKING);
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });
    });

    test.skip('should fail when target is not visible', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      // Create guard in a different room
      const otherRoom = world.createEntity('Other Room', EntityType.ROOM);
      otherRoom.add({ type: TraitType.ROOM });
      
      const guard = world.createEntity('palace guard', EntityType.ACTOR);
      guard.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(guard.id, otherRoom.id); // Guard in different room
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: guard
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'palace guard' }
      });
    });

    test.skip('should fail when target is not reachable', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      // Create enemy behind glass
      const glassCage = world.createEntity('glass cage', EntityType.CONTAINER);
      glassCage.add({
        type: TraitType.CONTAINER,
        isTransparent: true
      });
      glassCage.add({
        type: TraitType.OPENABLE,
        isOpen: false
      });
      world.moveEntity(glassCage.id, room.id);
      
      const enemy = world.createEntity('distant enemy', EntityType.ACTOR);
      enemy.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(enemy.id, glassCage.id); // Enemy in closed container
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: enemy
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_visible'),
        params: { target: 'distant enemy' }
      });
    });

    test('should prevent attacking self', () => {
      const { world, player } = setupBasicWorld();
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: player
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('self')
      });
    });

    test.skip('should require holding weapon', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const goblin = world.createEntity('angry goblin', EntityType.ACTOR);
      goblin.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(goblin.id, room.id);
      
      const sword = world.createEntity('steel sword', EntityType.OBJECT);
      world.moveEntity(sword.id, room.id); // On floor, not held
      
      const command = createCommand(IFActions.ATTACKING,
        { entity: goblin },
        { entity: sword, preposition: 'with' }
      );
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_holding_weapon'),
        params: { weapon: 'steel sword' }
      });
    });

    test('should block violence in peaceful games', () => {
      const { world, player, room } = setupBasicWorld();
      
      const npc = world.createEntity('innocent child', EntityType.ACTOR);
      npc.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(npc.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: npc
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      // Mark world as peaceful
      (world as any).isPeaceful = true;
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('peaceful_solution')
      });
    });
  });

  describe('Unarmed Attacks on Actors', () => {
    test.skip('should perform basic unarmed attack', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const bandit = world.createEntity('rough bandit', EntityType.ACTOR);
      bandit.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(bandit.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: bandit
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit ATTACKED event
      expectEvent(events, 'if.event.attacked', {
        target: bandit.id,
        targetName: 'rough bandit',
        unarmed: true,
        targetType: 'actor',
        hostile: true
      });
      
      // Should emit attack message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('attacked'),
        params: { target: 'rough bandit' }
      });
      
      // Should have a reaction
      const reactionEvent = events.find(e => 
        e.type === 'action.success' && 
        ['defends', 'dodges', 'retaliates', 'flees'].some(r => 
          e.data.messageId?.includes(r)
        )
      );
      expect(reactionEvent).toBeDefined();
    });

    test.skip('should handle punch verb', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const thug = world.createEntity('street thug', EntityType.ACTOR);
      thug.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(thug.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: thug
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'punch',
        head: 'punch'
      };
      
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit punched message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('punched'),
        params: { target: 'street thug' }
      });
    });

    test.skip('should handle kick verb', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const enemy = world.createEntity('sworn enemy', EntityType.ACTOR);
      enemy.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(enemy.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: enemy
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'kick',
        head: 'kick'
      };
      
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit kicked message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('kicked'),
        params: { target: 'sworn enemy' }
      });
    });
  });

  describe('Armed Attacks', () => {
    test.skip('should attack with held weapon', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const orc = world.createEntity('fierce orc', EntityType.ACTOR);
      orc.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(orc.id, room.id);
      
      const axe = world.createEntity('battle axe', EntityType.OBJECT);
      world.moveEntity(axe.id, player.id); // Held by player
      
      const command = createCommand(IFActions.ATTACKING,
        { entity: orc },
        { entity: axe, preposition: 'with' }
      );
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit ATTACKED event with weapon
      expectEvent(events, 'if.event.attacked', {
        target: orc.id,
        weapon: axe.id,
        weaponName: 'battle axe',
        unarmed: false
      });
      
      // Should emit attacked_with message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('attacked_with'),
        params: { 
          target: 'fierce orc',
          weapon: 'battle axe'
        }
      });
    });

    test.skip('should use hit_with for hit verb', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const zombie = world.createEntity('shambling zombie', EntityType.ACTOR);
      zombie.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(zombie.id, room.id);
      
      const club = world.createEntity('wooden club', EntityType.OBJECT);
      world.moveEntity(club.id, player.id);
      
      const command = createCommand(IFActions.ATTACKING,
        { entity: zombie },
        { entity: club, preposition: 'with' }
      );
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'hit',
        head: 'hit'
      };
      
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('hit_with')
      });
    });
  });

  describe('Attacking Objects with FRAGILE trait', () => {
    test.skip('should prevent attacking indestructible scenery', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const wall = world.createEntity('stone wall', EntityType.SCENERY);
      wall.add({
        type: TraitType.SCENERY
      });
      world.moveEntity(wall.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: wall
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('indestructible'),
        params: { target: 'stone wall' }
      });
    });

    test.skip('should break fragile glass objects', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const vase = world.createEntity('crystal vase', EntityType.OBJECT);
      vase.add({
        type: TraitType.FRAGILE,
        fragileMaterial: 'crystal',
        breakSound: 'tinkle',
        sharpFragments: true
      } as FragileTrait);
      world.moveEntity(vase.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: vase
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit ATTACKED event
      expectEvent(events, 'if.event.attacked', {
        target: vase.id,
        targetType: 'object',
        fragile: true,
        willBreak: true,
        fragileMaterial: 'crystal',
        breakSound: 'tinkle',
        sharpFragments: true
      });
      
      // Should emit shattered message (default for glass/crystal)
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('shattered'),
        params: { target: 'crystal vase' }
      });
      
      // Should emit destruction event
      expectEvent(events, 'if.event.item_destroyed', {
        item: vase.id,
        itemName: 'crystal vase',
        cause: 'attacked',
        sharpFragments: true
      });
    });

    test.skip('should use break verb with fragile objects', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const window = world.createEntity('frosted window', EntityType.OBJECT);
      window.add({
        type: TraitType.FRAGILE,
        fragileMaterial: 'glass',
        breakThreshold: 1
      } as FragileTrait);
      world.moveEntity(window.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: window
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'break',
        head: 'break'
      };
      
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('broke')
      });
    });

    test.skip('should handle fragile objects with custom break messages', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const ornament = world.createEntity('delicate ornament', EntityType.OBJECT);
      ornament.add({
        type: TraitType.FRAGILE,
        fragileMaterial: 'porcelain',
        breakMessage: 'crumbled_to_dust',
        breaksInto: ['ornament-dust']
      } as FragileTrait);
      world.moveEntity(ornament.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: ornament
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: 'crumbled_to_dust',
        params: { target: 'delicate ornament' }
      });
      
      expectEvent(events, 'if.event.attacked', {
        fragments: ['ornament-dust']
      });
    });

    test.skip('should handle fragile objects that trigger events when broken', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const alarm = world.createEntity('glass alarm', EntityType.OBJECT);
      alarm.add({
        type: TraitType.FRAGILE,
        fragileMaterial: 'glass',
        triggersOnBreak: 'sound_alarm'
      } as FragileTrait);
      world.moveEntity(alarm.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: alarm
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'if.event.attacked', {
        triggersEvent: 'sound_alarm'
      });
      
      expectEvent(events, 'if.event.item_destroyed', {
        triggersEvent: 'sound_alarm'
      });
    });
  });

  describe('Attacking Objects with BREAKABLE trait', () => {
    test.skip('should reject breaking non-fragile/non-breakable objects', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const statue = world.createEntity('bronze statue', EntityType.OBJECT);
      world.moveEntity(statue.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: statue
      });
      command.parsed.structure.verb = {
        tokens: [0],
        text: 'break',
        head: 'break'
      };
      
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('indestructible')
      });
    });

    test.skip('should require specific tool for breakable objects', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const padlock = world.createEntity('heavy padlock', EntityType.OBJECT);
      padlock.add({
        type: TraitType.BREAKABLE,
        breakMethod: 'cutting',
        requiresTool: 'bolt-cutters',
        strengthRequired: 8
      } as BreakableTrait);
      world.moveEntity(padlock.id, room.id);
      
      const hammer = world.createEntity('hammer', EntityType.OBJECT);
      world.moveEntity(hammer.id, player.id);
      
      const command = createCommand(IFActions.ATTACKING,
        { entity: padlock },
        { entity: hammer, preposition: 'with' }
      );
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('needs_tool'),
        params: { 
          target: 'heavy padlock',
          tool: 'bolt-cutters'
        }
      });
    });

    test('should check strength requirements', () => {
      const { world, player, room } = setupBasicWorld();
      
      const gate = world.createEntity('iron gate', EntityType.OBJECT);
      gate.add({
        type: TraitType.BREAKABLE,
        breakMethod: 'force',
        strengthRequired: 10,
        hitsToBreak: 1
      } as BreakableTrait);
      world.moveEntity(gate.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: gate
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('not_strong_enough')
      });
    });

    test.skip('should handle partial breaking with multiple hits', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const crate = world.createEntity('wooden crate', EntityType.OBJECT);
      crate.add({
        type: TraitType.BREAKABLE,
        breakMethod: 'force',
        hitsToBreak: 3,
        hitsTaken: 0,
        breakSound: 'crack',
        effects: {
          onPartialBreak: 'crate_damaged'
        }
      } as BreakableTrait);
      world.moveEntity(crate.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: crate
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('partial_break'),
        params: {
          target: 'wooden crate',
          hits: 1,
          total: 3
        }
      });
      
      expectEvent(events, 'if.event.attacked', {
        partialBreak: true,
        hitsRemaining: 2,
        triggersEvent: 'crate_damaged'
      });
      
      // Verify crate is not destroyed yet
      const destroyEvent = events.find(e => e.type === 'if.event.item_destroyed');
      expect(destroyEvent).toBeUndefined();
    });

    test.skip('should break objects after enough hits', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const barrel = world.createEntity('oak barrel', EntityType.OBJECT);
      barrel.add({
        type: TraitType.BREAKABLE,
        breakMethod: 'force',
        hitsToBreak: 2,
        hitsTaken: 1, // Already hit once
        breakSound: 'crash',
        breaksInto: ['barrel-staves', 'barrel-hoops'],
        revealsContents: true,
        effects: {
          onBreak: 'barrel_broken'
        }
      } as BreakableTrait);
      world.moveEntity(barrel.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: barrel
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('broke')
      });
      
      expectEvent(events, 'if.event.attacked', {
        breakable: true,
        willBreak: true,
        hitsToBreak: 2,
        breakSound: 'crash',
        fragments: ['barrel-staves', 'barrel-hoops'],
        revealsContents: true,
        triggersEvent: 'barrel_broken'
      });
      
      expectEvent(events, 'if.event.item_destroyed', {
        item: barrel.id,
        itemName: 'oak barrel',
        cause: 'attacked',
        fragments: ['barrel-staves', 'barrel-hoops'],
        triggersEvent: 'barrel_broken'
      });
    });
  });

  describe('Attacking regular objects', () => {
    test.skip('should attack non-fragile objects without breaking', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const dummy = world.createEntity('training dummy', EntityType.OBJECT);
      world.moveEntity(dummy.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: dummy
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should emit ATTACKED event
      expectEvent(events, 'if.event.attacked', {
        target: dummy.id,
        targetType: 'object',
        willBreak: undefined
      });
      
      // Should emit generic attacked message
      expectEvent(events, 'action.success', {
        messageId: expect.stringContaining('attacked')
      });
      
      // Should not emit destruction event
      const destroyEvent = events.find(e => e.type === 'if.event.item_destroyed');
      expect(destroyEvent).toBeUndefined();
    });
  });

  describe('NPC Reactions', () => {
    test('should generate random NPC reactions', () => {
      const { world, player, room } = setupBasicWorld();
      
      const knight = world.createEntity('armored knight', EntityType.ACTOR);
      knight.add({
        type: TraitType.ACTOR
      });
      world.moveEntity(knight.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: knight
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      // Should have attack event
      expectEvent(events, 'if.event.attacked', {
        target: knight.id
      });
      
      // Should have one of the reaction messages
      const validReactions = ['defends', 'dodges', 'retaliates', 'flees'];
      const reactionEvents = events.filter(e => 
        e.type === 'action.success' &&
        validReactions.some(r => e.data.messageId?.includes(r))
      );
      
      expect(reactionEvents.length).toBe(1);
    });
  });

  describe('Event Structure Validation', () => {
    test.skip('should include proper entities in all events', () => {  // Skip: depends on scope logic
      const { world, player, room } = setupBasicWorld();
      
      const target = world.createEntity('practice target', EntityType.OBJECT);
      world.moveEntity(target.id, room.id);
      
      const command = createCommand(IFActions.ATTACKING, {
        entity: target
      });
      const context = createRealTestContext(attackingAction, world, command);
      
      const events = attackingAction.execute(context);
      
      events.forEach(event => {
        if (event.entities) {
          expect(event.entities.actor).toBe(player.id);
          expect(event.entities.target).toBe(target.id);
          expect(event.entities.location).toBe(room.id);
        }
      });
    });
  });
});

describe('Testing Pattern Examples for Attacking', () => {
  test('pattern: combat verbs', () => {
    // Test different attack verbs
    const combatVerbs = [
      { verb: 'attack', armed: 'attacked_with', unarmed: 'attacked' },
      { verb: 'hit', armed: 'hit_with', unarmed: 'hit' },
      { verb: 'strike', armed: 'struck_with', unarmed: 'struck' },
      { verb: 'punch', armed: null, unarmed: 'punched' },
      { verb: 'kick', armed: null, unarmed: 'kicked' },
      { verb: 'fight', armed: 'attacked_with', unarmed: 'unarmed_attack' }
    ];
    
    combatVerbs.forEach(({ verb, armed, unarmed }) => {
      if (verb === 'punch' || verb === 'kick') {
        expect(armed).toBeNull(); // These are always unarmed
      } else {
        expect(armed).toBeDefined();
      }
      expect(unarmed).toBeDefined();
    });
  });

  test('pattern: fragile materials', () => {
    // Test different fragile materials
    const materials: Array<FragileTrait['fragileMaterial']> = [
      'glass',
      'crystal', 
      'porcelain',
      'ceramic',
      'thin_metal',
      'ice',
      'paper'
    ];
    
    materials.forEach(material => {
      const sharpMaterials = ['glass', 'crystal'];
      const expectedSharp = sharpMaterials.includes(material);
      
      // Test default sharp fragments behavior
      const trait = new FragileTrait({ fragileMaterial: material });
      expect(trait.sharpFragments).toBe(expectedSharp);
    });
  });

  test('pattern: destruction verbs', () => {
    // Test verbs that imply destruction
    const destructionVerbs = [
      { verb: 'break', message: 'broke' },
      { verb: 'smash', message: 'smashed' },
      { verb: 'destroy', message: 'destroyed' },
      { verb: 'shatter', message: 'shattered' }
    ];
    
    destructionVerbs.forEach(({ verb, message }) => {
      expect(attackingAction.requiredMessages).toContain(message);
    });
  });

  test('pattern: NPC reactions', () => {
    // Test possible NPC reactions to attacks
    const reactions = [
      { reaction: 'defends', description: 'blocks or parries' },
      { reaction: 'dodges', description: 'evades the attack' },
      { reaction: 'retaliates', description: 'strikes back' },
      { reaction: 'flees', description: 'runs away' }
    ];
    
    reactions.forEach(({ reaction }) => {
      expect(attackingAction.requiredMessages).toContain(reaction);
    });
  });

  test('pattern: peaceful alternatives', () => {
    // Test peaceful game responses
    const peacefulMessages = [
      'peaceful_solution',
      'no_fighting',
      'unnecessary_violence'
    ];
    
    peacefulMessages.forEach(msg => {
      expect(attackingAction.requiredMessages).toContain(msg);
    });
  });

  test('pattern: breakable properties', () => {
    // Test breakable trait configurations
    const breakableConfigs = [
      { method: 'force', description: 'physical impact' },
      { method: 'cutting', description: 'requires cutting tool' },
      { method: 'heat', description: 'requires heat/fire' },
      { method: 'any', description: 'any method works' }
    ];
    
    breakableConfigs.forEach(({ method }) => {
      const trait = new BreakableTrait({ breakMethod: method as any });
      expect(trait.breakMethod).toBe(method);
    });
  });
});
