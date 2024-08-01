using System;
using System.Collections.Generic;
using System.Linq;

namespace DataStore
{
    /// <summary>
    /// Represents the main container for the graph-based world model.
    /// </summary>
    public class World
    {
        /// <summary>
        /// Gets the dictionary of all nodes in the world, keyed by their unique identifiers.
        /// </summary>
        public Dictionary<string, Node> Nodes { get; }

        /// <summary>
        /// Gets the dictionary of all edge types in the world, keyed by their names.
        /// </summary>
        public Dictionary<string, EdgeType> EdgeTypes { get; }

        private List<IGraphEventHandler> eventHandlers = new List<IGraphEventHandler>();

        /// <summary>
        /// Initializes a new instance of the World class.
        /// </summary>
        public World()
        {
            Nodes = new Dictionary<string, Node>();
            EdgeTypes = new Dictionary<string, EdgeType>();
        }

        /// <summary>
        /// Adds a new edge type to the world.
        /// </summary>
        /// <param name="name">The name of the edge type.</param>
        /// <param name="reverseName">The name of the reverse edge type.</param>
        public void AddEdgeType(string name, string reverseName)
        {
            EdgeTypes[name] = new EdgeType(name, reverseName);
        }

        /// <summary>
        /// Retrieves an edge type by its name.
        /// </summary>
        /// <param name="name">The name of the edge type to retrieve.</param>
        /// <returns>The EdgeType with the specified name.</returns>
        public EdgeType GetEdgeType(string name)
        {
            return EdgeTypes[name];
        }

        /// <summary>
        /// Adds a new node to the world with the specified properties.
        /// </summary>
        /// <param name="properties">The properties to initialize the node with.</param>
        /// <returns>The unique identifier of the newly created node.</returns>
        public string AddNode(params Property[] properties)
        {
            bool checkNameExists = properties.Any(p => p.Name == "name");
            bool checkTypeExists = properties.Any(p => p.Name == "type");

            if (!checkNameExists || !checkTypeExists)
                throw new Exception("New nodes require name and type properties.");

            string id = GenerateUniqueNodeId();

            var node = new Node(id, properties.ToList());
            Nodes[id] = node;
            PublishNodeAdded(node);
            return id;
        }

        /// <summary>
        /// Removes a node from the world.
        /// </summary>
        /// <param name="id">The unique identifier of the node to remove.</param>
        public void RemoveNode(string id)
        {
            if (Nodes.ContainsKey(id))
            {
                var node = Nodes[id];
                Nodes.Remove(id);
                PublishNodeRemoved(node);
            }
        }

        /// <summary>
        /// Connects two nodes by their names.
        /// </summary>
        /// <param name="fromName">The name of the source node.</param>
        /// <param name="toName">The name of the target node.</param>
        /// <param name="edgeType">The type of the edge.</param>
        /// <param name="reverseEdgeType">The type of the reverse edge.</param>
        /// <param name="properties">Optional properties for the edge.</param>
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

        /// <summary>
        /// Connects two nodes by their unique identifiers.
        /// </summary>
        /// <param name="fromNodeId">The unique identifier of the source node.</param>
        /// <param name="toNodeId">The unique identifier of the target node.</param>
        /// <param name="edgeType">The type of the edge.</param>
        /// <param name="reverseEdgeType">The type of the reverse edge.</param>
        /// <param name="properties">Optional properties for the edge.</param>
        public void ConnectNodesById(string fromNodeId, string toNodeId, string edgeType, string reverseEdgeType, params Property[]? properties)
        {
            if (string.IsNullOrWhiteSpace(fromNodeId) || string.IsNullOrWhiteSpace(toNodeId))
                throw new ArgumentException("Node IDs cannot be empty or null.");

            if (!Nodes.ContainsKey(fromNodeId) || !Nodes.ContainsKey(toNodeId))
                throw new ArgumentException("One or both nodes do not exist in the graph.");

            List<Property> propertyList = properties?.ToList() ?? new List<Property>();

            Edge edge1 = new Edge(fromNodeId, toNodeId, edgeType, propertyList);
            Nodes[fromNodeId].Edges.Add(edge1);
            PublishEdgeAdded(edge1);

            Edge edge2 = new Edge(toNodeId, fromNodeId, reverseEdgeType, propertyList);
            Nodes[toNodeId].Edges.Add(edge2);
            PublishEdgeAdded(edge2);
        }

        /// <summary>
        /// Disconnects two nodes by their unique identifiers.
        /// </summary>
        /// <param name="fromNodeId">The unique identifier of the source node.</param>
        /// <param name="toNodeId">The unique identifier of the target node.</param>
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

        /// <summary>
        /// Gets the value of a node property.
        /// </summary>
        /// <typeparam name="T">The expected type of the property value.</typeparam>
        /// <param name="nodeId">The unique identifier of the node.</param>
        /// <param name="propertyName">The name of the property.</param>
        /// <returns>The value of the property if found and of the correct type; otherwise, the default value for type T.</returns>
        public T? GetNodePropertyValue<T>(string nodeId, string propertyName)
        {
            if (Nodes.TryGetValue(nodeId, out var node))
            {
                return node.GetPropertyValue<T>(propertyName);
            }
            return default;
        }

        /// <summary>
        /// Sets the value of a node property.
        /// </summary>
        /// <param name="nodeId">The unique identifier of the node.</param>
        /// <param name="propertyName">The name of the property.</param>
        /// <param name="propertyValue">The value to set for the property.</param>
        public void SetNodeProperty(string nodeId, string propertyName, object propertyValue)
        {
            Nodes[nodeId].SetPropertyValue(propertyName, propertyValue);
            PublishPropertyChanged(nodeId, new Property(propertyName, propertyValue));
        }

        /// <summary>
        /// Sets the value of an edge property.
        /// </summary>
        /// <param name="id1">The unique identifier of the source node.</param>
        /// <param name="id2">The unique identifier of the target node.</param>
        /// <param name="propertyName">The name of the property.</param>
        /// <param name="propertyValue">The value to set for the property.</param>
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

        /// <summary>
        /// Adds an event handler to the world.
        /// </summary>
        /// <param name="handler">The event handler to add.</param>
        public void AddEventHandler(IGraphEventHandler handler)
        {
            eventHandlers.Add(handler);
        }

        /// <summary>
        /// Removes an event handler from the world.
        /// </summary>
        /// <param name="handler">The event handler to remove.</param>
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