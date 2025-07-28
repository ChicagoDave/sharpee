const fs = require('fs');
const path = require('path');

console.log('Comprehensive fix for all action files...\n');

const actionsDir = path.join(__dirname, 'packages', 'stdlib', 'src', 'actions', 'standard');

// Get all action directories
const actionDirs = fs.readdirSync(actionsDir)
  .filter(item => fs.statSync(path.join(actionsDir, item)).isDirectory());

let totalFilesProcessed = 0;
let totalFilesFixed = 0;
let totalChanges = 0;

actionDirs.forEach(dir => {
  const dirPath = path.join(actionsDir, dir);
  const files = fs.readdirSync(dirPath)
    .filter(f => f.endsWith('.ts') && !f.includes('-events.ts') && f !== 'index.ts');
  
  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    totalFilesProcessed++;
    
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    let changes = 0;
    
    // Fix 1: Replace actionId: this.id with actionId: context.action.id
    const thisIdCount = (content.match(/actionId:\s*this\.id/g) || []).length;
    if (thisIdCount > 0) {
      content = content.replace(/actionId:\s*this\.id/g, 'actionId: context.action.id');
      changes += thisIdCount;
    }
    
    // Fix 2: Ensure all success events have actionId
    content = content.replace(
      /context\.event\('action\.success',\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\)/g,
      (match, props) => {
        if (!/actionId\s*:/.test(props)) {
          changes++;
          const trimmed = props.trim();
          return `context.event('action.success', {\n        actionId: context.action.id,\n        ${trimmed}\n      })`;
        }
        return match;
      }
    );
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Fixed ${dir}/${file}: ${changes} changes`);
      totalFilesFixed++;
      totalChanges += changes;
    }
  });
});

console.log(`\n📊 Final Summary:`);
console.log(`Files processed: ${totalFilesProcessed}`);
console.log(`Files fixed: ${totalFilesFixed}`);
console.log(`Total changes: ${totalChanges}`);
console.log('\n✅ All action files have been processed and fixed!');
console.log('\nThe build should now succeed. Run:');
console.log('  cd packages/stdlib');
console.log('  pnpm build');
