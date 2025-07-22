#!/bin/bash

# Script to fix message ID mismatches in tests
# Updates expect.stringContaining patterns to exact message IDs

cd /mnt/c/repotemp/sharpee/packages/stdlib

# Backup all test files first
echo "Creating backups..."
mkdir -p tests/backups
cp -r tests/unit/actions/*.test.ts tests/backups/

# Function to fix message ID patterns in a file
fix_message_ids() {
    local file=$1
    echo "Fixing $file..."
    
    # Common patterns to fix
    # Pattern 1: stringContaining with simple string
    sed -i "s/expect\.stringContaining('\([^']*\)')/'\1'/g" "$file"
    sed -i 's/expect\.stringContaining("\([^"]*\)")/"\1"/g' "$file"
    
    # Pattern 2: StringContaining (capital S)
    sed -i "s/StringContaining '\([^']*\)'/'\1'/g" "$file"
    sed -i 's/StringContaining "\([^"]*\)"/"\1"/g' "$file"
    
    # Pattern 3: Handle common specific cases
    # accepted -> if.action.answering.accepted
    sed -i "s/'accepted'/'if.action.answering.accepted'/g" "$file"
    sed -i "s/'rejected'/'if.action.answering.rejected'/g" "$file"
    sed -i "s/'noted'/'if.action.answering.noted'/g" "$file"
    sed -i "s/'attacked'/'if.action.attacking.attacked'/g" "$file"
    sed -i "s/'opened'/'if.action.opening.opened'/g" "$file"
    sed -i "s/'closed'/'if.action.closing.closed'/g" "$file"
    sed -i "s/'not_in_room'/'if.action.going.not_in_room'/g" "$file"
    sed -i "s/'door_locked'/'if.action.going.door_locked'/g" "$file"
    sed -i "s/'too_dark'/'if.action.going.too_dark'/g" "$file"
    sed -i "s/'switch_toggled'/'if.action.pushing.switch_toggled'/g" "$file"
    sed -i "s/'found_concealed'/'if.action.searching.found_concealed'/g" "$file"
    sed -i "s/'contents_list'/'if.action.looking.contents_list'/g" "$file"
    sed -i "s/'examine_surroundings'/'if.action.looking.examine_surroundings'/g" "$file"
    sed -i "s/'not_reachable'/'if.action.using.not_reachable'/g" "$file"
    sed -i "s/'target_not_reachable'/'if.action.using.target_not_reachable'/g" "$file"
    sed -i "s/'has_topics'/'if.action.talking.has_topics'/g" "$file"
    sed -i "s/'nothing_to_say'/'if.action.talking.nothing_to_say'/g" "$file"
    sed -i "s/'rotated'/'if.action.turning.rotated'/g" "$file"
    sed -i "s/'spun'/'if.action.turning.spun'/g" "$file"
    sed -i "s/'already_have'/'if.action.removing.already_have'/g" "$file"
    sed -i "s/'container_closed'/'if.action.removing.container_closed'/g" "$file"
    sed -i "s/'too_far'/'if.action.smelling.too_far'/g" "$file"
    sed -i "s/'not_container'/'if.action.putting.not_container'/g" "$file"
}

# Process all test files
for file in tests/unit/actions/*-golden.test.ts; do
    if [ -f "$file" ]; then
        fix_message_ids "$file"
    fi
done

# Also fix other test files
fix_message_ids "tests/unit/actions/closing-golden.test.ts"
fix_message_ids "tests/unit/actions/opening-golden.test.ts"

echo "Message ID fixes complete!"
echo "To see changes: git diff tests/unit/actions/"
echo "To revert: cp -r tests/backups/* tests/unit/actions/"
