#!/usr/bin/env node

/**
 * Fix event structure in stdlib actions - No dependencies version
 * Uses only Node.js built-in modules
 */

const fs = require('fs');
const path = require('path');

class EventStructureFixer {
  constructor() {
    this.changedFiles = 0;
    this.totalChanges = 0;
  }

  /**
   * Recursively find all TypeScript files in a directory
   */
  findFiles(dir, pattern = /\.ts$/, ignore = []) {
    const files = [];
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recurse into subdirectory
        files.push(...this.findFiles(fullPath, pattern, ignore));
      } else if (stat.isFile() && pattern.test(item)) {
        // Check if we should ignore this file
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

  /**
   * Process all action files
   */
  fixAllActions() {
    console.log('🔍 Finding action files...');
    
    const actionsDir = path.join(
      path.dirname(__dirname), // Go up from fix-action-tests to sharpee root
      'packages/stdlib/src/actions/standard'
    );
    
    if (!fs.existsSync(actionsDir)) {
      throw new Error(`Actions directory not found: ${actionsDir}`);
    }
    
    // Find all .ts files, excluding -events.ts and index.ts
    const files = this.findFiles(actionsDir, /\.ts$/, [
      /-events\.ts$/,
      /index\.ts$/
    ]);

    console.log(`📁 Found ${files.length} action files to process`);

    for (const file of files) {
      this.processFile(file);
    }

    console.log(`\n✅ Complete! Modified ${this.changedFiles} files with ${this.totalChanges} changes`);
  }

  /**
   * Process a single file
   */
  processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`\n📄 Processing ${fileName}...`);

    let newContent = content;
    let fileChangeCount = 0;

    // Fix event types with regex
    // Replace if.event.error with action.error
    newContent = newContent.replace(
      /context\.event\(['"]if\.event\.error['"]/g,
      (match) => {
        fileChangeCount++;
        return "context.event('action.error'";
      }
    );

    // Replace if.event.success with action.success
    newContent = newContent.replace(
      /context\.event\(['"]if\.event\.success['"]/g,
      (match) => {
        fileChangeCount++;
        return "context.event('action.success'";
      }
    );

    // Fix error events to add actionId and reason
    newContent = newContent.replace(
      /context\.event\('action\.error',\s*\{([^}]+)\}\)/g,
      (match, properties) => {
        // Check if actionId exists
        const hasActionId = /actionId\s*:/.test(properties);
        
        // Extract messageId value for reason
        const messageIdMatch = properties.match(/messageId\s*:\s*['"]([^'"]+)['"]/);
        const messageId = messageIdMatch ? messageIdMatch[1] : null;
        
        // Build new properties
        let newProps = properties.trim();
        
        // Add actionId if missing
        if (!hasActionId) {
          // Insert actionId at the beginning
          if (newProps.startsWith('\n')) {
            newProps = `\n    actionId: this.id,${newProps}`;
          } else {
            newProps = `\n    actionId: this.id,\n    ${newProps}`;
          }
          fileChangeCount++;
        }
        
        // Add reason if we have messageId and reason doesn't exist
        if (messageId && !/reason\s*:/.test(properties)) {
          newProps = newProps.replace(
            /(messageId\s*:\s*['"][^'"]+['"])/,
            `$1,\n    reason: '${messageId}'`
          );
          fileChangeCount++;
        }
        
        // Fix messageParams -> params
        if (/messageParams\s*:/.test(newProps)) {
          newProps = newProps.replace(/messageParams\s*:/g, 'params:');
          fileChangeCount++;
        }
        
        return `context.event('action.error', {${newProps}\n  })`;
      }
    );

    // Fix success events to add actionId
    newContent = newContent.replace(
      /context\.event\('action\.success',\s*\{([^}]+)\}\)/g,
      (match, properties) => {
        // Check if actionId exists
        const hasActionId = /actionId\s*:/.test(properties);
        
        // Build new properties
        let newProps = properties.trim();
        
        // Add actionId if missing
        if (!hasActionId) {
          // Insert actionId at the beginning
          if (newProps.startsWith('\n')) {
            newProps = `\n    actionId: this.id,${newProps}`;
          } else {
            newProps = `\n    actionId: this.id,\n    ${newProps}`;
          }
          fileChangeCount++;
        }
        
        // Fix messageParams -> params
        if (/messageParams\s*:/.test(newProps)) {
          newProps = newProps.replace(/messageParams\s*:/g, 'params:');
          fileChangeCount++;
        }
        
        return `context.event('action.success', {${newProps}\n  })`;
      }
    );

    // Write file if changed
    if (fileChangeCount > 0) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      this.changedFiles++;
      this.totalChanges += fileChangeCount;
      console.log(`  ✓ Fixed ${fileName} (${fileChangeCount} changes)`);
    } else {
      console.log(`  - No changes needed in ${fileName}`);
    }
  }
}

// Run the fixer
function main() {
  console.log('🚀 Starting event structure fix...\n');
  
  const fixer = new EventStructureFixer();
  
  try {
    fixer.fixAllActions();
    
    console.log('\n📋 Next steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Run tests: cd packages/stdlib && pnpm test');
    console.log('3. Commit if tests pass');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}