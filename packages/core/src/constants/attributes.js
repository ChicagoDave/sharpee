// packages/core/src/constants/attributes.ts
/**
 * Core entity attributes - generic attributes that any entity might have
 * Game-specific attributes should be defined in their respective packages
 */
export var CoreAttributes;
(function (CoreAttributes) {
    // Identity attributes
    CoreAttributes["ID"] = "id";
    CoreAttributes["TYPE"] = "type";
    CoreAttributes["NAME"] = "name";
    // Metadata attributes
    CoreAttributes["CREATED_AT"] = "created_at";
    CoreAttributes["UPDATED_AT"] = "updated_at";
    CoreAttributes["VERSION"] = "version";
    // State attributes
    CoreAttributes["ACTIVE"] = "active";
    CoreAttributes["VISIBLE"] = "visible";
    // Extension attributes
    CoreAttributes["EXTENSIONS"] = "extensions";
    CoreAttributes["METADATA"] = "metadata";
})(CoreAttributes || (CoreAttributes = {}));
/**
 * Core attribute types for validation
 */
export var CoreAttributeType;
(function (CoreAttributeType) {
    CoreAttributeType["STRING"] = "string";
    CoreAttributeType["NUMBER"] = "number";
    CoreAttributeType["BOOLEAN"] = "boolean";
    CoreAttributeType["OBJECT"] = "object";
    CoreAttributeType["ARRAY"] = "array";
    CoreAttributeType["DATE"] = "date";
})(CoreAttributeType || (CoreAttributeType = {}));
/**
 * Core attribute definitions with their expected types
 */
export const CORE_ATTRIBUTE_TYPES = {
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
//# sourceMappingURL=attributes.js.map