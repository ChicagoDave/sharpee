# Low Coverage Analysis - stdlib Package

## Root Cause
The low coverage (6-10% in actions) is because:

### 📊 The Numbers
- **46 action files** in `src/actions/standard/`
- **Only 2 actions tested**: closing.ts (100%) and waiting.ts (92%)
- **44 actions untested**: Each has ~3-5% coverage (just exports)

### 🧮 The Math
- Average coverage = (2 × 95% + 44 × 4%) / 46 ≈ 8%
- Each untested file drastically pulls down the percentage

## Why This Happened
1. All 46 standard IF actions were stubbed out as placeholders
2. Only 2 have been fully implemented with tests
3. Jest includes ALL source files in coverage calculation

## Solutions

### Option 1: Exclude Untested Actions (Quick)
Modify jest.config.js to only include tested actions in coverage

### Option 2: Lower Thresholds (Realistic)
Set thresholds appropriate for early development:
- 20% for initial phase
- Increase as more actions are tested

### Option 3: Add More Tests (Best Long-term)
Each new action test will improve coverage by ~2%

## Not a Code Quality Issue!
The tested code (closing, waiting, registry, validator) has excellent coverage (85-100%). The low percentage is purely due to including 44 stub files in the calculation.
