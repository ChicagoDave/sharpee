using System;
using System.Collections.Generic;
using System.Linq;
using DataStore;

namespace IFWorldModel
{
    public class ActionHistory
    {
        private readonly Graph _graph;
        private readonly string _actionHistoryNodeId;
        private const string ActionHistoryNodeType = "meta_action_history";
        private const string ActionHistoryPropertyName = "entries";

        public ActionHistory(Graph graph)
        {
            _graph = graph;
            _actionHistoryNodeId = EnsureActionHistoryNode();
        }

        private string EnsureActionHistoryNode()
        {
            var actionHistoryNode = _graph.Nodes.Values.FirstOrDefault(n => n.GetPropertyValue<string>("type") == ActionHistoryNodeType);
            if (actionHistoryNode == null)
            {
                return _graph.AddNode(
                    new Property("type", ActionHistoryNodeType),
                    new Property("name", "ActionHistory"),
                    new Property(ActionHistoryPropertyName, new List<ActionHistoryEntry>())
                );
            }
            return actionHistoryNode.Id;
        }

        public ActionHistory AddAction(ActionResult result)
        {
            var actionEntry = new ActionHistoryEntry
            {
                Timestamp = DateTime.UtcNow,
                Action = result.Action,
                Success = result.Success,
                Message = result.Message,
                AdditionalData = result.AdditionalData
            };

            GetHistory().Add(actionEntry);

            return this;
        }

        public IEnumerable<(DateTime Timestamp, ParsedAction Action, bool Success, string Message)> GetActionHistory()
        {
            return GetHistory()
                .Select(entry => (
                    entry.Timestamp,
                    entry.Action,
                    entry.Success,
                    entry.Message
                ))
                .OrderByDescending(h => h.Timestamp);
        }

        public ActionHistory ClearHistory()
        {
            GetHistory().Clear();
            return this;
        }

        private List<ActionHistoryEntry> GetHistory()
        {
            var history = _graph.Nodes[_actionHistoryNodeId].GetPropertyValue<List<ActionHistoryEntry>>(ActionHistoryPropertyName);
            if (history == null)
            {
                history = new List<ActionHistoryEntry>();
                _graph.SetNodeProperty(_actionHistoryNodeId, ActionHistoryPropertyName, history);
            }
            return history;
        }
    }

    public class ActionHistoryEntry
    {
        public DateTime Timestamp { get; set; }
        public ParsedAction Action { get; set; }
        public bool Success { get; set; }
        public string Message { get; set; }
        public Dictionary<string, object> AdditionalData { get; set; }
    }
}