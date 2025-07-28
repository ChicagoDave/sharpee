#!/usr/bin/env node

/**
 * Fix event structure in stdlib actions - Complete fix
 * This version handles all the issues properly
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

  /**
   * Process all action files
   */
  fixAllActions() {
    console.log('🔍 Finding action files...');
    
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

    console.log(`📁 Found ${files.length} action files to process`);

    for (const file of files) {
      this.processFile(file);
    }

    console.log(`\n✅ Complete! Modified ${this.changedFiles} files with ${this.totalChanges} changes`);
  }

  /**
   * Process a single file with complete fixes
   */
  processFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    
    console.log(`\n📄 Processing ${fileName}...`);

    let newContent = content;
    let fileChangeCount = 0;

    // Step 1: Fix event types
    newContent = newContent.replace(
      /context\.event\(['"]if\.event\.error['"]/g,
      "context.event('action.error'"
    );
    
    newContent = newContent.replace(
      /context\.event\(['"]if\.event\.success['"]/g,
      "context.event('action.success'"
    );

    // Step 2: Fix ALL messageParams to params
    newContent = newContent.replace(/messageParams\s*:/g, 'params:');

    // Step 3: Process error events more carefully
    // This regex captures the full event call including multi-line content
    newContent = newContent.replace(
      /context\.event\('action\.error',\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\)/g,
      (match, properties) => {
        fileChangeCount++;
        
        // Parse existing properties
        const hasActionId = /actionId\s*:/.test(properties);
        const hasReason = /reason\s*:/.test(properties);
        
        // Extract messageId value
        const messageIdMatch = properties.match(/messageId\s*:\s*['"`]([^'"`]+)['"`]/);
        const messageId = messageIdMatch ? messageIdMatch[1] : null;
        
        // Clean up properties
        let cleanProps = properties.trim();
        
        // Build ordered properties
        let newProps = [];
        
        // Add actionId first if missing
        if (!hasActionId) {
          newProps.push('actionId: this.id');
        }
        
        // Process existing properties
        const propLines = cleanProps.split(/,(?![^{}\[\]]*[\}\]])/);
        
        propLines.forEach(prop => {
          const trimmedProp = prop.trim();
          if (trimmedProp) {
            // Skip if we're going to add it
            if (!hasActionId && trimmedProp.includes('actionId:')) return;
            if (!hasReason && trimmedProp.includes('reason:')) return;
            
            // Add the property
            newProps.push(trimmedProp);
            
            // If this is messageId and we don't have reason, add it after
            if (trimmedProp.includes('messageId:') && !hasReason && messageId) {
              newProps.push(`reason: '${messageId}'`);
            }
          }
        });
        
        // Format with proper indentation
        const formattedProps = newProps.map((prop, i) => {
          return i === 0 ? `\n        ${prop}` : `        ${prop}`;
        }).join(',\n');
        
        return `context.event('action.error', {${formattedProps}\n      })`;
      }
    );

    // Step 4: Process success events
    newContent = newContent.replace(
      /context\.event\('action\.success',\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\)/g,
      (match, properties) => {
        fileChangeCount++;
        
        const hasActionId = /actionId\s*:/.test(properties);
        
        // Clean up properties
        let cleanProps = properties.trim();
        
        // Build ordered properties
        let newProps = [];
        
        // Add actionId first if missing
        if (!hasActionId) {
          newProps.push('actionId: this.id');
        }
        
        // Process existing properties
        const propLines = cleanProps.split(/,(?![^{}\[\]]*[\}\]])/);
        
        propLines.forEach(prop => {
          const trimmedProp = prop.trim();
          if (trimmedProp && (!hasActionId || !trimmedProp.includes('actionId:'))) {
            newProps.push(trimmedProp);
          }
        });
        
        // Format with proper indentation
        const formattedProps = newProps.map((prop, i) => {
          return i === 0 ? `\n        ${prop}` : `        ${prop}`;
        }).join(',\n');
        
        return `context.event('action.success', {${formattedProps}\n      })`;
      }
    );

    // Count actual changes
    if (newContent !== content) {
      // Count how many actual replacements were made
      const errorMatches = (newContent.match(/context\.event\('action\.error'/g) || []).length;
      const successMatches = (newContent.match(/context\.event\('action\.success'/g) || []).length;
      const oldErrorMatches = (content.match(/context\.event\('if\.event\.error'/g) || []).length;
      const oldSuccessMatches = (content.match(/context\.event\('if\.event\.success'/g) || []).length;
      
      fileChangeCount = (errorMatches - oldErrorMatches) + (successMatches - oldSuccessMatches);
      
      if (fileChangeCount > 0 || content.includes('messageParams')) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        this.changedFiles++;
        this.totalChanges += fileChangeCount;
        console.log(`  ✓ Fixed ${fileName} (${fileChangeCount} event fixes)`);
      }
    } else {
      console.log(`  - No changes needed in ${fileName}`);
    }
  }
}

// Run the fixer
function main() {
  console.log('🚀 Starting complete event structure fix...\n');
  
  const fixer = new EventStructureFixer();
  
  try {
    fixer.fixAllActions();
    
    console.log('\n📋 Next steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Run tests: cd packages/stdlib && pnpm test');
    console.log('3. If tests still fail, check the specific error messages');
    console.log('4. Commit if tests pass');
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