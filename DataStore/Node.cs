namespace DataStore
{
    public abstract class Node : INode
    {
        public string Id { get; }
        public IDictionary<string, IProperty> Properties { get; }
        private readonly List<IEdge> _outgoingEdges = new List<IEdge>();
        private readonly List<IEdge> _incomingEdges = new List<IEdge>();

        public IReadOnlyCollection<IEdge> OutgoingEdges => _outgoingEdges.AsReadOnly();
        public IReadOnlyCollection<IEdge> IncomingEdges => _incomingEdges.AsReadOnly();

        public Node(string id)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            Properties = new Dictionary<string, IProperty>();
        }

        public void AddOutgoingEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));
            if (edge.Source != this) throw new InvalidOperationException("Edge source must be this node.");
            _outgoingEdges.Add(edge);
        }

        public void AddIncomingEdge(IEdge edge)
        {
            if (edge == null) throw new ArgumentNullException(nameof(edge));
            if (edge.Target != this) throw new InvalidOperationException("Edge target must be this node.");
            _incomingEdges.Add(edge);
        }

        public bool RemoveOutgoingEdge(IEdge edge)
        {
            return _outgoingEdges.Remove(edge);
        }

        public bool RemoveIncomingEdge(IEdge edge)
        {
            return _incomingEdges.Remove(edge);
        }

        public T? GetPropertyValue<T>(string propertyName)
        {
            if (Properties.TryGetValue(propertyName, out var property))
            {
                return property.GetValue<T>();
            }
            return default;
        }

        public INode SetPropertyValue(string propertyName, object? value)
        {
            if (Properties.TryGetValue(propertyName, out var existingProperty))
            {
                existingProperty.SetValue(value);
            }
            else
            {
                Properties[propertyName] = new Property(propertyName, value);
            }
            return this;
        }

        public IEnumerable<INode> GetAdjacentNodes()
        {
            return _outgoingEdges.Select(e => e.Target)
                .Concat(_incomingEdges.Select(e => e.Source))
                .OfType<INode>()  // This filters out null values and casts to INode
                .Distinct();
        }

        public IEnumerable<INode> GetAdjacentNodesOfEdgeType(string edgeType)
        {
            return _outgoingEdges.Where(e => e.Type == edgeType).Select(e => e.Target)
                .Concat(_incomingEdges.Where(e => e.Type == edgeType).Select(e => e.Source))
                .OfType<INode>()
                .Distinct();
        }

        public IEnumerable<IEdge> GetEdgesToNode(INode targetNode)
        {
            return _outgoingEdges.Where(e => e.Target == targetNode)
                .Concat(_incomingEdges.Where(e => e.Source == targetNode));
        }
    }
}