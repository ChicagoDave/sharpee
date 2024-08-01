namespace DataStore
{
    /// <summary>
    /// Represents a key-value pair property that can be associated with nodes or edges in the graph.
    /// </summary>
    public class Property
    {
        /// <summary>
        /// Gets the name (key) of the property.
        /// </summary>
        public string Name { get; }

        /// <summary>
        /// Gets or sets the value of the property.
        /// </summary>
        public object Value { get; set; }

        /// <summary>
        /// Initializes a new instance of the Property class.
        /// </summary>
        /// <param name="name">The name (key) of the property.</param>
        /// <param name="value">The initial value of the property.</param>
        public Property(string name, object value)
        {
            Name = name;
            Value = value;
        }
    }
}