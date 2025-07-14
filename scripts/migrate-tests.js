#!/usr/bin/env node

/**
 * Test Migration Script
 * 
 * Helps migrate tests to work with the new language management system
 * 
 * Usage: node migrate-tests.js [test-file-path]
 */

const fs = require('fs');
const path = require('path');

const FIXES = [
  {
    name: 'Add parser import to CommandExecutor tests',
    pattern: /import\s*{\s*createMockAction\s*}\s*from\s*'\.\/fixtures'/g,
    replacement: "import { createMockAction, createMockParser } from './fixtures'"
  },
  {
    name: 'Add parser variable declaration',
    pattern: /let\s+languageProvider:\s*any;/g,
    replacement: 'let languageProvider: any;\n  let parser: any;'
  },
  {
    name: 'Create mock parser after language provider',
    pattern: /(languageProvider\s*=\s*await\s*loadLanguageProvider.*?;)/g,
    replacement: '$1\n    \n    // Create mock parser\n    parser = createMockParser(languageProvider);'
  },
  {
    name: 'Update CommandExecutor constructor calls',
    pattern: /new\s+CommandExecutor\s*\(\s*world,\s*actionRegistry,\s*eventProcessor,\s*languageProvider\s*\)/g,
    replacement: 'new CommandExecutor(world, actionRegistry, eventProcessor, languageProvider, parser)'
  },
  {
    name: 'Update createCommandExecutor calls',
    pattern: /createCommandExecutor\s*\(\s*world,\s*actionRegistry,\s*eventProcessor,\s*languageProvider\s*\)/g,
    replacement: 'createCommandExecutor(world, actionRegistry, eventProcessor, languageProvider, parser)'
  },
  {
    name: 'Fix error handling tests for missing parser',
    pattern: /(it\s*\(\s*['"]should\s+handle\s+missing\s+language\s+provider['"]\s*,[\s\S]*?)\)\s*;/g,
    replacement: `it('should handle missing parser', () => {
      expect(() => new CommandExecutor(
        world,
        actionRegistry,
        eventProcessor,
        languageProvider,
        null as any
      )).toThrow();
    });

    $1);`
  }
];

function migrateFile(filePath) {
  console.log(`\nMigrating: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  FIXES.forEach(fix => {
    if (fix.pattern.test(content)) {
      console.log(`  ✓ Applying: ${fix.name}`);
      content = content.replace(fix.pattern, fix.replacement);
      modified = true;
    }
  });
  
  if (modified) {
    // Create backup
    const backupPath = `${filePath}.backup`;
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf8'));
    console.log(`  → Created backup: ${backupPath}`);
    
    // Write modified content
    fs.writeFileSync(filePath, content);
    console.log(`  → Updated: ${filePath}`);
  } else {
    console.log('  → No changes needed');
  }
}

function findTestFiles(dir) {
  const files = [];
  
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir);
    
    entries.forEach(entry => {
      const fullPath = path.join(currentDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !entry.includes('node_modules')) {
        walk(fullPath);
      } else if (stat.isFile() && entry.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    });
  }
  
  walk(dir);
  return files;
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log('Test Migration Tool\n');
  console.log('This tool helps migrate tests to work with the new language management system.\n');
  console.log('Usage:');
  console.log('  node migrate-tests.js <test-file>     - Migrate a specific test file');
  console.log('  node migrate-tests.js --all           - Migrate all test files in engine package');
  console.log('  node migrate-tests.js --dry-run       - Show what would be changed without modifying files');
} else if (args[0] === '--all') {
  const engineTestsDir = path.join(__dirname, '..', '..', 'packages', 'engine', 'tests');
  const testFiles = findTestFiles(engineTestsDir);
  
  console.log(`Found ${testFiles.length} test files`);
  testFiles.forEach(migrateFile);
} else if (args[0] === '--dry-run') {
  console.log('Dry run mode - no files will be modified');
  // TODO: Implement dry run
} else {
  // Migrate specific file
  const filePath = path.resolve(args[0]);
  if (fs.existsSync(filePath)) {
    migrateFile(filePath);
  } else {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
}
