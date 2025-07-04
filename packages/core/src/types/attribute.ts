// packages/core/src/types/attribute.ts

/**
 * Possible types for attribute values
 */
export type AttributeValue = 
  | string 
  | number 
  | boolean 
  | null 
  | AttributeObject 
  | AttributeArray;

/**
 * An object containing attribute values
 */
export interface AttributeObject {
  [key: string]: AttributeValue;
}

/**
 * An array of attribute values
 */
export type AttributeArray = AttributeValue[];

/**
 * Configuration for an attribute
 */
export interface AttributeConfig {
  /**
   * Type validation for this attribute
   */
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  
  /**
   * Whether this attribute is required for the entity
   */
  required?: boolean;
  
  /**
   * Default value if none is provided
   */
  default?: AttributeValue;
  
  /**
   * Custom validation function
   */
  validate?: (value: AttributeValue) => boolean;
}

/**
 * A map of attribute configurations
 */
export type AttributeConfigMap = Record<string, AttributeConfig>;
