using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DataStore
{
    public class World
    {
        public Dictionary<string, Node> Nodes { get; }
        public Dictionary<string, EdgeType> EdgeTypes { get; }

        private List<IGraphEventHandler> eventHandlers = new List<IGraphEventHandler>();

        public World()
        {
            Nodes = new Dictionary<string, Node>();
            EdgeTypes = new Dictionary<string, EdgeType>();
        }

        public void AddEdgeType(string name, string reverseName)
        {
            EdgeTypes[name] = new EdgeType(name, reverseName);
        }

        public EdgeType GetEdgeType(string name)
        {
            return EdgeTypes[name];
        }

        public string AddNode(params Property[] properties)
        {
            bool checkNameExists = properties.ToList<Property>().Exists(p => p.Name == "name");
            bool checkTypeExists = properties.ToList<Property>().Exists(p => p.Name == "type");

            if (!checkNameExists || !checkTypeExists)
                throw new Exception("New nodes require name and type properties.");

            string id = GenerateUniqueNodeId();

            var node = new Node(id, properties.ToList<Property>());
            Nodes[id] = node;
            PublishNodeAdded(node);
            return id;
        }

        public void RemoveNode(string id)
        {
            if (Nodes.ContainsKey(id))
            {
                var node = Nodes[id];
                Nodes.Remove(id);
                PublishNodeRemoved(node);
            }
        }

        public void ConnectNodesByName(string fromName, string toName, string edgeType, string reverseEdgeType, params Property[]? properties)
        {
            if (string.IsNullOrWhiteSpace(fromName) || string.IsNullOrWhiteSpace(toName))
                throw new ArgumentException("Node names cannot be empty or null.");

            string fromNodeId = GetNodeIdByName(fromName);
            string toNodeId = GetNodeIdByName(toName);

            if (fromNodeId == null || toNodeId == null)
                throw new ArgumentException("One or both nodes do not exist in the graph.");

            ConnectNodesById(fromNodeId, toNodeId, edgeType, reverseEdgeType, properties);
        }

        public void ConnectNodesById(string fromNodeId, string toNodeId, string edgeType, string reverseEdgeType, params Property[]? properties)
        {
            if (string.IsNullOrWhiteSpace(fromNodeId) || string.IsNullOrWhiteSpace(toNodeId))
                throw new ArgumentException("Node IDs cannot be empty or null.");

            if (!Nodes.ContainsKey(fromNodeId) || !Nodes.ContainsKey(toNodeId))
                throw new ArgumentException("One or both nodes do not exist in the graph.");

            List<Property> propertyList = properties?.ToList<Property>() ?? new List<Property>();

            Edge edge1 = new Edge(fromNodeId, toNodeId, edgeType, propertyList);
            Nodes[fromNodeId].Edges.Add(edge1);
            PublishEdgeAdded(edge1);

            Edge edge2 = new Edge(toNodeId, fromNodeId, reverseEdgeType, propertyList);
            Nodes[toNodeId].Edges.Add(edge2);
            PublishEdgeAdded(edge2);
        }

        public void DisconnectNodesById(string fromNodeId, string toNodeId)
        {
            var edge1 = Nodes[fromNodeId].Edges.Find(e => e.Id2 == toNodeId);
            if (edge1 != null)
            {
                Nodes[fromNodeId].Edges.Remove(edge1);
                PublishEdgeRemoved(edge1);
            }

            var edge2 = Nodes[toNodeId].Edges.Find(e => e.Id1 == toNodeId);
            if (edge2 != null)
            {
                Nodes[toNodeId].Edges.Remove(edge2);
                PublishEdgeRemoved(edge2);
            }
        }

        public T? GetNodePropertyValue<T>(string nodeId, string propertyName)
        {
            if (Nodes.TryGetValue(nodeId, out var node))
            {
                var property = node.Properties.FirstOrDefault(p => p.Name == propertyName);
                if (property != null && property.Value is T value)
                {
                    return value;
                }
            }
            return default;
        }

        public void SetNodeProperty(string nodeId, string propertyName, object propertyValue)
        {
            var property = Nodes[nodeId].Properties.Find(p => p.Name == propertyName);
            if (property != null)
            {
                property.Value = propertyValue;
            }
            else
            {
                property = new Property(propertyName, propertyValue);
                Nodes[nodeId].Properties.Add(property);
            }
            PublishPropertyChanged(nodeId, property);
        }

        public void SetEdgeProperty(string id1, string id2, string propertyName, object propertyValue)
        {
            var edge = Nodes[id1].Edges.Find(e => e.Id2 == id2);
            if (edge != null)
            {
                var property = edge.Properties.Find(p => p.Name == propertyName);
                if (property != null)
                {
                    property.Value = propertyValue;
                }
                else
                {
                    property = new Property(propertyName, propertyValue);
                    edge.Properties.Add(property);
                }
                PublishPropertyChanged($"{id1}-{id2}", property);
            }
        }

        public void AddEventHandler(IGraphEventHandler handler)
        {
            eventHandlers.Add(handler);
        }

        public void RemoveEventHandler(IGraphEventHandler handler)
        {
            eventHandlers.Remove(handler);
        }

        private string GetNodeIdByName(string nodeName)
        {
            return Nodes.FirstOrDefault(n => n.Value.Properties.Any(p => p.Name == "name" && p.Value?.ToString() == nodeName)).Key;
        }

        private void PublishNodeAdded(Node node)
        {
            foreach (var handler in eventHandlers)
            {
                handler.HandleNodeAdded(node);
            }
        }

        private void PublishNodeRemoved(Node node)
        {
            foreach (var handler in eventHandlers)
            {
                handler.HandleNodeRemoved(node);
            }
        }

        private void PublishEdgeAdded(Edge edge)
        {
            foreach (var handler in eventHandlers)
            {
                handler.HandleEdgeAdded(edge);
            }
        }

        private void PublishEdgeRemoved(Edge edge)
        {
            foreach (var handler in eventHandlers)
            {
                handler.HandleEdgeRemoved(edge);
            }
        }

        private void PublishPropertyChanged(string nodeOrEdgeId, Property property)
        {
            foreach (var handler in eventHandlers)
            {
                handler.HandlePropertyChanged(nodeOrEdgeId, property);
            }
        }

        private string GenerateUniqueNodeId()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
            var random = new Random();

            string id;
            do
            {
                id = new string(Enumerable.Repeat(chars, 6)
                    .Select(s => s[random.Next(s.Length)])
                    .ToArray());
            } while (Nodes.ContainsKey(id));

            return id;
        }
    }
}