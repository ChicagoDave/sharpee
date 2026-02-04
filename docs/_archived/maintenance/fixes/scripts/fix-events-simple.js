#!/usr/bin/env node

/**
 * Fix event structure in stdlib actions - Pure JavaScript version
 * No TypeScript compilation required
 */

const fs = require('fs');
const path = require('path');

// Check if glob is available, if not, use built-in alternative
let glob;
try {
  glob = require('glob');
} catch (e) {
  // Fallback to manual directory walking
  console.log('📦 Installing glob...');
  const { execSync } = require('child_process');
  execSync('npm install glob', { stdio: 'inherit' });
  glob = require('glob');
}

class EventStructureFixer {
  constructor() {
    this.changedFiles = 0;
    this.totalChanges = 0;
  }

  /**
   * Process all action files
   */
  fixAllActions() {
    console.log('🔍 Finding action files...');
    
    const pattern = path.join(
      path.dirname(__dirname), // Go up from fix-action-tests to sharpee root
      'packages/stdlib/src/actions/standard/**/*.ts'
    );
    
    const files = glob.sync(pattern, {
      ignore: ['**/*-events.ts', '**/index.ts']
    });

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
      /context\.event\('action\.error',\s*{([^}]+)}\)/g,
      (match, properties) => {
        fileChangeCount++;
        
        // Check if actionId exists
        const hasActionId = /actionId\s*:/.test(properties);
        
        // Extract messageId value for reason
        const messageIdMatch = properties.match(/messageId\s*:\s*['"]([^'"]+)['"]/);
        const messageId = messageIdMatch ? messageIdMatch[1] : null;
        
        // Build new properties
        let newProps = properties.trim();
        
        // Add actionId if missing
        if (!hasActionId) {
          newProps = `\n    actionId: this.id,${newProps ? '\n    ' + newProps : ''}`;
        }
        
        // Add reason if we have messageId and reason doesn't exist
        if (messageId && !/reason\s*:/.test(properties)) {
          newProps = newProps.replace(
            /(messageId\s*:\s*['"][^'"]+['"])/,
            `$1,\n    reason: '${messageId}'`
          );
        }
        
        // Fix messageParams -> params
        newProps = newProps.replace(/messageParams\s*:/g, 'params:');
        
        return `context.event('action.error', {${newProps}\n  })`;
      }
    );

    // Fix success events to add actionId
    newContent = newContent.replace(
      /context\.event\('action\.success',\s*{([^}]+)}\)/g,
      (match, properties) => {
        fileChangeCount++;
        
        // Check if actionId exists
        const hasActionId = /actionId\s*:/.test(properties);
        
        // Build new properties
        let newProps = properties.trim();
        
        // Add actionId if missing
        if (!hasActionId) {
          newProps = `\n    actionId: this.id,${newProps ? '\n    ' + newProps : ''}`;
        }
        
        // Fix messageParams -> params
        newProps = newProps.replace(/messageParams\s*:/g, 'params:');
        
        return `context.event('action.success', {${newProps}\n  })`;
      }
    );

    // Write file if changed
    if (fileChangeCount > 0) {
      fs.writeFileSync(filePath, newContent);
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
  console.log('🚀 Starting event structure fix (JavaScript version)...\n');
  
  const fixer = new EventStructureFixer();
  
  try {
    fixer.fixAllActions();
    
    console.log('\n📋 Next steps:');
    console.log('1. Review changes: git diff');
    console.log('2. Run tests: cd packages/stdlib && pnpm test');
    console.log('3. Commit if tests pass');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}