const fs = require('fs');
const path = require('path');

// ANSI color codes for better output
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';

console.log('🔧 Fixing actionId in all action success events...\n');

const actionsDir = path.join(__dirname, 'packages', 'stdlib', 'src', 'actions', 'standard');

function getAllActionFiles() {
  const files = [];
  const dirs = fs.readdirSync(actionsDir).filter(item => {
    const itemPath = path.join(actionsDir, item);
    return fs.statSync(itemPath).isDirectory();
  });
  
  dirs.forEach(dir => {
    const dirPath = path.join(actionsDir, dir);
    const tsFiles = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.ts') && !f.includes('-events.ts') && f !== 'index.ts');
    
    tsFiles.forEach(file => {
      files.push({
        dir,
        file,
        path: path.join(dirPath, file)
      });
    });
  });
  
  return files;
}

function fixActionFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let changeCount = 0;
  
  // Pattern to match action.success events and capture everything
  const successEventRegex = /context\.event\('action\.success',\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\)/g;
  
  content = content.replace(successEventRegex, (match, props) => {
    // Check if already has actionId
    if (/actionId\s*:/.test(props)) {
      return match;
    }
    
    changeCount++;
    
    // Find proper indentation from the existing properties
    let indent = '        ';
    const lines = props.split('\n');
    for (const line of lines) {
      const match = line.match(/^(\s+)\w+\s*:/);
      if (match) {
        indent = match[1];
        break;
      }
    }
    
    // Insert actionId as first property
    const trimmedProps = props.replace(/^\s*\n/, '');
    return `context.event('action.success', {\n${indent}actionId: this.id,\n${indent}${trimmedProps.trim()}\n      })`;
  });
  
  return { changed: content !== original, content, changeCount };
}

// Process all files
const files = getAllActionFiles();
console.log(`Found ${files.length} action files to check\n`);

let totalFixed = 0;
let filesFixed = 0;

files.forEach(({ dir, file, path: filePath }) => {
  const result = fixActionFile(filePath);
  
  if (result.changed) {
    fs.writeFileSync(filePath, result.content, 'utf8');
    console.log(`${green}✓${reset} ${dir}/${file} - Fixed ${result.changeCount} success event(s)`);
    filesFixed++;
    totalFixed += result.changeCount;
  } else {
    // Check if file has success events
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes("context.event('action.success'")) {
      console.log(`${green}✓${reset} ${dir}/${file} - Already correct`);
    } else {
      // File has no success events
      console.log(`${yellow}-${reset} ${dir}/${file} - No success events`);
    }
  }
});

console.log(`\n📊 Summary:`);
console.log(`${green}Files fixed:${reset} ${filesFixed}`);
console.log(`${green}Total success events fixed:${reset} ${totalFixed}`);
console.log(`\n✅ All action files processed!`);
console.log('\nNext steps:');
console.log('1. cd packages/stdlib');
console.log('2. pnpm build');
console.log('3. pnpm test');
