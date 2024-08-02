namespace DataStore
{
    public class Edge : IEdge
    {
        public string Id { get; }
        public INode? Source { get; private set; }
        public INode? Target { get; private set; }
        public string Type { get; }
        public IDictionary<string, IProperty> Properties { get; }

        public Edge(string id, INode? source, INode? target, string type)
        {
            Id = id ?? throw new ArgumentNullException(nameof(id));
            Type = type ?? throw new ArgumentNullException(nameof(type));
            Properties = new Dictionary<string, IProperty>();

            ConnectNodes(source, target);
        }

        public T? GetPropertyValue<T>(string propertyName)
        {
            if (Properties.TryGetValue(propertyName, out var property))
            {
                return property.GetValue<T>();
            }
            return default;
        }

        public void SetPropertyValue(string propertyName, object value)
        {
            if (Properties.TryGetValue(propertyName, out var existingProperty))
            {
                existingProperty.SetValue(value);
            }
            else
            {
                Properties[propertyName] = new Property(propertyName, value);
            }
        }

        public void ConnectNodes(INode? source, INode? target)
        {
            DisconnectNodes();
            Source = source;
            Target = target;
            Source?.AddOutgoingEdge(this);
            Target?.AddIncomingEdge(this);
        }

        public void DisconnectNodes()
        {
            Source?.RemoveOutgoingEdge(this);
            Target?.RemoveIncomingEdge(this);
            Source = null;
            Target = null;
        }
    }
}