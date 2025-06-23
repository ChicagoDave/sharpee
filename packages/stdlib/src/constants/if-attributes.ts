/**
 * Interactive Fiction attributes
 * 
 * Standard attributes used by IF entities
 */

export enum IFAttributes {
  // Display attributes
  NAME = 'name',
  DESCRIPTION = 'description',
  DETAILS = 'details',
  
  // State attributes  
  OPEN = 'open',
  LOCKED = 'locked',
  PORTABLE = 'portable',
  CONTAINER = 'container',
  SUPPORTER = 'supporter',
  SCENERY = 'scenery',
  EDIBLE = 'edible',
  WEARABLE = 'wearable',
  WORN = 'worn',
  SWITCHABLE = 'switchable',
  ON = 'on',
  
  // Capacity attributes
  CAPACITY = 'capacity',
  SIZE = 'size',
  
  // Special attributes
  PROPER_NAMED = 'proper_named',
  PLURAL_NAMED = 'plural_named',
  MENTIONED = 'mentioned',
  HANDLED = 'handled',
  VISITED = 'visited',
  
  // Character attributes
  ANIMATE = 'animate',
  REFUSES = 'refuses',
  
  // Container attributes
  OPENABLE = 'openable'
}

export enum IFAttributeType {
  STRING = 'string',
  NUMBER = 'number', 
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array'
}

/**
 * IF attribute definitions with their expected types
 */
export const IF_ATTRIBUTE_TYPES: Record<IFAttributes, IFAttributeType> = {
  [IFAttributes.NAME]: IFAttributeType.STRING,
  [IFAttributes.DESCRIPTION]: IFAttributeType.STRING,
  [IFAttributes.DETAILS]: IFAttributeType.STRING,
  [IFAttributes.OPEN]: IFAttributeType.BOOLEAN,
  [IFAttributes.LOCKED]: IFAttributeType.BOOLEAN,
  [IFAttributes.PORTABLE]: IFAttributeType.BOOLEAN,
  [IFAttributes.CONTAINER]: IFAttributeType.BOOLEAN,
  [IFAttributes.SUPPORTER]: IFAttributeType.BOOLEAN,
  [IFAttributes.SCENERY]: IFAttributeType.BOOLEAN,
  [IFAttributes.EDIBLE]: IFAttributeType.BOOLEAN,
  [IFAttributes.WEARABLE]: IFAttributeType.BOOLEAN,
  [IFAttributes.WORN]: IFAttributeType.BOOLEAN,
  [IFAttributes.SWITCHABLE]: IFAttributeType.BOOLEAN,
  [IFAttributes.ON]: IFAttributeType.BOOLEAN,
  [IFAttributes.CAPACITY]: IFAttributeType.NUMBER,
  [IFAttributes.SIZE]: IFAttributeType.NUMBER,
  [IFAttributes.PROPER_NAMED]: IFAttributeType.BOOLEAN,
  [IFAttributes.PLURAL_NAMED]: IFAttributeType.BOOLEAN,
  [IFAttributes.MENTIONED]: IFAttributeType.BOOLEAN,
  [IFAttributes.HANDLED]: IFAttributeType.BOOLEAN,
  [IFAttributes.VISITED]: IFAttributeType.BOOLEAN,
  [IFAttributes.ANIMATE]: IFAttributeType.BOOLEAN,
  [IFAttributes.REFUSES]: IFAttributeType.ARRAY,
  [IFAttributes.OPENABLE]: IFAttributeType.BOOLEAN
};
