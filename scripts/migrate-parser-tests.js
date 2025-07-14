#!/usr/bin/env node

/**
 * Simple Test Migration Script
 * 
 * Adds parser parameter to CommandExecutor and GameEngine tests
 */

const fs = require('fs');
const path = require('path');

const COMMAND_EXECUTOR_FIXES = [
  // Add EnglishParser import
  {
    name: 'Add EnglishParser import',
    pattern: /import { loadLanguageProvider } from '\.\.\/src\/story';/g,
    replacement: `import { loadLanguageProvider } from '../src/story';
import { EnglishParser } from '@sharpee/parser-en-us';`
  },
  // Add ParserFactory to stdlib imports
  {
    name: 'Add ParserFactory to imports',
    pattern: /StandardActionRegistry, ActionResult, ActionContext\s*}/g,
    replacement: 'StandardActionRegistry, ActionResult, ActionContext, ParserFactory }'
  },
  // Add parser variable
  {
    name: 'Add parser variable',
    pattern: /let languageProvider: any;$/m,
    replacement: 'let languageProvider: any;\n  let parser: any;'
  },
  // Create parser after language provider
  {
    name: 'Create parser instance',
    pattern: /(languageProvider = await loadLanguageProvider\(story\.config\.language\);)/g,
    replacement: `$1
    
    // Create real English parser
    ParserFactory.registerParser('en-US', EnglishParser);
    parser = ParserFactory.createParser('en-US', languageProvider);`
  },
  // Update CommandExecutor constructor
  {
    name: 'Update CommandExecutor constructor',
    pattern: /new CommandExecutor\(\s*world,\s*actionRegistry,\s*eventProcessor,\s*languageProvider\s*\)/g,
    replacement: 'new CommandExecutor(\n      world,\n      actionRegistry,\n      eventProcessor,\n      languageProvider,\n      parser\n    )'
  },
  // Update createCommandExecutor calls
  {
    name: 'Update createCommandExecutor calls',
    pattern: /createCommandExecutor\(\s*world,\s*actionRegistry,\s*eventProcessor,\s*languageProvider\s*\)/g,
    replacement: 'createCommandExecutor(\n        world,\n        actionRegistry,\n        eventProcessor,\n        languageProvider,\n        parser\n      )'
  }
];

function applyFixes(filePath, fixes) {
  console.log(`\nProcessing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log('  ✗ File not found');
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  fixes.forEach(fix => {
    if (fix.pattern.test(content)) {
      console.log(`  ✓ Applying: ${fix.name}`);
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
    }
  });
  
  if (modified) {
    // Create backup
    const backupPath = `${filePath}.backup`;
    if (!fs.existsSync(backupPath)) {
      fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
      console.log(`  → Created backup: ${backupPath}`);
    }
    
    // Write modified content
    fs.writeFileSync(filePath, content);
    console.log(`  → Updated: ${filePath}`);
  } else {
    console.log('  → No changes needed');
  }
}

// Files to migrate
const filesToMigrate = [
  'packages/engine/tests/command-executor.test.ts',
  'packages/engine/tests/integration.test.ts',
  // Add other affected test files here
];

console.log('Test Migration for Parser Parameter\n');
console.log('This will update test files to pass the parser parameter.\n');

// Run migration
filesToMigrate.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  applyFixes(fullPath, COMMAND_EXECUTOR_FIXES);
});

console.log('\nMigration complete!');
console.log('\nNext steps:');
console.log('1. Run tests: pnpm test');
console.log('2. If tests fail, check the specific errors');
console.log('3. Backups are available with .backup extension');
