/**
 * Standard event types and tags
 * TODO: Move to proper location
 */
export var StandardEventTypes;
(function (StandardEventTypes) {
    StandardEventTypes["ACTION"] = "action";
    StandardEventTypes["SYSTEM"] = "system";
    StandardEventTypes["NARRATIVE"] = "narrative";
})(StandardEventTypes || (StandardEventTypes = {}));
export var StandardEventTags;
(function (StandardEventTags) {
    StandardEventTags["SUCCESS"] = "success";
    StandardEventTags["FAILURE"] = "failure";
    StandardEventTags["INFO"] = "info";
    StandardEventTags["WARNING"] = "warning";
    StandardEventTags["ERROR"] = "error";
})(StandardEventTags || (StandardEventTags = {}));
export const EventCategories = {
    ACTION: 'action',
    SYSTEM: 'system',
    NARRATIVE: 'narrative'
};
//# sourceMappingURL=standard-events.js.map