namespace DataStore
{
    public interface IEdge
    {
        INode? Source { get; }
        INode? Target { get; }
        IDictionary<string, IProperty> SourceProperties { get; }
        IDictionary<string, IProperty> TargetProperties { get; }

        T? GetSourcePropertyValue<T>(string propertyName);
        T? GetTargetPropertyValue<T>(string propertyName);
        void SetSourcePropertyValue(string propertyName, object value);
        void SetTargetPropertyValue(string propertyName, object value);
        void ConnectNodes(INode? source, INode? target);
        void DisconnectNodes();

        // New events for property changes
        event EventHandler<PropertyChangedEventArgs> SourcePropertyChanged;
        event EventHandler<PropertyChangedEventArgs> TargetPropertyChanged;
    }
}