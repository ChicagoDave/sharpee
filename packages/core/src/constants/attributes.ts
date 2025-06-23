// packages/core/src/constants/attributes.ts

/**
 * Core entity attributes - generic attributes that any entity might have
 * Game-specific attributes should be defined in their respective packages
 */
export enum CoreAttributes {
  // Identity attributes
  ID = 'id',
  TYPE = 'type',
  NAME = 'name',
  
  // Metadata attributes
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  VERSION = 'version',
  
  // State attributes
  ACTIVE = 'active',
  VISIBLE = 'visible',
  
  // Extension attributes
  EXTENSIONS = 'extensions',
  METADATA = 'metadata'
}

/**
 * Core attribute types for validation
 */
export enum CoreAttributeType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  OBJECT = 'object',
  ARRAY = 'array',
  DATE = 'date'
}

/**
 * Core attribute definitions with their expected types
 */
export const CORE_ATTRIBUTE_TYPES: Record<CoreAttributes, CoreAttributeType> = {
  [CoreAttributes.ID]: CoreAttributeType.STRING,
  [CoreAttributes.TYPE]: CoreAttributeType.STRING,
  [CoreAttributes.NAME]: CoreAttributeType.STRING,
  [CoreAttributes.CREATED_AT]: CoreAttributeType.DATE,
  [CoreAttributes.UPDATED_AT]: CoreAttributeType.DATE,
  [CoreAttributes.VERSION]: CoreAttributeType.NUMBER,
  [CoreAttributes.ACTIVE]: CoreAttributeType.BOOLEAN,
  [CoreAttributes.VISIBLE]: CoreAttributeType.BOOLEAN,
  [CoreAttributes.EXTENSIONS]: CoreAttributeType.ARRAY,
  [CoreAttributes.METADATA]: CoreAttributeType.OBJECT
};
