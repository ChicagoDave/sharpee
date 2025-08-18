# Choosing the Best Guinea Pig Action for Semantic Grammar

## Evaluation Criteria

A good test case should:
1. **Use multiple semantic properties** (not just one)
2. **Have verb variations** that map to different semantics
3. **Be commonly used** (so we can see impact)
4. **Not be too complex** (manageable scope)
5. **Currently access parsed.extras or parsed.structure**

## Candidate Analysis

### 1. DROPPING ⭐⭐⭐⭐⭐ (Best Candidate)
```typescript
// Current usage:
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drop';
if (verb === 'discard') {
  messageId = 'dropped_carelessly';
}
```

**Pros:**
- Has verb variations: drop, discard, throw, place
- Clear semantic mapping: verb → manner
- Simple action (just moves item to location)
- Currently checks verb text

**Semantic Properties:**
```typescript
{
  manner: 'normal' | 'careful' | 'careless' | 'forceful'
}
```

**Grammar Rules:**
```typescript
{
  pattern: 'VERB NOUN',
  verbs: {
    'drop': { manner: 'normal' },
    'discard': { manner: 'careless' },
    'throw': { manner: 'forceful' },
    'place': { manner: 'careful' }
  }
}
```

### 2. GOING ⭐⭐⭐⭐
```typescript
// Current usage:
const direction = context.command.parsed.extras?.direction as string || 
                 context.command.directObject?.entity?.name;
```

**Pros:**
- Uses extras.direction heavily (13 occurrences)
- Has verb variations: go, walk, run, hurry
- Direction normalization needed (n → north)

**Semantic Properties:**
```typescript
{
  direction: Direction,
  manner?: 'normal' | 'quick' | 'careful'
}
```

**Grammar Rules:**
```typescript
{
  pattern: 'VERB? DIRECTION',
  verbs: {
    'go': { manner: 'normal' },
    'walk': { manner: 'normal' },
    'run': { manner: 'quick' },
    'sneak': { manner: 'stealthy' }
  },
  directions: {
    'n|north': 'north',
    's|south': 'south'
  }
}
```

### 3. PUTTING ⭐⭐⭐⭐
```typescript
// Current usage:
const preposition = context.command.parsed.structure.preposition?.text;
```

**Pros:**
- Uses preposition for spatial relation
- Has verb variations: put, place, insert
- Good example of multi-property semantics

**Semantic Properties:**
```typescript
{
  manner: 'normal' | 'careful' | 'forceful',
  spatialRelation: 'on' | 'in' | 'under'
}
```

**Cons:**
- More complex (needs two objects)
- Spatial relation logic is involved

### 4. EATING/DRINKING ⭐⭐⭐
```typescript
// Current usage:
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'eat';
```

**Pros:**
- Clear verb variations: eat/consume, drink/sip/gulp
- Simple semantic mapping

**Cons:**
- Less commonly used
- Only one semantic property (manner)

### 5. ATTACKING ⭐⭐
```typescript
// Current usage:
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'attack';
const parsed = context.command.parsed;
```

**Pros:**
- Many verb variations: attack, hit, kill, strike

**Cons:**
- Complex action with combat logic
- Too many concerns beyond semantics

## Winner: DROPPING

**Why DROPPING is the best guinea pig:**

1. **Simple enough** - Just moves item from inventory to location
2. **Clear semantic mapping** - Each verb maps to a manner
3. **Currently uses verb checking** - Shows the problem we're solving
4. **Easy to test** - Output varies by manner
5. **Common action** - Used frequently in IF

## Test Implementation Plan

### Step 1: Define Semantic Grammar Rule
```typescript
const droppingRule: SemanticGrammarRule = {
  id: 'drop-basic',
  pattern: 'VERB NOUN',
  verbs: ['drop', 'discard', 'throw', 'place', 'put down'],
  action: 'dropping',
  
  semantics: {
    verbs: {
      'drop': { manner: 'normal' },
      'discard': { manner: 'careless' },
      'throw': { manner: 'forceful', distance: 'far' },
      'place': { manner: 'careful' },
      'put down': { manner: 'careful' }
    }
  }
};
```

### Step 2: Parser Produces Semantic Result
```typescript
// Input: "discard sword"
{
  structure: {
    verb: { text: "discard" },
    directObject: { text: "sword" }
  },
  semantics: {
    action: "dropping",
    manner: "careless"  // From grammar rule
  }
}
```

### Step 3: Update Dropping Action
```typescript
// Before:
const verb = context.command.parsed.structure.verb?.text.toLowerCase() || 'drop';
if (verb === 'discard') {
  messageId = 'dropped_carelessly';
}

// After:
const manner = context.command.semantics.manner || 'normal';
if (manner === 'careless') {
  messageId = 'dropped_carelessly';
}
```

### Step 4: Test Cases
```typescript
describe('Dropping with semantic grammar', () => {
  test('drop uses normal manner', () => {
    const result = parse('drop sword');
    expect(result.semantics.manner).toBe('normal');
  });
  
  test('discard uses careless manner', () => {
    const result = parse('discard sword');
    expect(result.semantics.manner).toBe('careless');
  });
  
  test('place uses careful manner', () => {
    const result = parse('place sword');
    expect(result.semantics.manner).toBe('careful');
  });
  
  test('throw uses forceful manner', () => {
    const result = parse('throw sword');
    expect(result.semantics.manner).toBe('forceful');
  });
});
```

## Success Metrics

The refactoring is successful if:
1. ✅ Action no longer accesses `parsed.structure.verb`
2. ✅ Verb variations work correctly
3. ✅ Messages vary by semantic manner
4. ✅ Tests pass
5. ✅ Grammar rule is declarative and clear

## Next Actions After Success

If DROPPING works well, apply pattern to:
1. **GOING** - For direction normalization
2. **PUTTING** - For spatial relations
3. **EATING/DRINKING** - For simple verb variations
4. Then gradually to all actions

## Alternative: Start with GOING?

GOING could also be a good choice because:
- Most common use of extras (13 times)
- Direction normalization is a clear win
- Shows value of semantic constants

But DROPPING is simpler for proving the concept.