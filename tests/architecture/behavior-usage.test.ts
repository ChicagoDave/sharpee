/**
 * Architecture Test: Behavior Usage
 * 
 * Ensures that actions properly delegate to behaviors instead of
 * reimplementing logic. This test would have caught our architectural
 * failure where actions were directly manipulating traits.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

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

describe('Architecture: Behavior Usage', () => {
  const actionsDir = join(__dirname, '../../packages/stdlib/src/actions/standard');
  const actionFiles = getAllTsFiles(actionsDir);

  describe('Actions must delegate to behaviors', () => {
    it.each(actionFiles)('%s should use behaviors for trait logic', (file) => {
      const content = readFileSync(file, 'utf-8');
      const fileName = file.split('/').pop() || '';
      
      // Skip meta-actions and special cases
      if (content.includes('extends MetaAction')) {
        return;
      }
      
      // Check for direct trait manipulation (WRONG pattern)
      const directManipulations = [
        /\.isOpen\s*=/,
        /\.isLocked\s*=/,
        /\.isClosed\s*=/,
        /\.isLit\s*=/,
        /\.currentCapacity\s*=/
      ];
      
      const violations: string[] = [];
      
      directManipulations.forEach(pattern => {
        if (pattern.test(content)) {
          violations.push(`Direct trait manipulation found: ${pattern}`);
        }
      });
      
      // If file uses openable traits, it should import OpenableBehavior
      if (content.includes('TraitType.OPENABLE')) {
        if (!content.includes('OpenableBehavior')) {
          violations.push('Uses OPENABLE trait but does not import OpenableBehavior');
        }
        
        // Should use canOpen/canClose for validation
        if (!content.includes('OpenableBehavior.canOpen') && 
            !content.includes('OpenableBehavior.canClose') &&
            fileName.includes('open')) {
          violations.push('Should use OpenableBehavior.canOpen() or canClose() for validation');
        }
      }
      
      // If file uses lockable traits, it should import LockableBehavior
      if (content.includes('TraitType.LOCKABLE')) {
        if (!content.includes('LockableBehavior')) {
          violations.push('Uses LOCKABLE trait but does not import LockableBehavior');
        }
      }
      
      // If file uses container traits, it should import ContainerBehavior
      if (content.includes('TraitType.CONTAINER')) {
        if (!content.includes('ContainerBehavior')) {
          violations.push('Uses CONTAINER trait but does not import ContainerBehavior');
        }
      }
      
      if (violations.length > 0) {
        console.error(`\nArchitectural violations in ${fileName}:`);
        violations.forEach(v => console.error(`  - ${v}`));
      }
      
      expect(violations, `${fileName} has architectural violations`).toEqual([]);
    });
  });

  describe('Actions must implement validate/execute pattern', () => {
    it.each(actionFiles)('%s should have separate validate and execute methods', (file) => {
      const content = readFileSync(file, 'utf-8');
      const fileName = file.split('/').pop() || '';
      
      // Skip meta-actions
      if (content.includes('extends MetaAction')) {
        return;
      }
      
      // Check for execute method
      const hasExecute = /execute\s*\([^)]*context:\s*ActionContext[^)]*\)/.test(content);
      
      if (!hasExecute) {
        // Skip files that aren't action implementations
        return;
      }
      
      // Check that validation logic isn't mixed into execute
      const executeMethod = content.match(/execute\s*\([^)]*\)\s*:\s*SemanticEvent\[\]\s*{([^}]|{[^}]*})*}/)?.[0] || '';
      
      const validationInExecute: string[] = [];
      
      // These patterns indicate validation logic that should be in validate()
      const validationPatterns = [
        /if\s*\(!.*has\(TraitType/,  // Checking for trait existence
        /if\s*\(.*\.isOpen\)/,       // Checking state without using behavior
        /if\s*\(.*\.isLocked\)/,
        /if\s*\(!noun\)/,             // Basic entity validation
        /if\s*\(!.*directObject\)/
      ];
      
      validationPatterns.forEach(pattern => {
        if (pattern.test(executeMethod)) {
          validationInExecute.push(`Validation logic in execute: ${pattern}`);
        }
      });
      
      // TODO: Once we add validate() to Action interface, check for it
      // const hasValidate = /validate\s*\([^)]*context:\s*ActionContext[^)]*\)/.test(content);
      // expect(hasValidate, `${fileName} should have validate() method`).toBe(true);
      
      if (validationInExecute.length > 0) {
        console.warn(`\nValidation mixed with execution in ${fileName}:`);
        validationInExecute.forEach(v => console.warn(`  - ${v}`));
      }
      
      // For now, just warn about validation in execute
      // Once we refactor, this should fail
      if (validationInExecute.length > 0) {
        console.warn(`[TECH DEBT] ${fileName} has validation logic in execute()`);
      }
    });
  });
});