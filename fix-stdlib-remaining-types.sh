#!/bin/bash

# Fix remaining type references and imports

echo "Fixing remaining type references..."

# Fix type references in code bodies
find packages/stdlib/src -name "*.ts" -exec sed -i \
  -e "s/const result: CloseResult/const result: ICloseResult/g" \
  -e "s/const result: DropItemResult/const result: IDropItemResult/g" \
  -e "s/const result: LockResult/const result: ILockResult/g" \
  -e "s/const result: OpenResult/const result: IOpenResult/g" \
  -e "s/const result: AddItemResult/const result: IAddItemResult/g" \
  -e "s/const result: TakeItemResult/const result: ITakeItemResult/g" \
  -e "s/const result: UnlockResult/const result: IUnlockResult/g" \
  -e "s/{ AddItemToSupporterResult }/{ IAddItemToSupporterResult }/g" \
  -e "s/{ AddItemToSupporterResult,/{ IAddItemToSupporterResult,/g" \
  -e "s/, AddItemToSupporterResult }/, IAddItemToSupporterResult }/g" \
  -e "s/, AddItemToSupporterResult,/, IAddItemToSupporterResult,/g" \
  -e "s/{ RemoveItemResult }/{ IRemoveItemResult }/g" \
  -e "s/{ RemoveItemResult,/{ IRemoveItemResult,/g" \
  -e "s/, RemoveItemResult }/, IRemoveItemResult }/g" \
  -e "s/, RemoveItemResult,/, IRemoveItemResult,/g" \
  -e "s/{ RemoveItemFromSupporterResult }/{ IRemoveItemFromSupporterResult }/g" \
  -e "s/{ RemoveItemFromSupporterResult,/{ IRemoveItemFromSupporterResult,/g" \
  -e "s/, RemoveItemFromSupporterResult }/, IRemoveItemFromSupporterResult }/g" \
  -e "s/, RemoveItemFromSupporterResult,/, IRemoveItemFromSupporterResult,/g" \
  {} \;

echo "Type reference fixes complete."