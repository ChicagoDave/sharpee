#!/usr/bin/env node
// Decoder for OTVAL (treasure values) from DINDX.DAT
// Based on FORTRAN source analysis

const fs = require('fs');
const path = require('path');

// Load dindx.dat
const dindxPath = path.join(__dirname, 'dindx.dat');
const dindxLines = fs.readFileSync(dindxPath, 'utf-8').trim().split('\n').map(l => parseInt(l.trim(), 10) || 0);

// Array sizes from DPARAM.FOR
const RMAX = 200;   // rooms
const XXMAX = 1000; // exits
const OMAX = 300;   // objects

// Calculate offsets (0-indexed lines)
// Lines 1-3 (idx 0-2): Version
// Lines 4-6 (idx 3-5): MXSCOR, STRBIT, EGMXSC
// Line 7 (idx 6): RLNT
// Line 8 (idx 7): RDESC2
// Lines 9-208 (idx 8-207): RDESC1[200]
// Lines 209-408 (idx 208-407): REXIT[200]
// Lines 409-608 (idx 408-607): RACTIO[200]
// Lines 609-808 (idx 608-807): RVAL[200]
// Lines 809-1008 (idx 808-1007): RFLAG[200]
// Line 1009 (idx 1008): XLNT
// Lines 1010-2009 (idx 1009-2008): TRAVEL[1000]
// Line 2010 (idx 2009): OLNT
// Lines 2011-2310 (idx 2010-2309): ODESC1[300]
// Lines 2311-2610 (idx 2310-2609): ODESC2[300]
// Lines 2611-2910 (idx 2610-2909): ODESCO[300]
// Lines 2911-3210 (idx 2910-3209): OACTIO[300]
// Lines 3211-3510 (idx 3210-3509): OFLAG1[300]
// Lines 3511-3810 (idx 3510-3809): OFLAG2[300]
// Lines 3811-4110 (idx 3810-4109): OFVAL[300]
// Lines 4111-4410 (idx 4110-4409): OTVAL[300]

const OTVAL_START = 4110;  // 0-indexed start of OTVAL array

// Object names from DPARAM.FOR (1-indexed in FORTRAN)
const OBJECTS = {
  2: 'GARLIC',
  3: 'FOOD (hot peppers)',
  4: 'GUNK',
  5: 'COAL',
  7: 'MACHINE',
  8: 'DIAMOND',
  9: 'TROPHY_CASE',
  10: 'BOTTLE',
  11: 'WATER',
  12: 'ROPE',
  13: 'KNIFE',
  14: 'SWORD',
  15: 'LAMP',
  16: 'BROKEN_LAMP',
  17: 'RUG',
  18: 'LEAVES',
  19: 'TROLL',
  20: 'AXE',
  23: 'KEYS',
  24: 'RUSTY_KNIFE',
  25: 'BAG_OF_COINS',
  26: 'PLATINUM_BAR',
  30: 'ICE (glacier)',
  33: 'COFFIN',
  34: 'TORCH',
  35: 'TRUE_BASKET',
  36: 'FALSE_BASKET',
  38: 'TIMBER',
  39: 'IRON_BOX',
  40: 'STRADIVARIUS (violin)',
  42: 'GHOST (spirits)',
  45: 'TRUNK',
  46: 'BELL',
  47: 'BOOK',
  48: 'CANDLES',
  49: 'GUIDEBOOK',
  51: 'MATCHES',
  53: 'MAILBOX',
  54: 'TUBE',
  55: 'PUTTY',
  56: 'WRENCH',
  57: 'SCREWDRIVER',
  58: 'CYCLOPS',
  59: 'CHALICE',
  61: 'THIEF',
  62: 'STILETTO',
  63: 'WINDOW',
  65: 'GRATING',
  66: 'DOOR',
  71: 'HEAD_ON_POLE',
  75: 'RAILING',
  78: 'LEAK',
  79: 'RED_BUTTON',
  85: 'POT_OF_GOLD',
  86: 'STATUE',
  87: 'INFLATABLE_BOAT',
  88: 'DEAD_BOAT',
  89: 'PUMP',
  90: 'INFLATED_BOAT',
  91: 'BOAT_LABEL',
  92: 'STICK',
  93: 'BARREL',
  94: 'BUOY',
  96: 'SHOVEL',
  97: 'GUANO',
  98: 'BALLOON',
  99: 'RECEPTACLE',
  101: 'BRAIDED_ROPE',
  102: 'HOOK1',
  103: 'HOOK2',
  104: 'ZORKMID_COIN',
  105: 'SAFE',
  106: 'CARD',
  107: 'SAFE_SLOT',
  109: 'BRICK (bomb)',
  110: 'FUSE',
  111: 'GNOME (volcano)',
  112: 'BALLOON_LABEL',
  113: 'DEAD_BALLOON',
  119: 'TOMB',
  123: 'LARGE_CASE',
  124: 'CAGE',
  125: 'REAL_CAGE',
  126: 'WHITE_CRYSTAL_SPHERE',
  127: 'SQUARE_BUTTON',
  132: 'FLASK',
  133: 'POOL',
  134: 'SAFFRON (spices)',
  137: 'BUCKET',
  138: 'EATME_CAKE',
  139: 'ORANGE_ICING',
  140: 'RED_ICING',
  141: 'BLUE_ICING',
  142: 'ROBOT',
  143: 'ROBOT_LABEL',
  144: 'TREE_TRUNK',
  145: 'FOOT_OF_TREE',
  148: 'PILE_OF_BILLS',
  149: 'PORTRAIT',
  151: 'SCREEN_OF_LIGHT',
  152: 'GNOME_OF_ZURICH',
  153: 'NEST',
  154: 'EGG',
  155: 'BROKEN_EGG',
  156: 'BAUBLE',
  157: 'CANARY',
  158: 'BROKEN_CANARY',
  159: 'YELLOW_WALL',
  161: 'RED_WALL',
  164: 'PINE_DOOR',
  171: 'RED_BEAM',
  172: 'ENDGAME_DOOR_O',
  173: 'ENDGAME_DOOR_Q',
  175: 'ENDGAME_DOOR_C',
  178: 'NUMERAL_1',
  185: 'NUMERAL_8',
  186: 'WARNING',
  187: 'CARD_SLIT',
  188: 'GOLD_CARD',
  189: 'STEEL_DOOR',
  190: 'HOT_BELL',
  195: 'BROCHURE',
  196: 'STAMP',
  197: 'PALANTIR_DOOR',
  200: 'LID1',
  201: 'LID2',
  202: 'KEYHOLE1',
  203: 'KEYHOLE2',
  205: 'RUSTY_KEY',
  206: 'BLUE_CRYSTAL_SPHERE (palantir)',
  207: 'WELCOME_MAT',
  209: 'RED_CRYSTAL_SPHERE (pal3)',
};

// Extract MXSCOR from line 4 (index 3)
const MXSCOR = dindxLines[3];
console.log(`MXSCOR (max score): ${MXSCOR}`);
console.log(`STRBIT: ${dindxLines[4]}`);
console.log(`EGMXSC (endgame max): ${dindxLines[5]}`);
console.log('');

// Extract all OTVAL values
const treasures = [];
let total = 0;

for (let i = 1; i <= OMAX; i++) {
  const value = dindxLines[OTVAL_START + i - 1];  // FORTRAN 1-indexed
  if (value > 0) {
    const name = OBJECTS[i] || `OBJECT_${i}`;
    treasures.push({ id: i, name, value });
    total += value;
  }
}

console.log('='.repeat(60));
console.log('TREASURES WITH POINT VALUES');
console.log('='.repeat(60));
treasures.sort((a, b) => b.value - a.value);
for (const t of treasures) {
  console.log(`${t.id.toString().padStart(3)} ${t.name.padEnd(35)} ${t.value.toString().padStart(3)} pts`);
}

console.log('='.repeat(60));
console.log(`Total treasures: ${treasures.length}`);
console.log(`Total points: ${total}`);
console.log(`Expected (MXSCOR): ${MXSCOR}`);
console.log(`Match: ${total === MXSCOR ? 'YES' : 'NO - DISCREPANCY!'}`);

// Also check dynamic values (egg, canary)
console.log('\n' + '='.repeat(60));
console.log('DYNAMIC TREASURES (value changes based on state)');
console.log('='.repeat(60));
const dynamicNotes = [
  { id: 154, note: 'EGG - starts at 5, but BEGG (broken egg) gets 2 if opened wrong' },
  { id: 157, note: 'CANARY - starts at 6, but BCANA (broken canary) gets 1 if damaged' },
];
for (const d of dynamicNotes) {
  console.log(`${d.id}: ${d.note}`);
}

// Export for documentation
const output = ['# Mainframe Zork Treasure Values', ''];
output.push(`Total Points: ${MXSCOR}`);
output.push(`Endgame Bonus: ${dindxLines[5]}`);
output.push('');
output.push('| ID | Object | Points |');
output.push('|----|--------|--------|');
for (const t of treasures.sort((a, b) => a.id - b.id)) {
  output.push(`| ${t.id} | ${t.name} | ${t.value} |`);
}
output.push('');
output.push('## Notes');
output.push('- EGG (154): Worth 5 points intact. If opened incorrectly, BROKEN_EGG (155) worth 2 points.');
output.push('- CANARY (157): Worth 6 points intact. If damaged, BROKEN_CANARY (158) worth 1 point.');
output.push('- STRADIVARIUS (40): Worth 10 points intact. If attacked, value becomes 0.');

fs.writeFileSync(path.join(__dirname, 'treasure-values.md'), output.join('\n'));
console.log('\nWrote treasure-values.md');
