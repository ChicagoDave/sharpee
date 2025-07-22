#!/usr/bin/env python3
"""
Update action tests to match the CommandValidator design.

Key principles:
1. CommandValidator resolves entities before passing to actions
2. If entity is not in scope, action receives undefined directObject
3. Actions should check for missing entities and return appropriate errors
"""

import os
import re
import sys

# Test patterns that need updating
PATTERNS_TO_FIX = [
    # Pattern: Tests expecting "not_holding" when they should get "no_item"
    {
        'name': 'not_holding to no_item',
        'files': ['throwing-golden.test.ts', 'dropping-golden.test.ts'],
        'old_pattern': r"expectEvent\(events, 'action\.error', \{\s*messageId: expect\.stringContaining\('not_holding'\)",
        'new_pattern': "expectEvent(events, 'action.error', {\n        messageId: expect.stringContaining('no_item')"
    },
    
    # Pattern: Tests expecting "target_not_visible" when they should get "no_item"  
    {
        'name': 'target_not_visible to no_item',
        'files': ['throwing-golden.test.ts'],
        'old_pattern': r"expectEvent\(events, 'action\.error', \{\s*messageId: expect\.stringContaining\('target_not_visible'\)",
        'new_pattern': "expectEvent(events, 'action.error', {\n        messageId: expect.stringContaining('no_item')"
    },
    
    # Pattern: Tests expecting "not_lockable" when they should get "no_target"
    {
        'name': 'not_lockable to no_target',
        'files': ['unlocking-golden.test.ts', 'locking-golden.test.ts'],
        'old_pattern': r"expectEvent\(events, 'action\.error', \{\s*messageId: expect\.stringContaining\('not_lockable'\)",
        'new_pattern': "expectEvent(events, 'action.error', {\n        messageId: expect.stringContaining('no_target')"
    },

    # Pattern: Tests expecting specific errors for entities in wrong locations
    {
        'name': 'entity location errors to no_target',
        'files': ['opening-golden.test.ts', 'closing-golden.test.ts', 'unlocking-golden.test.ts'],
        'old_pattern': r"expectEvent\(events, 'action\.error', \{\s*messageId: expect\.stringContaining\('(not_openable|already_open|locked|already_unlocked)'\)",
        'new_pattern': "expectEvent(events, 'action.error', {\n        messageId: expect.stringContaining('no_target')"
    },
    
    # Pattern: Tests expecting "not_held" when they should get "no_target"
    {
        'name': 'not_held to no_target',
        'files': ['dropping-golden.test.ts'],
        'old_pattern': r"expectEvent\(events, 'action\.error', \{\s*messageId: expect\.stringContaining\('not_held'\)",
        'new_pattern': "expectEvent(events, 'action.error', {\n        messageId: expect.stringContaining('no_target')"
    },
]

def update_file(filepath, pattern_info):
    """Update a single file with the given pattern."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Apply the pattern replacement
    content = re.sub(pattern_info['old_pattern'], pattern_info['new_pattern'], content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    test_dir = r"C:\repotemp\sharpee\packages\stdlib\tests\unit\actions"
    
    total_updates = 0
    
    for pattern in PATTERNS_TO_FIX:
        print(f"\nApplying pattern: {pattern['name']}")
        
        for filename in pattern['files']:
            filepath = os.path.join(test_dir, filename)
            
            if not os.path.exists(filepath):
                print(f"  Skipping {filename} - file not found")
                continue
                
            if update_file(filepath, pattern):
                print(f"  Updated {filename}")
                total_updates += 1
            else:
                print(f"  No changes needed for {filename}")
    
    print(f"\nTotal files updated: {total_updates}")

if __name__ == "__main__":
    main()
