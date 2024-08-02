namespace DataStore
{
    public interface IEdge
    {
        string Id { get; }
        INode? Source { get; }
        INode? Target { get; }
        string Type { get; }
        IDictionary<string, IProperty> Properties { get; }

        // Property management
        T? GetPropertyValue<T>(string propertyName);
        void SetPropertyValue(string propertyName, object value);

        // Edge management
        void ConnectNodes(INode? source, INode? target);
        void DisconnectNodes();
    }
}