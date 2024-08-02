using System;
using System.Collections.Generic;
using System.Linq;

namespace DataStore
{
    public class Graph
    {
        private readonly Dictionary<string, INode> _nodes;
        private readonly Dictionary<string, EdgeType> _edgeTypes;
        private readonly List<IGraphEventObserver> _observers;

        public IReadOnlyDictionary<string, INode> Nodes => _nodes;
        public IReadOnlyDictionary<string, EdgeType> EdgeTypes => _edgeTypes;

        public Graph()
        {
            _nodes = new Dictionary<string, INode>();
            _edgeTypes = new Dictionary<string, EdgeType>();
            _observers = new List<IGraphEventObserver>();
        }

        public void AddNode(INode node)
        {
            if (node == null) throw new ArgumentNullException(nameof(node));
            if (_nodes.ContainsKey(node.Id)) throw new ArgumentException($"Node with id {node.Id} already exists", nameof(node));

            _nodes[node.Id] = node;
            NotifyNodeAdded(node);
        }

        public void RemoveNode(string nodeId)
        {
            if (!_nodes.TryGetValue(nodeId, out var node)) return;

            // Disconnect all edges
            var edgesToRemove = node.OutgoingEdges.Concat(node.IncomingEdges).ToList();
            foreach (var edge in edgesToRemove)
            {
                RemoveEdge(edge);
            }

            _nodes.Remove(nodeId);
            NotifyNodeRemoved(node);
        }

        public void AddEdgeType(string forwardName, string reverseName)
        {
            var edgeType = new EdgeType(forwardName, reverseName);
            _edgeTypes[forwardName] = edgeType;
            _edgeTypes[reverseName] = edgeType;
        }

        public IEdge CreateEdge(string id, string sourceId, string targetId, string edgeType)
        {
            if (!_nodes.TryGetValue(sourceId, out var source))
                throw new ArgumentException($"Source node {sourceId} not found", nameof(sourceId));
            if (!_nodes.TryGetValue(targetId, out var target))
                throw new ArgumentException($"Target node {targetId} not found", nameof(targetId));
            if (!_edgeTypes.ContainsKey(edgeType))
                throw new ArgumentException($"Edge type {edgeType} not defined", nameof(edgeType));

            var edge = new Edge(id, source, target, edgeType);
            NotifyEdgeAdded(edge);
            return edge;
        }

        public void RemoveEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));

            edge.DisconnectNodes();
            NotifyEdgeRemoved(edge);
        }

        public IEnumerable<INode> GetAdjacentNodes(string nodeId)
        {
            return _nodes.TryGetValue(nodeId, out var node)
                ? node.GetAdjacentNodes()
                : Enumerable.Empty<INode>();
        }

        public IEnumerable<IEdge> GetEdgesBetween(string sourceId, string targetId)
        {
            if (!_nodes.TryGetValue(sourceId, out var source) || !_nodes.TryGetValue(targetId, out var target))
                return Enumerable.Empty<IEdge>();

            return source.GetEdgesToNode(target);
        }

        public void AddObserver(IGraphEventObserver observer)
        {
            _observers.Add(observer);
        }

        public void RemoveObserver(IGraphEventObserver observer)
        {
            _observers.Remove(observer);
        }

        private void NotifyNodeAdded(INode node)
        {
            foreach (var observer in _observers)
            {
                observer.OnNodeAdded(node);
            }
        }

        private void NotifyNodeRemoved(INode node)
        {
            foreach (var observer in _observers)
            {
                observer.OnNodeRemoved(node);
            }
        }

        private void NotifyEdgeAdded(IEdge edge)
        {
            foreach (var observer in _observers)
            {
                observer.OnEdgeAdded(edge);
            }
        }

        private void NotifyEdgeRemoved(IEdge edge)
        {
            foreach (var observer in _observers)
            {
                observer.OnEdgeRemoved(edge);
            }
        }
    }
}