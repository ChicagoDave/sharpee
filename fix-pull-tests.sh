#!/bin/bash

# Fix all pull test context creation
file="/mnt/c/repotemp/sharpee/packages/stdlib/tests/unit/actions/pulling/pull-simple.test.ts"

# Replace each test's pull call with proper context creation
sed -i 's/const result = pull({ target: lever }, context);/const command = createCommand(IFActions.PULLING, { entity: lever });\n      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);\n      const result = pull({ target: lever }, context);/g' "$file"

sed -i 's/const result = pull({ target: cord }, context);/const command = createCommand(IFActions.PULLING, { entity: cord });\n      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);\n      const result = pull({ target: cord }, context);/g' "$file"

sed -i 's/const result = pull({ target: attachedObject }, context);/const command = createCommand(IFActions.PULLING, { entity: attachedObject });\n      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);\n      const result = pull({ target: attachedObject }, context);/g' "$file"

sed -i 's/const result = pull({ target: heavyObject }, context);/const command = createCommand(IFActions.PULLING, { entity: heavyObject });\n      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);\n      const result = pull({ target: heavyObject }, context);/g' "$file"

sed -i 's/const result = pull({ target: nonPullable }, context);/const command = createCommand(IFActions.PULLING, { entity: nonPullable });\n      const context = createRealTestContext({ id: IFActions.PULLING }, world, command);\n      const result = pull({ target: nonPullable }, context);/g' "$file"

# Fix the one case where bell is created
sed -i "s/const bell = context\.world\.createEntity('bell1', 'brass bell');/const bell = world.createEntity('bell1', 'object');\n      bell.name = 'brass bell';/g" "$file"
sed -i "s/context\.world\.setLocation(bell\.id, context\.room\.id);/world.moveEntity(bell.id, room.id);/g" "$file"

# Fix the one case where nonPullable is created
sed -i "s/const nonPullable = context\.world\.createEntity('wall', 'solid wall');/const nonPullable = world.createEntity('wall', 'object');\n      nonPullable.name = 'solid wall';/g" "$file"

echo "Fixed pull test contexts"