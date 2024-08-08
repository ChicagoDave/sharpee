namespace DataStore
{
    public class Edge : IEdge
    {
        public INode? Source { get; private set; }
        public INode? Target { get; private set; }
        public IDictionary<string, IProperty> SourceProperties { get; }
        public IDictionary<string, IProperty> TargetProperties { get; }

        public event EventHandler<PropertyChangedEventArgs>? SourcePropertyChanged;
        public event EventHandler<PropertyChangedEventArgs>? TargetPropertyChanged;

        public Edge(INode? source = null, INode? target = null)
        {
            SourceProperties = new Dictionary<string, IProperty>();
            TargetProperties = new Dictionary<string, IProperty>();
            ConnectNodes(source, target);
        }

        public T? GetSourcePropertyValue<T>(string propertyName)
        {
            return GetPropertyValue<T>(SourceProperties, propertyName);
        }

        public T? GetTargetPropertyValue<T>(string propertyName)
        {
            return GetPropertyValue<T>(TargetProperties, propertyName);
        }

        public void SetSourcePropertyValue(string propertyName, object value)
        {
            SetPropertyValue(SourceProperties, propertyName, value, OnSourcePropertyChanged);
        }

        public void SetTargetPropertyValue(string propertyName, object value)
        {
            SetPropertyValue(TargetProperties, propertyName, value, OnTargetPropertyChanged);
        }

        public void ConnectNodes(INode? source, INode? target)
        {
            DisconnectNodes();
            Source = source;
            Target = target;
            Source?.Edges.Add(this);
            Target?.Edges.Add(this);
        }

        public void DisconnectNodes()
        {
            Source?.Edges.Remove(this);
            Target?.Edges.Remove(this);
            Source = null;
            Target = null;
        }

        private T? GetPropertyValue<T>(IDictionary<string, IProperty> properties, string propertyName)
        {
            if (properties.TryGetValue(propertyName, out var property))
            {
                return property.GetValue<T>();
            }
            return default;
        }

        private void SetPropertyValue(IDictionary<string, IProperty> properties, string propertyName, object value, Action<PropertyChangedEventArgs> onPropertyChanged)
        {
            object? oldValue = null;
            if (properties.TryGetValue(propertyName, out var existingProperty))
            {
                oldValue = existingProperty.GetRawValue();
                existingProperty.SetValue(value);
            }
            else
            {
                properties[propertyName] = new Property(propertyName, value);
            }

            onPropertyChanged(new PropertyChangedEventArgs(propertyName, oldValue, value));
        }

        protected virtual void OnSourcePropertyChanged(PropertyChangedEventArgs e)
        {
            SourcePropertyChanged?.Invoke(this, e);
        }

        protected virtual void OnTargetPropertyChanged(PropertyChangedEventArgs e)
        {
            TargetPropertyChanged?.Invoke(this, e);
        }
    }
}