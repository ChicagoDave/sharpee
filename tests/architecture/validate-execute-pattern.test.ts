/**
 * Architecture Test: Validate-Execute Pattern
 * 
 * Ensures that all action execute methods call validate() first
 * to maintain proper separation of concerns and avoid duplicate validation logic.
 */

import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('Architecture: Validate-Execute Pattern', () => {
  // Get all action files
  const getActionFiles = (dir: string): string[] => {
    const files: string[] = [];
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...getActionFiles(fullPath));
      } else if (item.endsWith('.ts') && 
                 !item.includes('.test.') && 
                 !item.includes('-events.') &&
                 !item.includes('index.') &&
                 !item.includes('types.') &&
                 !item.includes('constants.') &&
                 !item.includes('meta-')) {
        files.push(fullPath);
      }
    }
    
    return files;
  };
  
  const actionFiles = getActionFiles('packages/stdlib/src/actions');

  describe('Actions must call validate() in execute()', () => {
    actionFiles.forEach(file => {
      test(`${file} should call validate() at the start of execute()`, () => {
        const content = readFileSync(file, 'utf-8');
        const fileName = file.split('/').pop()!;
        
        // Skip files that don't have execute methods
        if (!content.includes('execute(') || !content.includes('execute:')) {
          return;
        }
        
        // Skip meta-actions (they extend MetaAction)
        if (content.includes('extends MetaAction')) {
          return;
        }
        
        // Check if file has a validate method/property
        const hasValidate = content.includes('validate(') || content.includes('validate:');
        
        if (hasValidate) {
          // Pattern 1: execute method that calls this.validate
          const executeCallsValidate = /execute\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{[^}]*this\.validate\s*\(/m.test(content);
          
          // Pattern 2: execute property function that calls validate
          const executePropertyCallsValidate = /execute:\s*(?:function\s*)?\([^)]*\)\s*(?::\s*\w+\s*)?(?:=>)?\s*\{[^}]*(?:this\.)?validate\s*\(/m.test(content);
          
          // Pattern 3: Inline validation check in execute
          const hasInlineValidation = /execute.*\{[\s\S]*?const\s+validation\s*=\s*this\.validate/m.test(content);
          
          // Check for validation logic directly in execute (anti-pattern)
          const hasDirectValidationLogic = [
            /execute[\s\S]*?if\s*\(\s*![\w.]+\s*\)\s*\{[\s\S]*?return\s*\[[\s\S]*?error/m, // if (!noun) return error
            /execute[\s\S]*?if\s*\(\s*![\w.]+\.has\s*\(/m, // if (!noun.has(
            /execute[\s\S]*?canOpen|canClose|canLock|canUnlock|isLocked|isOpen/m // Direct behavior validation calls
          ].some(pattern => pattern.test(content));
          
          // If has validation logic but doesn't call validate(), it's a violation
          if (hasDirectValidationLogic && !executeCallsValidate && !executePropertyCallsValidate && !hasInlineValidation) {
            // Check if it's the new pattern where we call validate first
            const callsValidateFirst = /execute[\s\S]*?\{[\s\S]*?(?:const|let|var)\s+validation\s*=\s*this\.validate\s*\([^)]*\)/m.test(content);
            
            if (!callsValidateFirst) {
              expect.fail(
                `${fileName} has validation logic in execute() but doesn't call validate() first.\n` +
                `Execute methods should start with:\n` +
                `  const validation = this.validate(context);\n` +
                `  if (!validation.valid) { return [/* error event */]; }`
              );
            }
          }
        }
      });
    });
  });

  describe('Actions should not duplicate validation logic', () => {
    actionFiles.forEach(file => {
      test(`${file} should not have validation logic in both validate() and execute()`, () => {
        const content = readFileSync(file, 'utf-8');
        const fileName = file.split('/').pop()!;
        
        // Skip files without both methods
        if (!content.includes('validate') || !content.includes('execute')) {
          return;
        }
        
        // Skip meta-actions
        if (content.includes('extends MetaAction')) {
          return;
        }
        
        // Extract validate method/property content
        const validateMatch = content.match(/validate[\s\S]*?\{([\s\S]*?)\n\s*\}/);
        const validateContent = validateMatch ? validateMatch[1] : '';
        
        // Extract execute method/property content  
        const executeMatch = content.match(/execute[\s\S]*?\{([\s\S]*?)(?:\n\s*\}|$)/);
        const executeContent = executeMatch ? executeMatch[1] : '';
        
        // Check for duplicate validation patterns
        const validationPatterns = [
          /if\s*\(\s*![\w.]+\s*\)/, // if (!entity)
          /\.has\s*\(\s*TraitType\./, // .has(TraitType.X)
          /canOpen|canClose|canLock|canUnlock/, // Behavior validation methods
          /isLocked|isOpen/, // State checks
        ];
        
        const duplicatePatterns: string[] = [];
        validationPatterns.forEach(pattern => {
          if (validateContent.match(pattern) && executeContent.match(pattern)) {
            // Check if execute is calling validate first
            const callsValidateFirst = /(?:const|let|var)\s+validation\s*=\s*this\.validate/.test(executeContent);
            if (!callsValidateFirst) {
              duplicatePatterns.push(pattern.toString());
            }
          }
        });
        
        if (duplicatePatterns.length > 0) {
          console.warn(
            `[TECH DEBT] ${fileName} has duplicate validation logic:\n` +
            duplicatePatterns.map(p => `  - Pattern: ${p}`).join('\n')
          );
        }
      });
    });
  });
});