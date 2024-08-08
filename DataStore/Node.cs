namespace DataStore
{
    public class Node : INode
    {
        public Guid Id { get; }
        public IDictionary<string, IProperty> Properties { get; }
        public List<IEdge> Edges { get; set; }

        public event EventHandler<PropertyChangedEventArgs>? PropertyChanged;

        public Node()
        {
            Id = Guid.NewGuid();
            Properties = new Dictionary<string, IProperty>();
            Edges = new List<IEdge>();
        }

        public T? GetPropertyValue<T>(string propertyName)
        {
            if (Properties.TryGetValue(propertyName, out var property))
            {
                return property.GetValue<T>();
            }
            return default;
        }

        public INode SetPropertyValue(string propertyName, object value)
        {
            object? oldValue = null;
            if (Properties.TryGetValue(propertyName, out var existingProperty))
            {
                oldValue = existingProperty.GetRawValue();
                existingProperty.SetValue(value);
            }
            else
            {
                Properties[propertyName] = new Property(propertyName, value);
            }

            OnPropertyChanged(new PropertyChangedEventArgs(propertyName, oldValue, value));
            return this;
        }

        protected virtual void OnPropertyChanged(PropertyChangedEventArgs e)
        {
            PropertyChanged?.Invoke(this, e);
        }
    }
}