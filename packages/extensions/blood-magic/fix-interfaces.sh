#!/bin/bash

# Fix interface naming - SemanticEvent to ISemanticEvent
find src -name "*.ts" -exec sed -i 's/import { SemanticEvent }/import { ISemanticEvent }/g' {} \;
find src -name "*.ts" -exec sed -i 's/: SemanticEvent\[\]/: ISemanticEvent[]/g' {} \;
find src -name "*.ts" -exec sed -i 's/: SemanticEvent\b/: ISemanticEvent/g' {} \;

# Fix ActionContext - context.actor should be derived from world
find src -name "*.ts" -exec sed -i 's/context\.actor\b/context.world.getPlayer()/g' {} \;

# Fix ValidationResult return structure
find src -name "*.ts" -exec sed -i 's/error: /messageKey: /g' {} \;

echo "Fixed interface references in blood-magic extension"