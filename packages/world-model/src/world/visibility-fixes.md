# Visibility System Fixes

## Issues Found

1. **Worn Items Not Visible**
   - `getInScope` doesn't include worn items in its search
   - `getContents` excludes worn items by default but visibility should include them

2. **Nested Container Visibility**
   - When a container inside another container is opened, items aren't visible
   - The visibility check needs to traverse the full containment chain

3. **Missing getAllContents in getInScope**
   - `getInScope` only gets direct contents, not recursive contents

## Fix Plan

1. Update `getInScope` to include worn items
2. Update `getVisible` to properly handle worn items
3. Ensure container traversal works for nested containers
