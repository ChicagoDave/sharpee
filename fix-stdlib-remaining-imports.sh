#!/bin/bash

# Fix remaining imports in stdlib to use I-prefixed interfaces

echo "Fixing remaining imports in stdlib..."

# Core package imports
find packages/stdlib/src -name "*.ts" -exec sed -i \
  -e "s/import \(.*\){ SemanticEvent }/import \1{ ISemanticEvent }/g" \
  -e "s/import \(.*\){ SemanticEvent,/import \1{ ISemanticEvent,/g" \
  -e "s/, SemanticEvent }/, ISemanticEvent }/g" \
  -e "s/, SemanticEvent,/, ISemanticEvent,/g" \
  -e "s/{ SystemEvent }/{ ISystemEvent }/g" \
  -e "s/{ SystemEvent,/{ ISystemEvent,/g" \
  -e "s/, SystemEvent }/, ISystemEvent }/g" \
  -e "s/, SystemEvent,/, ISystemEvent,/g" \
  -e "s/{ GenericEventSource }/{ IGenericEventSource }/g" \
  -e "s/{ GenericEventSource,/{ IGenericEventSource,/g" \
  -e "s/, GenericEventSource }/, IGenericEventSource }/g" \
  -e "s/, GenericEventSource,/, IGenericEventSource,/g" \
  -e "s/{ QueryHandler }/{ IQueryHandler }/g" \
  -e "s/{ QueryHandler,/{ IQueryHandler,/g" \
  -e "s/, QueryHandler }/, IQueryHandler }/g" \
  -e "s/, QueryHandler,/, IQueryHandler,/g" \
  -e "s/{ PendingQuery }/{ IPendingQuery }/g" \
  -e "s/{ PendingQuery,/{ IPendingQuery,/g" \
  -e "s/, PendingQuery }/, IPendingQuery }/g" \
  -e "s/, PendingQuery,/, IPendingQuery,/g" \
  -e "s/{ QueryResponse }/{ IQueryResponse }/g" \
  -e "s/{ QueryResponse,/{ IQueryResponse,/g" \
  -e "s/, QueryResponse }/, IQueryResponse }/g" \
  -e "s/, QueryResponse,/, IQueryResponse,/g" \
  -e "s/{ QuitContext }/{ IQuitContext }/g" \
  -e "s/{ QuitContext,/{ IQuitContext,/g" \
  -e "s/, QuitContext }/, IQuitContext }/g" \
  -e "s/, QuitContext,/, IQuitContext,/g" \
  -e "s/{ RestartContext }/{ IRestartContext }/g" \
  -e "s/{ RestartContext,/{ IRestartContext,/g" \
  -e "s/, RestartContext }/, IRestartContext }/g" \
  -e "s/, RestartContext,/, IRestartContext,/g" \
  -e "s/{ SaveContext }/{ ISaveContext }/g" \
  -e "s/{ SaveContext,/{ ISaveContext,/g" \
  -e "s/, SaveContext }/, ISaveContext }/g" \
  -e "s/, SaveContext,/, ISaveContext,/g" \
  -e "s/{ RestoreContext }/{ IRestoreContext }/g" \
  -e "s/{ RestoreContext,/{ IRestoreContext,/g" \
  -e "s/, RestoreContext }/, IRestoreContext }/g" \
  -e "s/, RestoreContext,/, IRestoreContext,/g" \
  {} \;

# World-model package imports
find packages/stdlib/src -name "*.ts" -exec sed -i \
  -e "s/{ CloseResult }/{ ICloseResult }/g" \
  -e "s/{ CloseResult,/{ ICloseResult,/g" \
  -e "s/, CloseResult }/, ICloseResult }/g" \
  -e "s/, CloseResult,/, ICloseResult,/g" \
  -e "s/{ DropItemResult }/{ IDropItemResult }/g" \
  -e "s/{ DropItemResult,/{ IDropItemResult,/g" \
  -e "s/, DropItemResult }/, IDropItemResult }/g" \
  -e "s/, DropItemResult,/, IDropItemResult,/g" \
  -e "s/{ OpenResult }/{ IOpenResult }/g" \
  -e "s/{ OpenResult,/{ IOpenResult,/g" \
  -e "s/, OpenResult }/, IOpenResult }/g" \
  -e "s/, OpenResult,/, IOpenResult,/g" \
  -e "s/{ TakeItemResult }/{ ITakeItemResult }/g" \
  -e "s/{ TakeItemResult,/{ ITakeItemResult,/g" \
  -e "s/, TakeItemResult }/, ITakeItemResult }/g" \
  -e "s/, TakeItemResult,/, ITakeItemResult,/g" \
  -e "s/{ MoveResult }/{ IMoveResult }/g" \
  -e "s/{ MoveResult,/{ IMoveResult,/g" \
  -e "s/, MoveResult }/, IMoveResult }/g" \
  -e "s/, MoveResult,/, IMoveResult,/g" \
  -e "s/{ LockResult }/{ ILockResult }/g" \
  -e "s/{ LockResult,/{ ILockResult,/g" \
  -e "s/, LockResult }/, ILockResult }/g" \
  -e "s/, LockResult,/, ILockResult,/g" \
  -e "s/{ UnlockResult }/{ IUnlockResult }/g" \
  -e "s/{ UnlockResult,/{ IUnlockResult,/g" \
  -e "s/, UnlockResult }/, IUnlockResult }/g" \
  -e "s/, UnlockResult,/, IUnlockResult,/g" \
  -e "s/{ AddItemResult }/{ IAddItemResult }/g" \
  -e "s/{ AddItemResult,/{ IAddItemResult,/g" \
  -e "s/, AddItemResult }/, IAddItemResult }/g" \
  -e "s/, AddItemResult,/, IAddItemResult,/g" \
  {} \;

# Fix type references in code (not just imports)
find packages/stdlib/src -name "*.ts" -exec sed -i \
  -e "s/: SemanticEvent\[\]/: ISemanticEvent[]/g" \
  -e "s/: SemanticEvent\>/: ISemanticEvent/g" \
  -e "s/<SemanticEvent>/<ISemanticEvent>/g" \
  -e "s/as SemanticEvent/as ISemanticEvent/g" \
  -e "s/: QueryResponse\>/: IQueryResponse/g" \
  -e "s/<QueryResponse>/<IQueryResponse>/g" \
  -e "s/: PendingQuery\>/: IPendingQuery/g" \
  -e "s/<PendingQuery>/<IPendingQuery>/g" \
  -e "s/: RestartContext\>/: IRestartContext/g" \
  -e "s/<RestartContext>/<IRestartContext>/g" \
  -e "s/: SaveContext\>/: ISaveContext/g" \
  -e "s/<SaveContext>/<ISaveContext>/g" \
  -e "s/: RestoreContext\>/: IRestoreContext/g" \
  -e "s/<RestoreContext>/<IRestoreContext>/g" \
  {} \;

echo "Import fixes complete. Building to check for remaining errors..."