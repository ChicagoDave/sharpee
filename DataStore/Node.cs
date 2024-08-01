using System;
using System.Collections.Generic;
using System.Linq;

namespace DataStore
{
    /// <summary>
    /// Represents a node in the graph data structure.
    /// </summary>
    public class Node
    {
        /// <summary>
        /// Gets the unique identifier of the node.
        /// </summary>
        public string Id { get; }

        /// <summary>
        /// Gets the list of edges connected to this node.
        /// </summary>
        public List<Edge> Edges { get; }

        /// <summary>
        /// Gets the list of properties associated with this node.
        /// </summary>
        public List<Property> Properties { get; }

        /// <summary>
        /// Initializes a new instance of the Node class with a given ID.
        /// </summary>
        /// <param name="id">The unique identifier for the node.</param>
        public Node(string id)
        {
            Id = id;
            Edges = new List<Edge>();
            Properties = new List<Property>();
        }

        /// <summary>
        /// Initializes a new instance of the Node class with a given ID and initial properties.
        /// </summary>
        /// <param name="id">The unique identifier for the node.</param>
        /// <param name="properties">The initial properties for the node.</param>
        public Node(string id, List<Property> properties)
            : this(id)
        {
            if (properties != null)
            {
                Properties.AddRange(properties);
            }
        }

        /// <summary>
        /// Retrieves the value of a property with the specified name.
        /// </summary>
        /// <typeparam name="T">The expected type of the property value.</typeparam>
        /// <param name="propertyName">The name of the property to retrieve.</param>
        /// <returns>The value of the property if found and of the correct type; otherwise, the default value for type T.</returns>
        public T? GetPropertyValue<T>(string propertyName)
        {
            var property = Properties.FirstOrDefault(p => p.Name == propertyName);
            if (property?.Value is T value)
            {
                return value;
            }

            if (property?.Value is not null)
            {
                try
                {
                    return (T)Convert.ChangeType(property.Value, typeof(T));
                }
                catch
                {
                    // Conversion failed, fall through to return default
                }
            }

            return default;
        }

        /// <summary>
        /// Sets the value of a property with the specified name. If the property doesn't exist, it is created.
        /// </summary>
        /// <param name="propertyName">The name of the property to set.</param>
        /// <param name="value">The value to set for the property.</param>
        public void SetPropertyValue(string propertyName, object value)
        {
            var property = Properties.FirstOrDefault(p => p.Name == propertyName);
            if (property != null)
            {
                property.Value = value;
            }
            else
            {
                Properties.Add(new Property(propertyName, value));
            }
        }
    }
}