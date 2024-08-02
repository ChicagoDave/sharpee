namespace DataStore
{
    public interface INode
    {
        string Id { get; }
        IDictionary<string, IProperty> Properties { get; }

        // Methods for managing edges
        IReadOnlyCollection<IEdge> OutgoingEdges { get; }
        IReadOnlyCollection<IEdge> IncomingEdges { get; }
        void AddOutgoingEdge(IEdge edge);
        void AddIncomingEdge(IEdge edge);
        bool RemoveOutgoingEdge(IEdge edge);
        bool RemoveIncomingEdge(IEdge edge);

        // Property management
        T? GetPropertyValue<T>(string propertyName);
        INode SetPropertyValue(string propertyName, object value);

        // Node relationship queries
        IEnumerable<INode> GetAdjacentNodes();
        IEnumerable<INode> GetAdjacentNodesOfEdgeType(string edgeType);
        IEnumerable<IEdge> GetEdgesToNode(INode targetNode);
    }

}