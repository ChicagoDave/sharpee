using DataStore;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System;
using System.Linq;

namespace StoryRunner.DataStore.Tests
{
    [TestClass]
    public class WorldTests
    {
        [TestMethod]
        public void AddNode_Should_AddNodeToGraph()
        {
            // Arrange
            var world = new World();

            // Act
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Assert
            Assert.IsTrue(world.Nodes.ContainsKey(nodeId));
            Assert.AreEqual("TestNode", world.Nodes[nodeId].GetPropertyValue<string>("name"));
            Assert.AreEqual("TestType", world.Nodes[nodeId].GetPropertyValue<string>("type"));
        }

        [TestMethod]
        public void RemoveNode_Should_RemoveNodeFromGraph()
        {
            // Arrange
            var world = new World();
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Act
            world.RemoveNode(nodeId);

            // Assert
            Assert.IsFalse(world.Nodes.ContainsKey(nodeId));
        }

        [TestMethod]
        public void ConnectNodesById_Should_AddBidirectionalEdgeBetweenNodes()
        {
            // Arrange
            var world = new World();
            world.AddEdgeType("there", "back");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));

            // Act
            world.ConnectNodesById(nodeId1, nodeId2, "there", "back");

            // Assert
            var node1Edges = world.Nodes[nodeId1].Edges;
            Assert.IsTrue(node1Edges.Exists(e => e.EdgeType == "there" && e.Id2 == nodeId2));
            var node2Edges = world.Nodes[nodeId2].Edges;
            Assert.IsTrue(node2Edges.Exists(e => e.EdgeType == "back" && e.Id2 == nodeId1));
        }

        [TestMethod]
        public void DisconnectNodesById_Should_RemoveEdgeBetweenNodes()
        {
            // Arrange
            var world = new World();
            world.AddEdgeType("there", "back");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));
            world.ConnectNodesById(nodeId1, nodeId2, "there", "back");

            // Act
            world.DisconnectNodesById(nodeId1, nodeId2);

            // Assert
            Assert.IsFalse(world.Nodes[nodeId1].Edges.Exists(e => e.Id2 == nodeId2));
            Assert.IsFalse(world.Nodes[nodeId2].Edges.Exists(e => e.Id2 == nodeId1));
        }

        [TestMethod]
        public void SetNodeProperty_Should_AddOrUpdateNodeProperty()
        {
            // Arrange
            var world = new World();
            string nodeId = world.AddNode(new Property("name", "TestNode"), new Property("type", "TestType"));

            // Act
            world.SetNodeProperty(nodeId, "prop1", "value1");
            world.SetNodeProperty(nodeId, "prop1", "value2");

            // Assert
            var propertyValue = world.Nodes[nodeId].GetPropertyValue<string>("prop1");
            Assert.IsNotNull(propertyValue);
            Assert.AreEqual("value2", propertyValue);
        }

        [TestMethod]
        public void SetEdgeProperty_Should_AddOrUpdateEdgeProperty()
        {
            // Arrange
            var world = new World();
            world.AddEdgeType("there", "back");
            string nodeId1 = world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            string nodeId2 = world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));
            world.ConnectNodesById(nodeId1, nodeId2, "there", "back");

            // Act
            world.SetEdgeProperty(nodeId1, nodeId2, "prop1", "value1");
            world.SetEdgeProperty(nodeId1, nodeId2, "prop1", "value2");

            // Assert
            var edge = world.Nodes[nodeId1].Edges.Find(e => e.Id2 == nodeId2);
            Assert.IsNotNull(edge);
            var propertyValue = edge.Properties.Find(p => p.Name == "prop1")?.Value;
            Assert.IsNotNull(propertyValue);
            Assert.AreEqual("value2", propertyValue);
        }

        [TestMethod]
        public void AddEdgeType_Should_AddEdgeTypeToWorld()
        {
            // Arrange
            var world = new World();

            // Act
            world.AddEdgeType("there", "back");

            // Assert
            Assert.IsTrue(world.EdgeTypes.ContainsKey("there"));
            Assert.AreEqual("back", world.EdgeTypes["there"].ReverseName);
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

        [TestMethod]
        public void ConnectNodesByName_Should_ConnectNodesCorrectly()
        {
            // Arrange
            var world = new World();
            world.AddEdgeType("there", "back");
            world.AddNode(new Property("name", "Node1"), new Property("type", "TestType"));
            world.AddNode(new Property("name", "Node2"), new Property("type", "TestType"));

            // Act
            world.ConnectNodesByName("Node1", "Node2", "there", "back");

            // Assert
            var node1 = world.Nodes.Values.FirstOrDefault(n => n.GetPropertyValue<string>("name") == "Node1");
            var node2 = world.Nodes.Values.FirstOrDefault(n => n.GetPropertyValue<string>("name") == "Node2");

            Assert.IsNotNull(node1);
            Assert.IsNotNull(node2);
            Assert.IsTrue(node1.Edges.Exists(e => e.EdgeType == "there" && e.Id2 == node2.Id));
            Assert.IsTrue(node2.Edges.Exists(e => e.EdgeType == "back" && e.Id2 == node1.Id));
        }
    }
}