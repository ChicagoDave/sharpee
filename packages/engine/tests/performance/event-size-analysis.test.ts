/**
 * Event Size Analysis
 * 
 * Measures the size of events with entity snapshots to understand
 * the performance impact of the atomic events architecture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestEngine } from '../test-helpers/setup-test-engine';
import { MinimalTestStory } from '../stories/minimal-test-story';
import { GameEngine } from '../../src/game-engine';
import { ISemanticEvent } from '@sharpee/core';

describe('Event Size Analysis', () => {
  let engine: GameEngine;
  let events: ISemanticEvent[] = [];

  beforeEach(async () => {
    const setup = setupTestEngine({ includeObjects: true });
    engine = setup.engine;
    
    // Set a minimal story
    const story = new MinimalTestStory();
    engine.setStory(story);
    
    // Capture all events
    engine.on('event', (event) => {
      events.push(event as any);
    });
    
    events = [];
    await engine.start();
  });

  function getEventSize(event: ISemanticEvent): number {
    // Convert to JSON and measure byte size
    const json = JSON.stringify(event);
    return new TextEncoder().encode(json).length;
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  it('should measure event sizes for common actions', async () => {
    const measurements: Record<string, { count: number; totalSize: number; avgSize: number }> = {};

    // Execute various actions
    await engine.executeTurn('look');
    await engine.executeTurn('take lamp');
    await engine.executeTurn('inventory');
    await engine.executeTurn('drop lamp');
    await engine.executeTurn('take lamp');
    await engine.executeTurn('go north');
    await engine.executeTurn('look');
    await engine.executeTurn('drop lamp');

    // Analyze events
    for (const event of events) {
      const size = getEventSize(event);
      const type = event.type;

      if (!measurements[type]) {
        measurements[type] = { count: 0, totalSize: 0, avgSize: 0 };
      }

      measurements[type].count++;
      measurements[type].totalSize += size;
      measurements[type].avgSize = measurements[type].totalSize / measurements[type].count;
    }

    // Report findings
    console.log('\n=== Event Size Analysis ===\n');
    console.log('Event Type                           | Count | Avg Size    | Total Size');
    console.log('-------------------------------------|-------|-------------|------------');
    
    const sortedTypes = Object.keys(measurements).sort((a, b) => 
      measurements[b].avgSize - measurements[a].avgSize
    );

    for (const type of sortedTypes) {
      const m = measurements[type];
      const typeDisplay = type.padEnd(36);
      const countDisplay = m.count.toString().padStart(5);
      const avgDisplay = formatBytes(m.avgSize).padStart(11);
      const totalDisplay = formatBytes(m.totalSize).padStart(11);
      
      console.log(`${typeDisplay} | ${countDisplay} | ${avgDisplay} | ${totalDisplay}`);
    }

    const totalSize = Object.values(measurements).reduce((sum, m) => sum + m.totalSize, 0);
    const totalCount = Object.values(measurements).reduce((sum, m) => sum + m.count, 0);
    
    console.log('-------------------------------------|-------|-------------|------------');
    console.log(`${'TOTAL'.padEnd(36)} | ${totalCount.toString().padStart(5)} | ${formatBytes(totalSize / totalCount).padStart(11)} | ${formatBytes(totalSize).padStart(11)}`);
    console.log('\n');

    // Assertions to ensure events aren't too large
    for (const type of Object.keys(measurements)) {
      const avgSize = measurements[type].avgSize;
      
      // Warning thresholds
      if (avgSize > 5000) {
        console.warn(`⚠️  Large event size for ${type}: ${formatBytes(avgSize)}`);
      }
      
      // Error threshold - events shouldn't exceed 10KB on average
      expect(avgSize).toBeLessThan(10240, 
        `Event type ${type} exceeds 10KB average size: ${formatBytes(avgSize)}`
      );
    }
  });

  it('should compare snapshot vs reference sizes', async () => {
    // Take an item to get a snapshot event
    await engine.executeTurn('take lamp');
    
    const takeEvent = events.find(e => e.type === 'if.event.taken');
    if (!takeEvent) {
      console.log('No take event found');
      return;
    }

    // Measure full snapshot size
    const fullSize = getEventSize(takeEvent);
    
    // Create a reference-only version
    const referenceEvent = {
      ...takeEvent,
      data: {
        itemId: 'lamp-001',
        actorId: 'player-001'
      }
    };
    
    const refSize = getEventSize(referenceEvent);
    
    console.log('\n=== Snapshot vs Reference Comparison ===\n');
    console.log(`Full snapshot event: ${formatBytes(fullSize)}`);
    console.log(`Reference-only event: ${formatBytes(refSize)}`);
    console.log(`Size increase: ${formatBytes(fullSize - refSize)} (${((fullSize / refSize - 1) * 100).toFixed(1)}%)`);
    console.log('\n');

    // The snapshot should be larger but not excessively so
    expect(fullSize).toBeGreaterThan(refSize);
    expect(fullSize).toBeLessThan(refSize * 10); // Should not be 10x larger
  });

  it('should analyze memory usage patterns', async () => {
    const turnSizes: number[] = [];
    
    // Execute many turns
    for (let i = 0; i < 20; i++) {
      const turnStart = events.length;
      
      if (i % 4 === 0) await engine.executeTurn('look');
      else if (i % 4 === 1) await engine.executeTurn('take lamp');
      else if (i % 4 === 2) await engine.executeTurn('drop lamp');
      else await engine.executeTurn('inventory');
      
      const turnEvents = events.slice(turnStart);
      const turnSize = turnEvents.reduce((sum, e) => sum + getEventSize(e), 0);
      turnSizes.push(turnSize);
    }

    const avgTurnSize = turnSizes.reduce((a, b) => a + b, 0) / turnSizes.length;
    const maxTurnSize = Math.max(...turnSizes);
    const minTurnSize = Math.min(...turnSizes);

    console.log('\n=== Memory Usage Patterns ===\n');
    console.log(`Average turn size: ${formatBytes(avgTurnSize)}`);
    console.log(`Maximum turn size: ${formatBytes(maxTurnSize)}`);
    console.log(`Minimum turn size: ${formatBytes(minTurnSize)}`);
    console.log(`Total events stored: ${events.length}`);
    console.log(`Total memory used: ${formatBytes(events.reduce((sum, e) => sum + getEventSize(e), 0))}`);
    
    // Estimate memory for a typical game session
    const typicalGameTurns = 500;
    const estimatedMemory = avgTurnSize * typicalGameTurns;
    
    console.log(`\nEstimated memory for ${typicalGameTurns}-turn game: ${formatBytes(estimatedMemory)}`);
    console.log('\n');

    // Memory should be reasonable
    expect(estimatedMemory).toBeLessThan(10 * 1024 * 1024); // Less than 10MB for 500 turns
  });
});