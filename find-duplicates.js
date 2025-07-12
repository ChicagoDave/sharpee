import { promises as fs } from 'fs';

async function findDuplicates() {
  const content = await fs.readFile('C:\\repotemp\\sharpee\\packages\\lang-en-us\\src\\data\\templates.ts', 'utf-8');
  const lines = content.split('\n');
  
  const keys = new Map();
  
  lines.forEach((line, index) => {
    const match = line.match(/^\s*'([^']+)':/);
    if (match) {
      const key = match[1];
      if (keys.has(key)) {
        console.log(`Line ${index + 1}: Duplicate key '${key}' (first seen at line ${keys.get(key) + 1})`);
      } else {
        keys.set(key, index);
      }
    }
  });
}

findDuplicates();
