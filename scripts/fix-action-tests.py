#!/usr/bin/env python3
"""
Fix action tests to properly simulate CommandValidator behavior.

When entities are not visible/reachable, the CommandValidator won't resolve them,
so actions receive undefined directObject and should return 'no_target' error.
"""

import os
import re

def fix_visibility_tests(content):
    """Fix tests that expect visibility/reachability errors when they should get no_target."""
    
    # Pattern 1: Tests creating entities in different rooms and expecting not_visible
    pattern1 = r'''(test\(['"]\s*should\s+fail\s+when\s+target\s+is\s+not\s+visible[^)]*\)\s*\(\)\s*=>\s*\{[^}]+?)(\s+const\s+context\s*=\s*createRealTestContext\([^,]+,\s*world,\s*\n\s*createCommand\([^,]+,\s*\{\s*\n\s*entity:\s*\w+\s*\n\s*\}\)\s*\n\s*\);[^}]+?expectEvent\([^,]+,\s*'action\.error',\s*\{\s*\n\s*messageId:\s*expect\.stringContaining\('not_visible'\)[^}]+?\}\);)'''
    
    replacement1 = r'''\1
      // In reality, the CommandValidator wouldn't find this entity
      // So we simulate that by not passing an entity
      const context = createRealTestContext(turningAction, world,
        createCommand(IFActions.TURNING, {
          nounPhrase: 'control dial'  // Parser found the words but validator couldn't resolve
        })
      );
      
      const events = turningAction.execute(context);
      
      // Action should return no_target since entity wasn't resolved
      expectEvent(events, 'action.error', {
        messageId: expect.stringContaining('no_target')
      });'''
    
    # Apply similar logic to other visibility/reachability tests
    # This is a simplified example - in practice, you'd want more sophisticated replacements
    
    return content

def process_file(filepath):
    """Process a single test file."""
    print(f"Processing {filepath}...")
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Apply fixes
    content = fix_visibility_tests(content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated {filepath}")
    else:
        print(f"  No changes needed for {filepath}")

def main():
    """Main function to process test files."""
    # Find all action test files
    test_dir = r"C:\repotemp\sharpee\packages\stdlib\tests\unit\actions"
    
    for filename in os.listdir(test_dir):
        if filename.endswith('-golden.test.ts'):
            filepath = os.path.join(test_dir, filename)
            process_file(filepath)

if __name__ == "__main__":
    main()
