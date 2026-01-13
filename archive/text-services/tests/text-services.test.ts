/**
 * Basic tests for text-services
 */

import { describe, it, expect } from 'vitest';
import { TemplateTextService } from '../src/template-text-service';
import { CLIEventsTextService } from '../src/cli-events-text-service';
import { createTextService } from '../src/index';

describe('Text Services', () => {
  describe('TemplateTextService', () => {
    it('should create a template text service', () => {
      const service = new TemplateTextService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TemplateTextService);
    });

    it('should require initialization before processing', () => {
      const service = new TemplateTextService();
      expect(() => service.processTurn()).toThrow('Text service not initialized');
    });
  });

  describe('CLIEventsTextService', () => {
    it('should create a CLI events text service', () => {
      const service = new CLIEventsTextService();
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(CLIEventsTextService);
    });

    it('should accept configuration', () => {
      const service = new CLIEventsTextService({
        showDebugEvents: true,
        showMetadata: true
      });
      expect(service).toBeDefined();
    });
  });

  describe('createTextService factory', () => {
    it('should create template service by default', () => {
      const service = createTextService('template');
      expect(service).toBeInstanceOf(TemplateTextService);
    });

    it('should create CLI events service', () => {
      const service = createTextService('cli-events');
      expect(service).toBeInstanceOf(CLIEventsTextService);
    });

    it('should throw for unknown service type', () => {
      expect(() => createTextService('unknown')).toThrow('Unknown text service type: unknown');
    });
  });
});