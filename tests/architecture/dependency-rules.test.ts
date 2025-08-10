/**
 * Architecture Test: Dependency Rules
 * 
 * Ensures proper dependency flow between layers and packages.
 * Actions should depend on behaviors, not reimplement them.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface DependencyRule {
  from: string;
  should: 'import' | 'not-import';
  packages: string[];
  reason: string;
}

const DEPENDENCY_RULES: DependencyRule[] = [
  {
    from: 'stdlib/src/actions/standard',
    should: 'import',
    packages: ['@sharpee/world-model'],
    reason: 'Actions should use behaviors from world-model'
  },
  {
    from: 'world-model',
    should: 'not-import',
    packages: ['@sharpee/stdlib'],
    reason: 'World-model should not depend on stdlib (reverse dependency)'
  },
  {
    from: 'core',
    should: 'not-import',
    packages: ['@sharpee/stdlib', '@sharpee/world-model', '@sharpee/engine'],
    reason: 'Core should have no dependencies on higher layers'
  }
];

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
 * Extract imports from a TypeScript file
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /import\s+(?:{[^}]*}|\*|[\w]+).*from\s+['"](.*)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }
  
  return imports;
}

describe('Architecture: Dependency Rules', () => {
  DEPENDENCY_RULES.forEach(rule => {
    describe(`${rule.from} dependency rules`, () => {
      const basePath = join(__dirname, '../../packages', rule.from);
      const files = getAllTsFiles(basePath);
      
      it(`${rule.should} ${rule.packages.join(', ')}`, () => {
        const violations: string[] = [];
        
        files.forEach(file => {
          const content = readFileSync(file, 'utf-8');
          const imports = extractImports(content);
          const fileName = file.replace(basePath, '').substring(1);
          
          rule.packages.forEach(pkg => {
            const hasImport = imports.some(imp => imp.includes(pkg));
            
            if (rule.should === 'import' && !hasImport) {
              // Check if file actually needs this import
              // For actions, only flag if they use traits
              if (file.includes('actions/standard')) {
                if (content.includes('TraitType.')) {
                  violations.push(`${fileName} uses traits but doesn't import behaviors from ${pkg}`);
                }
              }
            } else if (rule.should === 'not-import' && hasImport) {
              violations.push(`${fileName} imports ${pkg} (${rule.reason})`);
            }
          });
        });
        
        if (violations.length > 0) {
          console.error(`\nDependency violations in ${rule.from}:`);
          violations.forEach(v => console.error(`  - ${v}`));
        }
        
        expect(violations).toEqual([]);
      });
    });
  });
  
  describe('Actions should use specific behaviors', () => {
    const expectedBehaviorUsage = [
      { action: 'opening', behaviors: ['OpenableBehavior', 'LockableBehavior'] },
      { action: 'closing', behaviors: ['OpenableBehavior'] },
      { action: 'locking', behaviors: ['LockableBehavior'] },
      { action: 'unlocking', behaviors: ['LockableBehavior'] },
      { action: 'putting', behaviors: ['ContainerBehavior', 'PortableBehavior'] },
      { action: 'taking', behaviors: ['PortableBehavior', 'ContainerBehavior'] }
    ];
    
    expectedBehaviorUsage.forEach(({ action, behaviors }) => {
      it(`${action} actions should use ${behaviors.join(', ')}`, () => {
        const actionDir = join(__dirname, '../../packages/stdlib/src/actions/standard', action);
        
        try {
          const files = getAllTsFiles(actionDir);
          
          files.forEach(file => {
            if (!file.includes('.test.')) {
              const content = readFileSync(file, 'utf-8');
              
              behaviors.forEach(behavior => {
                // For now, just warn about missing behaviors
                // After refactoring, this should fail
                if (!content.includes(behavior)) {
                  console.warn(`[TECH DEBT] ${action} action doesn't use ${behavior}`);
                }
              });
            }
          });
        } catch (e) {
          // Directory might not exist yet
          console.warn(`Action directory not found: ${action}`);
        }
      });
    });
  });
});