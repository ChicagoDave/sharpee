using System;
using System.Collections.Generic;
using System.Linq;

namespace DataStore
{
    public class Graph
    {
        private readonly Dictionary<Guid, INode> _nodes;
        private readonly List<IGraphEventObserver> _observers;

        public IReadOnlyDictionary<Guid, INode> Nodes => _nodes;

        public Graph()
        {
            _nodes = new Dictionary<Guid, INode>();
            _observers = new List<IGraphEventObserver>();
        }

        public Graph AddNode(INode node)
        {
            if (node == null) throw new ArgumentNullException(nameof(node));
            if (_nodes.ContainsKey(node.Id)) throw new ArgumentException($"Node with id {node.Id} already exists", nameof(node));

            _nodes[node.Id] = node;
            NotifyNodeAdded(node);
            return this;
        }

        public Graph RemoveNode(Guid nodeId)
        {
            if (!_nodes.TryGetValue(nodeId, out var node)) return this;

            // Disconnect all edges
            foreach (var edge in node.Edges.ToList())
            {
                edge.DisconnectNodes();
            }

            _nodes.Remove(nodeId);
            NotifyNodeRemoved(node);
            return this;
        }

        public IEdge CreateEdge(Guid sourceId, Guid targetId)
        {
            if (!_nodes.TryGetValue(sourceId, out var source))
                throw new ArgumentException($"Source node {sourceId} not found", nameof(sourceId));
            if (!_nodes.TryGetValue(targetId, out var target))
                throw new ArgumentException($"Target node {targetId} not found", nameof(targetId));

            var edge = new Edge(source, target);
            NotifyEdgeAdded(edge);
            return edge;
        }

        public Graph RemoveEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));

            edge.DisconnectNodes();
            NotifyEdgeRemoved(edge);
            return this;
        }

        // Observer pattern methods
        public Graph AddObserver(IGraphEventObserver observer)
        {
            _observers.Add(observer);
            return this;
        }

        public Graph RemoveObserver(IGraphEventObserver observer)
        {
            _observers.Remove(observer);
            return this;
        }

        private void NotifyNodeAdded(INode node) => _observers.ForEach(o => o.OnNodeAdded(node));
        private void NotifyNodeRemoved(INode node) => _observers.ForEach(o => o.OnNodeRemoved(node));
        private void NotifyEdgeAdded(IEdge edge) => _observers.ForEach(o => o.OnEdgeAdded(edge));
        private void NotifyEdgeRemoved(IEdge edge) => _observers.ForEach(o => o.OnEdgeRemoved(edge));
    }
}