#!/bin/bash

# Fix imports from @sharpee/core
echo "Fixing @sharpee/core imports..."
find packages/stdlib/src -name "*.ts" -type f -exec sed -i \
  -e "s/import { SemanticEvent }/import { ISemanticEvent }/g" \
  -e "s/import { SystemEvent }/import { ISystemEvent }/g" \
  -e "s/import { GenericEventSource }/import { IGenericEventSource }/g" \
  -e "s/import { QueryHandler }/import { IQueryHandler }/g" \
  -e "s/import { PendingQuery }/import { IPendingQuery }/g" \
  -e "s/import { QueryResponse }/import { IQueryResponse }/g" \
  -e "s/import { QuitContext }/import { IQuitContext }/g" \
  -e "s/import { RestartContext }/import { IRestartContext }/g" \
  -e "s/: SemanticEvent\[\]/: ISemanticEvent[]/g" \
  -e "s/: SemanticEvent\>/: ISemanticEvent/g" \
  -e "s/extends SemanticEvent/extends ISemanticEvent/g" \
  -e "s/SemanticEvent\[\]/ISemanticEvent[]/g" \
  {} +

# Fix imports from @sharpee/world-model
echo "Fixing @sharpee/world-model imports..."
find packages/stdlib/src -name "*.ts" -type f -exec sed -i \
  -e "s/import { CapabilityData }/import { ICapabilityData }/g" \
  -e "s/import { ValidatedCommand }/import { IValidatedCommand }/g" \
  -e "s/import { CapabilitySchema }/import { ICapabilitySchema }/g" \
  -e "s/import { ParsedCommand }/import { IParsedCommand }/g" \
  -e "s/import { NounPhrase }/import { INounPhrase }/g" \
  -e "s/import { ValidatedObjectReference }/import { IValidatedObjectReference }/g" \
  -e "s/import { ValidationError }/import { IValidationError }/g" \
  -e "s/: ValidatedCommand/: IValidatedCommand/g" \
  -e "s/: CapabilityData/: ICapabilityData/g" \
  -e "s/: CapabilitySchema/: ICapabilitySchema/g" \
  {} +

# Fix multi-import lines
echo "Fixing multi-import lines..."
find packages/stdlib/src -name "*.ts" -type f -exec sed -i \
  -e "s/SemanticEvent,/ISemanticEvent,/g" \
  -e "s/, SemanticEvent/, ISemanticEvent/g" \
  -e "s/SystemEvent,/ISystemEvent,/g" \
  -e "s/, SystemEvent/, ISystemEvent/g" \
  -e "s/GenericEventSource,/IGenericEventSource,/g" \
  -e "s/, GenericEventSource/, IGenericEventSource/g" \
  -e "s/QueryHandler,/IQueryHandler,/g" \
  -e "s/, QueryHandler/, IQueryHandler/g" \
  -e "s/PendingQuery,/IPendingQuery,/g" \
  -e "s/, PendingQuery/, IPendingQuery/g" \
  -e "s/QueryResponse,/IQueryResponse,/g" \
  -e "s/, QueryResponse/, IQueryResponse/g" \
  -e "s/QuitContext,/IQuitContext,/g" \
  -e "s/, QuitContext/, IQuitContext/g" \
  -e "s/RestartContext,/IRestartContext,/g" \
  -e "s/, RestartContext/, IRestartContext/g" \
  -e "s/CapabilityData,/ICapabilityData,/g" \
  -e "s/, CapabilityData/, ICapabilityData/g" \
  -e "s/ValidatedCommand,/IValidatedCommand,/g" \
  -e "s/, ValidatedCommand/, IValidatedCommand/g" \
  -e "s/CapabilitySchema,/ICapabilitySchema,/g" \
  -e "s/, CapabilitySchema/, ICapabilitySchema/g" \
  -e "s/ParsedCommand,/IParsedCommand,/g" \
  -e "s/, ParsedCommand/, IParsedCommand/g" \
  -e "s/NounPhrase,/INounPhrase,/g" \
  -e "s/, NounPhrase/, INounPhrase/g" \
  -e "s/ValidatedObjectReference,/IValidatedObjectReference,/g" \
  -e "s/, ValidatedObjectReference/, IValidatedObjectReference/g" \
  -e "s/ValidationError,/IValidationError,/g" \
  -e "s/, ValidationError/, IValidationError/g" \
  {} +

echo "Import fixes complete!"