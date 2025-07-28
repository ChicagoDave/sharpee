// packages/world-model/tests/unit/traits/exit.test.ts

import { IFEntity } from '../../../src/entities/if-entity';
import { ExitTrait } from '../../../src/traits/exit/exitTrait';
import { TraitType } from '../../../src/traits/trait-types';

describe('ExitTrait', () => {
  describe('initialization', () => {
    it('should create trait with required values', () => {
      const trait = new ExitTrait({
        from: 'room1',
        to: 'room2',
        command: 'go north'
      });
      
      expect(trait.type).toBe(TraitType.EXIT);
      expect(trait.from).toBe('room1');
      expect(trait.to).toBe('room2');
      expect(trait.command).toBe('go north');
      expect(trait.visible).toBe(true);
      expect(trait.listed).toBe(true);
      expect(trait.bidirectional).toBe(false);
      expect(trait.conditional).toBe(false);
    });

    it('should throw error if required fields are missing', () => {
      expect(() => new ExitTrait({} as any)).toThrow();
      expect(() => new ExitTrait({ from: 'room1' } as any)).toThrow();
      expect(() => new ExitTrait({ from: 'room1', to: 'room2' } as any)).toThrow();
    });

    it('should create trait with all optional values', () => {
      const trait = new ExitTrait({
        from: 'library',
        to: 'secret-room',
        command: 'pull book',
        direction: 'north',
        aliases: ['yank book', 'move book'],
        visible: false,
        listed: false,
        bidirectional: true,
        reverseCommand: 'push wall',
        reverseDirection: 'south',
        useMessage: 'You pull the book and a section of the wall swings open.',
        blockedMessage: 'The mechanism seems to be jammed.',
        conditional: true,
        conditionId: 'knows-secret'
      });
      
      expect(trait.direction).toBe('north');
      expect(trait.aliases).toEqual(['yank book', 'move book']);
      expect(trait.visible).toBe(false);
      expect(trait.listed).toBe(false);
      expect(trait.bidirectional).toBe(true);
      expect(trait.reverseCommand).toBe('push wall');
      expect(trait.reverseDirection).toBe('south');
      expect(trait.useMessage).toContain('wall swings open');
      expect(trait.blockedMessage).toContain('jammed');
      expect(trait.conditional).toBe(true);
      expect(trait.conditionId).toBe('knows-secret');
    });
  });

  describe('standard directional exits', () => {
    const directions = ['north', 'south', 'east', 'west', 'up', 'down', 'in', 'out'];
    
    directions.forEach(dir => {
      it(`should handle ${dir} direction`, () => {
        const trait = new ExitTrait({
          from: 'room1',
          to: 'room2',
          command: `go ${dir}`,
          direction: dir
        });
        
        expect(trait.direction).toBe(dir);
        expect(trait.command).toBe(`go ${dir}`);
      });
    });

    it('should handle diagonal directions', () => {
      const diagonals = ['northeast', 'northwest', 'southeast', 'southwest'];
      
      diagonals.forEach(dir => {
        const trait = new ExitTrait({
          from: 'crossroads',
          to: `path-${dir}`,
          command: dir,
          direction: dir
        });
        
        expect(trait.direction).toBe(dir);
      });
    });
  });

  describe('custom exits', () => {
    it('should handle magic words', () => {
      const trait = new ExitTrait({
        from: 'cave',
        to: 'treasure-room',
        command: 'xyzzy',
        aliases: ['plugh', 'plover']
      });
      
      expect(trait.command).toBe('xyzzy');
      expect(trait.aliases).toContain('plugh');
      expect(trait.direction).toBeUndefined();
    });

    it('should handle action-based exits', () => {
      const trait = new ExitTrait({
        from: 'cliff',
        to: 'beach',
        command: 'jump',
        useMessage: 'You take a running leap off the cliff and splash into the water below!'
      });
      
      expect(trait.command).toBe('jump');
      expect(trait.useMessage).toContain('splash into the water');
    });

    it('should handle object-interaction exits', () => {
      const trait = new ExitTrait({
        from: 'throne-room',
        to: 'secret-passage',
        command: 'sit throne',
        aliases: ['sit on throne', 'use throne'],
        useMessage: 'As you sit on the throne, it slowly sinks into the floor, revealing a hidden passage.'
      });
      
      expect(trait.command).toBe('sit throne');
      expect(trait.aliases).toContain('use throne');
    });
  });

  describe('bidirectional exits', () => {
    it('should handle simple bidirectional exit', () => {
      const trait = new ExitTrait({
        from: 'room1',
        to: 'room2',
        command: 'go north',
        direction: 'north',
        bidirectional: true,
        reverseCommand: 'go south',
        reverseDirection: 'south'
      });
      
      expect(trait.bidirectional).toBe(true);
      expect(trait.reverseCommand).toBe('go south');
      expect(trait.reverseDirection).toBe('south');
    });

    it('should handle bidirectional portal', () => {
      const trait = new ExitTrait({
        from: 'lab',
        to: 'dimension-x',
        command: 'enter portal',
        bidirectional: true,
        reverseCommand: 'enter portal',
        useMessage: 'You step through the shimmering portal.',
        aliases: ['go portal', 'use portal']
      });
      
      expect(trait.bidirectional).toBe(true);
      expect(trait.reverseCommand).toBe('enter portal');
      expect(trait.aliases).toContain('use portal');
    });
  });

  describe('visibility and listing', () => {
    it('should handle hidden exits', () => {
      const trait = new ExitTrait({
        from: 'study',
        to: 'vault',
        command: 'press button',
        visible: false,
        listed: false
      });
      
      expect(trait.visible).toBe(false);
      expect(trait.listed).toBe(false);
    });

    it('should handle visible but unlisted exits', () => {
      const trait = new ExitTrait({
        from: 'garden',
        to: 'shed',
        command: 'enter shed',
        visible: true,
        listed: false
      });
      
      expect(trait.visible).toBe(true);
      expect(trait.listed).toBe(false);
    });

    it('should handle discovered exits', () => {
      const trait = new ExitTrait({
        from: 'cellar',
        to: 'tunnel',
        command: 'go down',
        direction: 'down',
        visible: false,
        listed: false
      });
      
      // Simulate discovery
      trait.visible = true;
      trait.listed = true;
      
      expect(trait.visible).toBe(true);
      expect(trait.listed).toBe(true);
    });
  });

  describe('conditional exits', () => {
    it('should handle simple condition', () => {
      const trait = new ExitTrait({
        from: 'gate',
        to: 'castle',
        command: 'enter castle',
        conditional: true,
        conditionId: 'has-invitation',
        blockedMessage: 'The guards block your way. "No entry without an invitation!"'
      });
      
      expect(trait.conditional).toBe(true);
      expect(trait.conditionId).toBe('has-invitation');
      expect(trait.blockedMessage).toContain('invitation');
    });

    it('should handle complex condition', () => {
      const trait = new ExitTrait({
        from: 'ritual-chamber',
        to: 'inner-sanctum',
        command: 'enter sanctum',
        conditional: true,
        conditionId: 'ritual-complete',
        blockedMessage: 'The magical barrier repels you. The ritual must be completed first.'
      });
      
      expect(trait.conditional).toBe(true);
      expect(trait.conditionId).toBe('ritual-complete');
    });

    it('should handle time-based condition', () => {
      const trait = new ExitTrait({
        from: 'town-square',
        to: 'night-market',
        command: 'go east',
        direction: 'east',
        conditional: true,
        conditionId: 'is-nighttime',
        blockedMessage: 'The night market only opens after dark.'
      });
      
      expect(trait.conditional).toBe(true);
      expect(trait.conditionId).toBe('is-nighttime');
    });
  });

  describe('messages', () => {
    it('should handle custom use messages', () => {
      const trait = new ExitTrait({
        from: 'cliff-edge',
        to: 'canyon-floor',
        command: 'climb down',
        useMessage: 'You carefully make your way down the treacherous cliff face.'
      });
      
      expect(trait.useMessage).toContain('treacherous cliff face');
    });

    it('should handle custom blocked messages', () => {
      const trait = new ExitTrait({
        from: 'hallway',
        to: 'armory',
        command: 'go west',
        direction: 'west',
        blockedMessage: 'The armory door is locked tight.'
      });
      
      expect(trait.blockedMessage).toContain('locked tight');
    });

    it('should allow no custom messages', () => {
      const trait = new ExitTrait({
        from: 'room1',
        to: 'room2',
        command: 'go north'
      });
      
      expect(trait.useMessage).toBeUndefined();
      expect(trait.blockedMessage).toBeUndefined();
    });
  });

  describe('entity integration', () => {
    it('should attach to entity correctly', () => {
      const entity = new IFEntity('north-door', 'exit');
      const trait = new ExitTrait({
        from: 'kitchen',
        to: 'pantry',
        command: 'go north',
        direction: 'north'
      });
      
      entity.add(trait);
      
      expect(entity.has(TraitType.EXIT)).toBe(true);
      const retrievedTrait = entity.get(TraitType.EXIT) as ExitTrait;
      expect(retrievedTrait.from).toBe('kitchen');
      expect(retrievedTrait.to).toBe('pantry');
    });

    it('should replace existing exit trait', () => {
      const entity = new IFEntity('portal', 'exit');
      
      const trait1 = new ExitTrait({
        from: 'room1',
        to: 'room2',
        command: 'enter portal'
      });
      entity.add(trait1);
      
      const trait2 = new ExitTrait({
        from: 'room3',
        to: 'room4',
        command: 'use portal'
      });
      entity.add(trait2);
      
      const retrievedTrait = entity.get(TraitType.EXIT) as ExitTrait;
      expect(retrievedTrait.from).toBe('room3');
      expect(retrievedTrait.to).toBe('room4');
      expect(retrievedTrait.command).toBe('use portal');
    });
  });

  describe('special exit types', () => {
    it('should handle one-way exit', () => {
      const trait = new ExitTrait({
        from: 'slide-top',
        to: 'pool',
        command: 'go down',
        direction: 'down',
        bidirectional: false,
        useMessage: 'You slide down the chute and splash into the pool!'
      });
      
      expect(trait.bidirectional).toBe(false);
      expect(trait.reverseCommand).toBeUndefined();
    });

    it('should handle teleporter', () => {
      const trait = new ExitTrait({
        from: 'teleporter-room',
        to: 'destination',
        command: 'activate teleporter',
        aliases: ['use teleporter', 'step on pad'],
        useMessage: 'The world blurs and shifts around you...'
      });
      
      expect(trait.command).toBe('activate teleporter');
      expect(trait.aliases).toContain('step on pad');
    });

    it('should handle vehicle-based exit', () => {
      const trait = new ExitTrait({
        from: 'dock',
        to: 'island',
        command: 'sail boat',
        aliases: ['use boat', 'row boat'],
        conditional: true,
        conditionId: 'has-boat',
        blockedMessage: 'You need a boat to cross the water.',
        useMessage: 'You untie the boat and row across the calm water.'
      });
      
      expect(trait.command).toBe('sail boat');
      expect(trait.conditional).toBe(true);
      expect(trait.conditionId).toBe('has-boat');
    });
  });
});
