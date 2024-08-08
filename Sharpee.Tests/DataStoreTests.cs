using Microsoft.VisualStudio.TestTools.UnitTesting;
using DataStore;
using System;
using System.Linq;

namespace DataStore.Tests
{
    [TestClass]
    public class DataStoreTests
    {
        private Graph _graph;

        [TestInitialize]
        public void Initialize()
        {
            _graph = new Graph();
        }

        [TestMethod]
        public void AddNode_ShouldAddNodeToGraph()
        {
            // Arrange
            var node = new Node();

            // Act
            _graph.AddNode(node);

            // Assert
            Assert.IsTrue(_graph.Nodes.ContainsKey(node.Id));
            Assert.AreEqual(node, _graph.Nodes[node.Id]);
        }

        [TestMethod]
        public void RemoveNode_ShouldRemoveNodeAndConnectedEdges()
        {
            // Arrange
            var sourceNode = new Node();
            var targetNode = new Node();
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);

            var edge = _graph.CreateEdge(sourceNode.Id, targetNode.Id);

            // Act
            _graph.RemoveNode(sourceNode.Id);

            // Assert
            Assert.IsFalse(_graph.Nodes.ContainsKey(sourceNode.Id));
            Assert.IsFalse(targetNode.Edges.Contains(edge));
        }

        [TestMethod]
        public void CreateEdge_ShouldCreateEdgeBetweenNodes()
        {
            // Arrange
            var sourceNode = new Node();
            var targetNode = new Node();
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);

            // Act
            var edge = _graph.CreateEdge(sourceNode.Id, targetNode.Id);

            // Assert
            Assert.IsTrue(sourceNode.Edges.Contains(edge));
            Assert.IsTrue(targetNode.Edges.Contains(edge));
            Assert.AreEqual(sourceNode, edge.Source);
            Assert.AreEqual(targetNode, edge.Target);
        }

        [TestMethod]
        public void RemoveEdge_ShouldRemoveEdgeFromNodes()
        {
            // Arrange
            var sourceNode = new Node();
            var targetNode = new Node();
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);

            var edge = _graph.CreateEdge(sourceNode.Id, targetNode.Id);

            // Act
            _graph.RemoveEdge(edge);

            // Assert
            Assert.IsFalse(sourceNode.Edges.Contains(edge));
            Assert.IsFalse(targetNode.Edges.Contains(edge));
        }

        [TestMethod]
        public void Node_SetAndGetPropertyValue_ShouldWorkCorrectly()
        {
            // Arrange
            var node = new Node();
            string propertyName = "TestProperty";
            string propertyValue = "TestValue";

            // Act
            node.SetPropertyValue(propertyName, propertyValue);
            var retrievedValue = node.GetPropertyValue<string>(propertyName);

            // Assert
            Assert.AreEqual(propertyValue, retrievedValue);
        }

        [TestMethod]
        public void Edge_SetAndGetPropertyValue_ShouldWorkCorrectly()
        {
            // Arrange
            var sourceNode = new Node();
            var targetNode = new Node();
            var edge = new Edge(sourceNode, targetNode);
            string propertyName = "TestProperty";
            string propertyValue = "TestValue";

            // Act
            edge.SetSourcePropertyValue(propertyName, propertyValue);
            var retrievedValue = edge.GetSourcePropertyValue<string>(propertyName);

            // Assert
            Assert.AreEqual(propertyValue, retrievedValue);
        }

        [TestMethod]
        public void Node_PropertyChanged_ShouldRaiseEvent()
        {
            // Arrange
            var node = new Node();
            string propertyName = "TestProperty";
            string propertyValue = "TestValue";
            bool eventRaised = false;

            node.PropertyChanged += (sender, e) =>
            {
                eventRaised = true;
                Assert.AreEqual(propertyName, e.PropertyName);
                Assert.AreEqual(null, e.OldValue);
                Assert.AreEqual(propertyValue, e.NewValue);
            };

            // Act
            node.SetPropertyValue(propertyName, propertyValue);

            // Assert
            Assert.IsTrue(eventRaised);
        }

        [TestMethod]
        public void Edge_SourcePropertyChanged_ShouldRaiseEvent()
        {
            // Arrange
            var sourceNode = new Node();
            var targetNode = new Node();
            var edge = new Edge(sourceNode, targetNode);
            string propertyName = "TestProperty";
            string propertyValue = "TestValue";
            bool eventRaised = false;

            edge.SourcePropertyChanged += (sender, e) =>
            {
                eventRaised = true;
                Assert.AreEqual(propertyName, e.PropertyName);
                Assert.AreEqual(null, e.OldValue);
                Assert.AreEqual(propertyValue, e.NewValue);
            };

            // Act
            edge.SetSourcePropertyValue(propertyName, propertyValue);

            // Assert
            Assert.IsTrue(eventRaised);
        }
    }
}