#!/usr/bin/env node
// Analyze scoring components from dindx.dat

const fs = require('fs');
const path = require('path');

const dindxPath = path.join(__dirname, 'dindx.dat');
const lines = fs.readFileSync(dindxPath, 'utf-8').trim().split('\n').map(l => parseInt(l.trim(), 10) || 0);

const RMAX = 200;
const OMAX = 300;

// REND flag = '20'O = 16 octal = 16 decimal
const REND = parseInt('20', 8);

console.log('=== RFLAG with REND (endgame) bit ===');
for (let i = 1; i <= RMAX; i++) {
  const rflag = lines[808 + i - 1];
  if ((rflag & REND) !== 0) {
    const rval = lines[608 + i - 1];
    console.log('Room ' + i + ': RFLAG=' + rflag.toString(8) + 'o, RVAL=' + rval);
  }
}

// Calculate RVAL by category
console.log('\n=== Non-zero RVAL by room ===');
let rvalMain = 0;
let rvalEnd = 0;
for (let i = 1; i <= RMAX; i++) {
  const val = lines[608 + i - 1];
  const rflag = lines[808 + i - 1];
  const isEndgame = (rflag & REND) !== 0;
  if (val > 0) {
    console.log('Room ' + i + ': ' + val + ' pts' + (isEndgame ? ' (ENDGAME)' : ''));
    if (isEndgame) {
      rvalEnd += val;
    } else {
      rvalMain += val;
    }
  }
}
console.log('\nRVAL main: ' + rvalMain + ', endgame: ' + rvalEnd);

// STRBIT marks boundary of "normal" objects
const STRBIT = lines[4];  // 210
console.log('\nSTRBIT = ' + STRBIT);

console.log('\n=== Non-zero OFVAL/OTVAL by object ===');
let ofvalMain = 0, ofvalEnd = 0;
let otvalMain = 0, otvalEnd = 0;
for (let i = 1; i <= OMAX; i++) {
  const ofval = lines[3810 + i - 1];
  const otval = lines[4110 + i - 1];
  const isEndgame = i > STRBIT;
  if (ofval > 0 || otval > 0) {
    console.log('Obj ' + i + ': OFVAL=' + ofval + ', OTVAL=' + otval + (isEndgame ? ' (ENDGAME)' : ''));
    if (isEndgame) {
      ofvalEnd += ofval;
      otvalEnd += otval;
    } else {
      ofvalMain += ofval;
      otvalMain += otval;
    }
  }
}

console.log('\n=== SUMMARY ===');
console.log('Main game RVAL: ' + rvalMain);
console.log('Main game OFVAL: ' + ofvalMain);
console.log('Main game OTVAL: ' + otvalMain);
console.log('Main game total: ' + (rvalMain + ofvalMain + otvalMain));
console.log('');
console.log('Endgame RVAL: ' + rvalEnd);
console.log('Endgame OFVAL: ' + ofvalEnd);
console.log('Endgame OTVAL: ' + otvalEnd);
console.log('Endgame total: ' + (rvalEnd + ofvalEnd + otvalEnd));
console.log('');
console.log('MXSCOR: ' + lines[3]);
console.log('EGMXSC: ' + lines[5]);
