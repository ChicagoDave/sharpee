/**
 * Tests for TextService
 */

import { 
  TextService, 
  TextChannel, 
  createBasicTextService,
  BufferedTextChannel,
  ConsoleTextChannel,
  MultiTextChannel
} from '../src/text-service';
import { TurnResult } from '../src/types';
import { createTestEvent } from './fixtures';

describe('TextService', () => {
  describe('TextService interface', () => {
    class TestTextService implements TextService {
      private processedTurns: TurnResult[] = [];
      
      processTurn(turn: TurnResult, channels: TextChannel[], options?: any): void {
        this.processedTurns.push(turn);
        
        // Write to channels
        channels.forEach(channel => {
          channel.write(`Turn ${turn.turn}: ${turn.input}`);
        });
      }
      
      getProcessedTurns(): TurnResult[] {
        return this.processedTurns;
      }
    }

    it('should implement TextService interface', () => {
      const service = new TestTextService();
      const channel = new BufferedTextChannel();
      
      const turn: TurnResult = {
        turn: 1,
        input: 'test',
        success: true,
        events: [],
        timing: undefined
      };
      
      service.processTurn(turn, [channel]);
      
      expect(service.getProcessedTurns()).toHaveLength(1);
      expect(channel.getBuffer()).toContain('Turn 1: test');
    });
  });

  describe('BufferedTextChannel', () => {
    let channel: BufferedTextChannel;

    beforeEach(() => {
      channel = new BufferedTextChannel();
    });

    it('should buffer written text', () => {
      channel.write('Hello');
      channel.write(' ');
      channel.write('World!');
      
      expect(channel.getBuffer()).toBe('Hello World!');
    });

    it('should clear buffer', () => {
      channel.write('Some text');
      expect(channel.getBuffer()).toBe('Some text');
      
      channel.clear();
      expect(channel.getBuffer()).toBe('');
    });

    it('should handle metadata', () => {
      channel.write('Text with metadata', { type: 'event', priority: 'high' });
      expect(channel.getBuffer()).toBe('Text with metadata');
    });

    it('should handle empty writes', () => {
      channel.write('');
      expect(channel.getBuffer()).toBe('');
    });

    it('should handle multiple lines', () => {
      channel.write('Line 1\n');
      channel.write('Line 2\n');
      channel.write('Line 3');
      
      expect(channel.getBuffer()).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('ConsoleTextChannel', () => {
    let channel: ConsoleTextChannel;
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      channel = new ConsoleTextChannel();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should write to console', () => {
      channel.write('Console output');
      expect(consoleLogSpy).toHaveBeenCalledWith('Console output');
    });

    it('should handle metadata', () => {
      channel.write('With metadata', { debug: true });
      expect(consoleLogSpy).toHaveBeenCalledWith('With metadata');
    });

    it('should not accumulate buffer', () => {
      channel.write('First');
      channel.write('Second');
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);
      expect(consoleLogSpy).toHaveBeenNthCalledWith(1, 'First');
      expect(consoleLogSpy).toHaveBeenNthCalledWith(2, 'Second');
    });
  });

  describe('MultiTextChannel', () => {
    let channel1: BufferedTextChannel;
    let channel2: BufferedTextChannel;
    let multiChannel: MultiTextChannel;

    beforeEach(() => {
      channel1 = new BufferedTextChannel();
      channel2 = new BufferedTextChannel();
      multiChannel = new MultiTextChannel([channel1, channel2]);
    });

    it('should write to all channels', () => {
      multiChannel.write('Multi-channel text');
      
      expect(channel1.getBuffer()).toBe('Multi-channel text');
      expect(channel2.getBuffer()).toBe('Multi-channel text');
    });

    it('should pass metadata to all channels', () => {
      multiChannel.write('With metadata', { source: 'test' });
      
      expect(channel1.getBuffer()).toBe('With metadata');
      expect(channel2.getBuffer()).toBe('With metadata');
    });

    it('should handle empty channel list', () => {
      const emptyMulti = new MultiTextChannel([]);
      expect(() => emptyMulti.write('Test')).not.toThrow();
    });

    it('should add channels dynamically', () => {
      const channel3 = new BufferedTextChannel();
      multiChannel.addChannel(channel3);
      
      multiChannel.write('After adding');
      
      expect(channel1.getBuffer()).toBe('After adding');
      expect(channel2.getBuffer()).toBe('After adding');
      expect(channel3.getBuffer()).toBe('After adding');
    });

    it('should remove channels', () => {
      multiChannel.removeChannel(channel2);
      
      multiChannel.write('After removal');
      
      expect(channel1.getBuffer()).toBe('After removal');
      expect(channel2.getBuffer()).toBe(''); // Not written to
    });

    it('should get all channels', () => {
      const channels = multiChannel.getChannels();
      expect(channels).toHaveLength(2);
      expect(channels).toContain(channel1);
      expect(channels).toContain(channel2);
    });
  });

  describe('createBasicTextService', () => {
    it('should create service with default channels', () => {
      const { service, channels } = createBasicTextService();
      
      expect(service).toBeDefined();
      expect(channels).toHaveLength(1);
      expect(channels[0]).toBeInstanceOf(BufferedTextChannel);
    });

    it('should process turn events', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'look',
        success: true,
        events: [
          createTestEvent('location.described', { 
            description: 'You are in a room.' 
          }),
          createTestEvent('command.succeeded', {
            message: 'OK'
          })
        ]
      };
      
      service.processTurn(turn, channels);
      
      const output = buffer.getBuffer();
      expect(output).toContain('You are in a room.');
    });

    it('should handle options', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'test',
        success: true,
        events: [
          createTestEvent('test.event', { value: 42 }),
          createTestEvent('system.event', { internal: true })
        ]
      };
      
      // With verbose output
      service.processTurn(turn, channels, {
        includeEventTypes: true,
        includeSystemEvents: true,
        verbose: true
      });
      
      const output = buffer.getBuffer();
      expect(output.length).toBeGreaterThan(0);
    });

    it('should handle failed commands', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'invalid',
        success: false,
        events: [
          createTestEvent('command.failed', {
            reason: 'Unknown command',
            input: 'invalid'
          })
        ],
        error: 'Unknown command'
      };
      
      service.processTurn(turn, channels);
      
      const output = buffer.getBuffer();
      expect(output).toContain('Unknown command');
    });

    it('should handle empty events', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'noop',
        success: true,
        events: []
      };
      
      service.processTurn(turn, channels);
      
      // Should not throw and buffer might be empty or have minimal output
      expect(() => buffer.getBuffer()).not.toThrow();
    });
  });

  describe('Text formatting', () => {
    it('should format different event types', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'examine object',
        success: true,
        events: [
          createTestEvent('object.examined', {
            name: 'ancient key',
            description: 'A rusty old key.'
          }),
          createTestEvent('inventory.added', {
            item: 'ancient key'
          }),
          createTestEvent('game.scored', {
            points: 10,
            total: 50
          })
        ]
      };
      
      service.processTurn(turn, channels);
      
      const output = buffer.getBuffer();
      expect(output).toContain('rusty old key');
    });

    it('should handle special characters', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'read sign',
        success: true,
        events: [
          createTestEvent('text.displayed', {
            text: 'Welcome to the "Test" game!\n\nEnjoy & have fun!'
          })
        ]
      };
      
      service.processTurn(turn, channels);
      
      const output = buffer.getBuffer();
      expect(output).toContain('"Test"');
      expect(output).toContain('&');
      expect(output).toContain('\n');
    });
  });

  describe('Error handling', () => {
    it('should handle channel write errors gracefully', () => {
      const errorChannel = {
        write: jest.fn(() => {
          throw new Error('Channel write failed');
        })
      };
      
      const { service } = createBasicTextService();
      
      const turn: TurnResult = {
        turn: 1,
        input: 'test',
        success: true,
        events: []
      };
      
      // Should not throw
      expect(() => service.processTurn(turn, [errorChannel])).not.toThrow();
    });

    it('should handle malformed events', () => {
      const { service, channels } = createBasicTextService();
      const buffer = channels[0] as BufferedTextChannel;
      
      const turn: TurnResult = {
        turn: 1,
        input: 'test',
        success: true,
        events: [
          createTestEvent('malformed.event', null as any),
          createTestEvent('normal.event', { data: 'ok' })
        ]
      };
      
      service.processTurn(turn, channels);
      
      // Should process what it can
      const output = buffer.getBuffer();
      expect(output).toBeDefined();
    });
  });
});
