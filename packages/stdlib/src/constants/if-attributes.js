/**
 * Interactive Fiction attributes
 *
 * Standard attributes used by IF entities
 */
export var IFAttributes;
(function (IFAttributes) {
    // Display attributes
    IFAttributes["NAME"] = "name";
    IFAttributes["DESCRIPTION"] = "description";
    IFAttributes["DETAILS"] = "details";
    // State attributes  
    IFAttributes["OPEN"] = "open";
    IFAttributes["LOCKED"] = "locked";
    IFAttributes["PORTABLE"] = "portable";
    IFAttributes["CONTAINER"] = "container";
    IFAttributes["SUPPORTER"] = "supporter";
    IFAttributes["SCENERY"] = "scenery";
    IFAttributes["EDIBLE"] = "edible";
    IFAttributes["WEARABLE"] = "wearable";
    IFAttributes["WORN"] = "worn";
    IFAttributes["SWITCHABLE"] = "switchable";
    IFAttributes["ON"] = "on";
    // Capacity attributes
    IFAttributes["CAPACITY"] = "capacity";
    IFAttributes["SIZE"] = "size";
    // Special attributes
    IFAttributes["PROPER_NAMED"] = "proper_named";
    IFAttributes["PLURAL_NAMED"] = "plural_named";
    IFAttributes["MENTIONED"] = "mentioned";
    IFAttributes["HANDLED"] = "handled";
    IFAttributes["VISITED"] = "visited";
})(IFAttributes || (IFAttributes = {}));
export var IFAttributeType;
(function (IFAttributeType) {
    IFAttributeType["STRING"] = "string";
    IFAttributeType["NUMBER"] = "number";
    IFAttributeType["BOOLEAN"] = "boolean";
    IFAttributeType["OBJECT"] = "object";
    IFAttributeType["ARRAY"] = "array";
})(IFAttributeType || (IFAttributeType = {}));
/**
 * IF attribute definitions with their expected types
 */
export const IF_ATTRIBUTE_TYPES = {
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
    [IFAttributes.VISITED]: IFAttributeType.BOOLEAN
};
//# sourceMappingURL=if-attributes.js.map