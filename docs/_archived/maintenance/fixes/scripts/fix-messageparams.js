#!/usr/bin/env node

/**
 * Fix messageParams references in stdlib actions
 * This fixes the TypeScript compilation errors
 */

const fs = require('fs');
const path = require('path');

class MessageParamsFixer {
  constructor() {
    this.filesFixed = 0;
    this.totalFixes = 0;
  }

  findFiles(dir, pattern = /\.ts$/, ignore = []) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...this.findFiles(fullPath, pattern, ignore));
      } else if (stat.isFile() && pattern.test(item)) {
        const shouldIgnore = ignore.some(ignorePattern => 
          ignorePattern.test(item) || ignorePattern.test(fullPath)
        );
        
        if (!shouldIgnore) {
          files.push(fullPath);
        }
      }
    }
    
    return files;
  }

  fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    let fixes = 0;

    // Pattern 1: Fix "params: messageParams" where messageParams is undefined
    // This happens when messageParams was supposed to be "params"
    content = content.replace(/params:\s*messageParams\b/g, (match) => {
      fixes++;
      return 'params: params';
    });

    // Pattern 2: Fix standalone messageParams usage (not as a property name)
    // Look for patterns where messageParams is used as a variable
    content = content.replace(/(?<!params:\s*)(?<!const\s+)(?<!let\s+)(?<!var\s+)\bmessageParams\b(?!\s*:)/g, (match, offset) => {
      // Check context to determine what it should be
      const before = content.substring(Math.max(0, offset - 100), offset);
      const after = content.substring(offset, Math.min(content.length, offset + 100));
      
      // If it's in a shorthand property context
      if (before.includes('{') && after.includes('}') && !after.match(/^\s*:/)) {
        fixes++;
        return 'params';
      }
      
      // If it's being passed as a parameter
      if (before.match(/[,(]\s*$/) || after.match(/^\s*[,)]/)) {
        fixes++;
        return 'params';
      }
      
      // Default: assume it should be params
      fixes++;
      return 'params';
    });

    // Pattern 3: Fix object shorthand { messageParams }
    content = content.replace(/\{\s*messageParams\s*\}/g, (match) => {
      fixes++;
      return '{ params }';
    });

    // Pattern 4: Fix spreading ...messageParams
    content = content.replace(/\.\.\.\s*messageParams\b/g, (match) => {
      fixes++;
      return '...params';
    });

    if (fixes > 0) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ Fixed ${fileName} (${fixes} messageParams references)`);
      this.filesFixed++;
      this.totalFixes += fixes;
    }

    return fixes;
  }

  run() {
    console.log('🔍 Finding action files with messageParams errors...\n');
    
    const actionsDir = path.join(
      path.dirname(__dirname),
      'packages/stdlib/src/actions/standard'
    );
    
    if (!fs.existsSync(actionsDir)) {
      throw new Error(`Actions directory not found: ${actionsDir}`);
    }
    
    const files = this.findFiles(actionsDir, /\.ts$/, [
      /-events\.ts$/,
      /index\.ts$/
    ]);

    console.log(`📁 Found ${files.length} action files to check\n`);

    // Process only files that have messageParams issues
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('messageParams')) {
        this.fixFile(file);
      }
    }

    console.log(`\n✅ Fixed ${this.filesFixed} files with ${this.totalFixes} total fixes`);
    console.log('\n📋 Next steps:');
    console.log('1. Run build to check for remaining errors: cd packages/stdlib && pnpm build');
    console.log('2. If build succeeds, run tests: pnpm test');
    console.log('3. Review changes: git diff');
  }
}

// Run the fixer
const fixer = new MessageParamsFixer();
fixer.run();