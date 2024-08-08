namespace DataStore
{
    public interface INode
    {
        Guid Id { get; }
        IDictionary<string, IProperty> Properties { get; }
        List<IEdge> Edges { get; set; }

        // Property management
        T? GetPropertyValue<T>(string propertyName);
        INode SetPropertyValue(string propertyName, object value);

        // New event for property changes
        event EventHandler<PropertyChangedEventArgs> PropertyChanged;
    }
}