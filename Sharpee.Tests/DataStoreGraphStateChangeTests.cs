using DataStore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Linq;

#nullable enable

namespace StoryRunner.DataStore.Tests
{
    [TestClass]
    public class DataStoreGraphStateChangeTests
    {
        private class MockGraphEventHandler : IGraphEventHandler
        {
            public List<GraphEvent> ReceivedEvents { get; } = new List<GraphEvent>();

            public void HandleNodeAdded(Node node) =>
                ReceivedEvents.Add(new NodeAddedEvent(node));

            public void HandleNodeRemoved(Node node) =>
                ReceivedEvents.Add(new NodeRemovedEvent(node));

            public void HandleEdgeAdded(Edge edge) =>
                ReceivedEvents.Add(new EdgeAddedEvent(edge));

            public void HandleEdgeRemoved(Edge edge) =>
                ReceivedEvents.Add(new EdgeRemovedEvent(edge));

            public void HandlePropertyChanged(string nodeOrEdgeId, Property property) =>
                ReceivedEvents.Add(new PropertyChangedEvent(nodeOrEdgeId, property));
        }

        [TestMethod]
        public void AddNode_Should_PublishNodeAddedEvent()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);

            // Act
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Assert
            Assert.AreEqual(1, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[0], typeof(NodeAddedEvent));
            var addedNode = ((NodeAddedEvent)eventHandler.ReceivedEvents[0]).AddedNode;
            Assert.AreEqual(nodeId, addedNode.Id);
            Assert.AreEqual("TestNode", addedNode.GetPropertyValue<string>("name"));
            Assert.AreEqual("TestType", addedNode.GetPropertyValue<string>("type"));
        }

        [TestMethod]
        public void RemoveNode_Should_PublishNodeRemovedEvent()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Act
            world.RemoveNode(nodeId);

            // Assert
            Assert.AreEqual(2, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[1], typeof(NodeRemovedEvent));
            Assert.AreEqual(nodeId, ((NodeRemovedEvent)eventHandler.ReceivedEvents[1]).RemovedNode.Id);
        }

        [TestMethod]
        public void ConnectNodesById_Should_PublishEdgeAddedEvents()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            world.AddEdgeType("edge1", "edge2");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));

            // Act
            world.ConnectNodesById(nodeId1, nodeId2, "edge1", "edge2");

            // Assert
            Assert.AreEqual(4, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[2], typeof(EdgeAddedEvent));
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[3], typeof(EdgeAddedEvent));
            Assert.AreEqual(nodeId1, ((EdgeAddedEvent)eventHandler.ReceivedEvents[2]).AddedEdge.Id1);
            Assert.AreEqual(nodeId2, ((EdgeAddedEvent)eventHandler.ReceivedEvents[3]).AddedEdge.Id1);
        }

        [TestMethod]
        public void DisconnectNodesById_Should_PublishEdgeRemovedEvents()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            world.AddEdgeType("edge1", "edge2");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));
            world.ConnectNodesById(nodeId1, nodeId2, "edge1", "edge2");

            // Act
            world.DisconnectNodesById(nodeId1, nodeId2);

            // Assert
            Assert.AreEqual(6, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[4], typeof(EdgeRemovedEvent));
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[5], typeof(EdgeRemovedEvent));
            Assert.AreEqual(nodeId1, ((EdgeRemovedEvent)eventHandler.ReceivedEvents[4]).RemovedEdge.Id1);
            Assert.AreEqual(nodeId2, ((EdgeRemovedEvent)eventHandler.ReceivedEvents[5]).RemovedEdge.Id1);
        }

        [TestMethod]
        public void SetNodeProperty_Should_PublishPropertyChangedEvent()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Act
            world.SetNodeProperty(nodeId, "prop1", "value1");

            // Assert
            Assert.AreEqual(2, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[1], typeof(PropertyChangedEvent));
            var propertyChangedEvent = (PropertyChangedEvent)eventHandler.ReceivedEvents[1];
            Assert.AreEqual(nodeId, propertyChangedEvent.NodeOrEdgeId);
            Assert.AreEqual("prop1", propertyChangedEvent.Property.Name);
            Assert.AreEqual("value1", propertyChangedEvent.Property.Value);
        }

        [TestMethod]
        public void SetEdgeProperty_Should_PublishPropertyChangedEvent()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            world.AddEdgeType("edge1", "edge2");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));
            world.ConnectNodesById(nodeId1, nodeId2, "edge1", "edge2");

            // Act
            world.SetEdgeProperty(nodeId1, nodeId2, "prop1", "value1");

            // Assert
            Assert.AreEqual(5, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[4], typeof(PropertyChangedEvent));
            var propertyChangedEvent = (PropertyChangedEvent)eventHandler.ReceivedEvents[4];
            Assert.AreEqual($"{nodeId1}-{nodeId2}", propertyChangedEvent.NodeOrEdgeId);
            Assert.AreEqual("prop1", propertyChangedEvent.Property.Name);
            Assert.AreEqual("value1", propertyChangedEvent.Property.Value);
        }

        [TestMethod]
        public void ConnectNodesByName_Should_PublishEdgeAddedEvents()
        {
            // Arrange
            var world = new World();
            var eventHandler = new MockGraphEventHandler();
            world.AddEventHandler(eventHandler);
            world.AddEdgeType("edge1", "edge2");
            world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));

            // Act
            world.ConnectNodesByName("Node1", "Node2", "edge1", "edge2");

            // Assert
            Assert.AreEqual(4, eventHandler.ReceivedEvents.Count);
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[2], typeof(EdgeAddedEvent));
            Assert.IsInstanceOfType(eventHandler.ReceivedEvents[3], typeof(EdgeAddedEvent));
            var edge1 = ((EdgeAddedEvent)eventHandler.ReceivedEvents[2]).AddedEdge;
            var edge2 = ((EdgeAddedEvent)eventHandler.ReceivedEvents[3]).AddedEdge;
            Assert.AreEqual("edge1", edge1.EdgeType);
            Assert.AreEqual("edge2", edge2.EdgeType);
        }

        [TestMethod]
        public void GetNodePropertyValue_Should_ReturnCorrectValue()
        {
            // Arrange
            var world = new World();
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));
            world.SetNodeProperty(nodeId, "prop1", "value1");

            // Act
            var node = world.Nodes[nodeId];
            var value = node.GetPropertyValue<string>("prop1");

            // Assert
            Assert.IsNotNull(value);
            Assert.AreEqual("value1", value);
        }

        [TestMethod]
        public void GetNodePropertyValue_Should_ReturnNullForNonexistentProperty()
        {
            // Arrange
            var world = new World();
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Act
            var node = world.Nodes[nodeId];
            var value = node.GetPropertyValue<string>("nonexistentProp");

            // Assert
            Assert.IsNull(value);
        }
    }
}