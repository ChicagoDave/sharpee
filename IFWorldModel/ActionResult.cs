using System.Collections.Generic;

namespace IFWorldModel
{
    public class ActionResult
    {
        public ParsedAction Action { get; }
        public bool Success { get; set; }
        public string Message { get; set; }
        public Dictionary<string, object> AdditionalData { get; }

        public ActionResult(ParsedAction action, bool success, string message)
        {
            Action = action;
            Success = success;
            Message = message;
            AdditionalData = new Dictionary<string, object>();
        }

        public ActionResult AddData(string key, object value)
        {
            AdditionalData[key] = value;
            return this;
        }

        public override string ToString()
        {
            return $"{(Success ? "Success" : "Failure")}: {Message} - Action: {Action}";
        }
    }
}