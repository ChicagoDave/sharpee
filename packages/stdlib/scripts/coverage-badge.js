#!/usr/bin/env node
/**
 * Generate coverage summary for stdlib package
 */

const fs = require('fs');
const path = require('path');

const coverageSummaryPath = path.join(__dirname, '../coverage/coverage-summary.json');
const readmePath = path.join(__dirname, '../README.md');

if (!fs.existsSync(coverageSummaryPath)) {
  console.error('Coverage summary not found. Run tests with coverage first: npm run test:coverage');
  process.exit(1);
}

const summary = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf8'));
const total = summary.total;

// Calculate overall percentage
const percentage = Math.round(
  (total.lines.pct + total.statements.pct + total.functions.pct + total.branches.pct) / 4
);

// Determine color based on percentage
let color;
if (percentage >= 90) color = 'brightgreen';
else if (percentage >= 80) color = 'green';
else if (percentage >= 70) color = 'yellow';
else if (percentage >= 60) color = 'orange';
else color = 'red';

console.log('Coverage Summary:');
console.log('================');
console.log(`Lines:      ${total.lines.pct}%`);
console.log(`Statements: ${total.statements.pct}%`);
console.log(`Functions:  ${total.functions.pct}%`);
console.log(`Branches:   ${total.branches.pct}%`);
console.log(`Overall:    ${percentage}%`);

// Update README with badge if it exists
if (fs.existsSync(readmePath)) {
  let readme = fs.readFileSync(readmePath, 'utf8');
  
  // Badge markdown
  const badge = `![Coverage](https://img.shields.io/badge/coverage-${percentage}%25-${color})`;
  
  // Replace existing badge or add new one
  const badgeRegex = /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+\)/;
  
  if (badgeRegex.test(readme)) {
    readme = readme.replace(badgeRegex, badge);
  } else {
    // Add after the first heading
    readme = readme.replace(/^(# .+)$/m, `$1\n\n${badge}`);
  }
  
  fs.writeFileSync(readmePath, readme);
  console.log('\nREADME badge updated!');
}
