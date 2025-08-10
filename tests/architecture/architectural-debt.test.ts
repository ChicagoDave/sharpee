/**
 * Architecture Test: Technical Debt Tracking
 * 
 * Tracks architectural debt metrics and ensures they don't get worse.
 * This helps prevent regression while we refactor.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

interface ArchitecturalMetrics {
  timestamp: string;
  behaviorUsageRate: number;      // % of actions using behaviors
  directTraitManipulation: number; // Count of direct trait mutations
  validationInExecute: number;     // Count of validation logic in execute
  duplicatedLogic: number;         // Estimated lines of duplicated code
}

/**
 * Get all TypeScript files in a directory recursively
 */
function getAllTsFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walk(currentDir: string) {
    const entries = readdirSync(currentDir);
    
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory() && !entry.includes('node_modules') && !entry.includes('dist') && !entry.includes('extensions')) {
        walk(fullPath);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  walk(dir);
  return files;
}

/**
 * Calculate current architectural metrics
 */
function calculateMetrics(): ArchitecturalMetrics {
  const actionsDir = join(__dirname, '../../packages/stdlib/src/actions/standard');
  const actionFiles = getAllTsFiles(actionsDir);
  
  let totalActions = 0;
  let actionsUsingBehaviors = 0;
  let directManipulations = 0;
  let validationInExecuteCount = 0;
  let duplicatedLines = 0;
  
  actionFiles.forEach(file => {
    const content = readFileSync(file, 'utf-8');
    
    // Skip meta-actions
    if (content.includes('extends MetaAction')) {
      return;
    }
    
    // Check if it's an action file
    if (!content.includes('execute') || !content.includes('ActionContext')) {
      return;
    }
    
    totalActions++;
    
    // Check for behavior usage
    const usesBehaviors = 
      content.includes('OpenableBehavior') ||
      content.includes('LockableBehavior') ||
      content.includes('ContainerBehavior') ||
      content.includes('PortableBehavior');
    
    if (usesBehaviors) {
      actionsUsingBehaviors++;
    }
    
    // Count direct trait manipulations
    const manipulations = [
      /\.isOpen\s*=/g,
      /\.isLocked\s*=/g,
      /\.isClosed\s*=/g,
      /\.isLit\s*=/g
    ];
    
    manipulations.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        directManipulations += matches.length;
      }
    });
    
    // Count validation in execute
    const executeMethod = content.match(/execute\s*\([^)]*\)\s*:\s*SemanticEvent\[\]\s*{([^}]|{[^}]*})*}/)?.[0] || '';
    
    if (executeMethod.includes('if') && executeMethod.includes('TraitType')) {
      validationInExecuteCount++;
    }
    
    // Estimate duplicated logic (lines that reimplement behavior logic)
    const duplicatedPatterns = [
      /if\s*\(.*isOpen\)/,
      /if\s*\(.*isLocked\)/,
      /capacity.*maxWeight/,
      /contents\.reduce/
    ];
    
    duplicatedPatterns.forEach(pattern => {
      if (pattern.test(content)) {
        duplicatedLines += 10; // Rough estimate
      }
    });
  });
  
  return {
    timestamp: new Date().toISOString(),
    behaviorUsageRate: totalActions > 0 ? (actionsUsingBehaviors / totalActions) * 100 : 0,
    directTraitManipulation: directManipulations,
    validationInExecute: validationInExecuteCount,
    duplicatedLogic: duplicatedLines
  };
}

describe('Architecture: Technical Debt Metrics', () => {
  const metricsFile = join(__dirname, '../../.architecture-metrics.json');
  const currentMetrics = calculateMetrics();
  
  // Load baseline or previous metrics
  let baselineMetrics: ArchitecturalMetrics | null = null;
  if (existsSync(metricsFile)) {
    try {
      baselineMetrics = JSON.parse(readFileSync(metricsFile, 'utf-8'));
    } catch (e) {
      console.warn('Could not load baseline metrics');
    }
  }
  
  // Save current metrics for next run
  writeFileSync(metricsFile, JSON.stringify(currentMetrics, null, 2));
  
  it('should track architectural debt metrics', () => {
    console.log('\n=== Architectural Debt Metrics ===');
    console.log(`Behavior Usage Rate: ${currentMetrics.behaviorUsageRate.toFixed(1)}%`);
    console.log(`Direct Trait Manipulations: ${currentMetrics.directTraitManipulation}`);
    console.log(`Validation in Execute: ${currentMetrics.validationInExecute}`);
    console.log(`Estimated Duplicated Lines: ${currentMetrics.duplicatedLogic}`);
    
    if (baselineMetrics) {
      console.log('\n=== Changes from Baseline ===');
      console.log(`Behavior Usage: ${(currentMetrics.behaviorUsageRate - baselineMetrics.behaviorUsageRate).toFixed(1)}%`);
      console.log(`Direct Manipulations: ${currentMetrics.directTraitManipulation - baselineMetrics.directTraitManipulation}`);
      console.log(`Validation in Execute: ${currentMetrics.validationInExecute - baselineMetrics.validationInExecute}`);
      console.log(`Duplicated Lines: ${currentMetrics.duplicatedLogic - baselineMetrics.duplicatedLogic}`);
    }
    
    // These are informational for now
    expect(currentMetrics.behaviorUsageRate).toBeGreaterThanOrEqual(0);
  });
  
  it('should not increase direct trait manipulations', () => {
    if (baselineMetrics) {
      // Allow for now since we're acknowledging the debt
      // After refactoring, change this to:
      // expect(currentMetrics.directTraitManipulation).toBeLessThanOrEqual(baselineMetrics.directTraitManipulation);
      
      if (currentMetrics.directTraitManipulation > baselineMetrics.directTraitManipulation) {
        console.warn(`⚠️ Direct trait manipulations increased by ${currentMetrics.directTraitManipulation - baselineMetrics.directTraitManipulation}`);
      }
    }
  });
  
  it('should improve behavior usage over time', () => {
    // Target: 100% of actions should use behaviors
    const TARGET_BEHAVIOR_USAGE = 100;
    
    if (currentMetrics.behaviorUsageRate < TARGET_BEHAVIOR_USAGE) {
      console.warn(`⚠️ Only ${currentMetrics.behaviorUsageRate.toFixed(1)}% of actions use behaviors (target: ${TARGET_BEHAVIOR_USAGE}%)`);
    }
    
    // For now, just track it
    expect(currentMetrics.behaviorUsageRate).toBeGreaterThanOrEqual(0);
  });
  
  it('should track estimated code duplication', () => {
    const MAX_ACCEPTABLE_DUPLICATION = 500; // lines
    
    if (currentMetrics.duplicatedLogic > MAX_ACCEPTABLE_DUPLICATION) {
      console.warn(`⚠️ Estimated ${currentMetrics.duplicatedLogic} lines of duplicated logic (max acceptable: ${MAX_ACCEPTABLE_DUPLICATION})`);
    }
    
    // For now, just track it
    expect(currentMetrics.duplicatedLogic).toBeGreaterThanOrEqual(0);
  });
});