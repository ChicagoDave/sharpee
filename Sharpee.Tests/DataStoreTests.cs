using Microsoft.VisualStudio.TestTools.UnitTesting;
using DataStore;
using System;
using System.Linq;

namespace DataStore.Tests
{
    [TestClass]
    public class GraphTests
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
            var node = new TestNode("TestNode");

            // Act
            _graph.AddNode(node);

            // Assert
            Assert.IsTrue(_graph.Nodes.ContainsKey(node.Id));
            Assert.AreEqual(node, _graph.Nodes[node.Id]);
        }

        [TestMethod]
        public void AddEdgeType_ShouldAddBidirectionalEdgeType()
        {
            // Arrange
            string forwardName = "forward";
            string reverseName = "reverse";

            // Act
            _graph.AddEdgeType(forwardName, reverseName);

            // Assert
            Assert.IsTrue(_graph.EdgeTypes.ContainsKey(forwardName));
            Assert.IsTrue(_graph.EdgeTypes.ContainsKey(reverseName));
            Assert.AreEqual(reverseName, _graph.EdgeTypes[forwardName].ReverseName);
            Assert.AreEqual(forwardName, _graph.EdgeTypes[reverseName].ForwardName);
        }

        [TestMethod]
        public void AddEdge_ShouldAddEdgeToGraph()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode = new TestNode("TargetNode");
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);
            _graph.AddEdgeType("TestEdge", "ReverseTestEdge");

            var edge = new TestEdge("TestEdgeId", sourceNode, targetNode, "TestEdge");

            // Act
            _graph.AddEdge(edge);

            // Assert
            Assert.IsTrue(_graph.Edges.ContainsKey(edge.Id));
            Assert.AreEqual(edge, _graph.Edges[edge.Id]);
            Assert.IsTrue(sourceNode.Edges.Contains(edge));
        }

        [TestMethod]
        [ExpectedException(typeof(ArgumentException))]
        public void AddEdge_WithNonExistentNodes_ShouldThrowException()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode = new TestNode("TargetNode");
            _graph.AddEdgeType("TestEdge", "ReverseTestEdge");

            var edge = new TestEdge("TestEdgeId", sourceNode, targetNode, "TestEdge");

            // Act
            _graph.AddEdge(edge);

            // Assert is handled by ExpectedException
        }

        [TestMethod]
        public void RemoveNode_ShouldRemoveNodeAndConnectedEdges()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode = new TestNode("TargetNode");
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);
            _graph.AddEdgeType("TestEdge", "ReverseTestEdge");

            var edge = new TestEdge("TestEdgeId", sourceNode, targetNode, "TestEdge");
            _graph.AddEdge(edge);

            // Act
            _graph.RemoveNode(sourceNode.Id);

            // Assert
            Assert.IsFalse(_graph.Nodes.ContainsKey(sourceNode.Id));
            Assert.IsFalse(_graph.Edges.ContainsKey(edge.Id));
            Assert.IsFalse(targetNode.Edges.Contains(edge));
        }

        [TestMethod]
        public void RemoveEdge_ShouldRemoveEdgeFromGraphAndNodes()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode = new TestNode("TargetNode");
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);
            _graph.AddEdgeType("TestEdge", "ReverseTestEdge");

            var edge = new TestEdge("TestEdgeId", sourceNode, targetNode, "TestEdge");
            _graph.AddEdge(edge);

            // Act
            _graph.RemoveEdge(edge.Id);

            // Assert
            Assert.IsFalse(_graph.Edges.ContainsKey(edge.Id));
            Assert.IsFalse(sourceNode.Edges.Contains(edge));
        }

        [TestMethod]
        public void GetAdjacentNodes_ShouldReturnCorrectNodes()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode1 = new TestNode("TargetNode1");
            var targetNode2 = new TestNode("TargetNode2");
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode1);
            _graph.AddNode(targetNode2);
            _graph.AddEdgeType("TestEdge", "ReverseTestEdge");

            _graph.AddEdge(new TestEdge("Edge1", sourceNode, targetNode1, "TestEdge"));
            _graph.AddEdge(new TestEdge("Edge2", sourceNode, targetNode2, "TestEdge"));

            // Act
            var adjacentNodes = _graph.GetAdjacentNodes(sourceNode.Id).ToList();

            // Assert
            Assert.AreEqual(2, adjacentNodes.Count);
            CollectionAssert.Contains(adjacentNodes, targetNode1);
            CollectionAssert.Contains(adjacentNodes, targetNode2);
        }

        [TestMethod]
        public void GetEdgesBetween_ShouldReturnCorrectEdges()
        {
            // Arrange
            var sourceNode = new TestNode("SourceNode");
            var targetNode = new TestNode("TargetNode");
            _graph.AddNode(sourceNode);
            _graph.AddNode(targetNode);
            _graph.AddEdgeType("TestEdge1", "ReverseTestEdge1");
            _graph.AddEdgeType("TestEdge2", "ReverseTestEdge2");

            var edge1 = new TestEdge("Edge1", sourceNode, targetNode, "TestEdge1");
            var edge2 = new TestEdge("Edge2", sourceNode, targetNode, "TestEdge2");
            _graph.AddEdge(edge1);
            _graph.AddEdge(edge2);

            // Act
            var edgesBetween = _graph.GetEdgesBetween(sourceNode.Id, targetNode.Id).ToList();

            // Assert
            Assert.AreEqual(2, edgesBetween.Count);
            CollectionAssert.Contains(edgesBetween, edge1);
            CollectionAssert.Contains(edgesBetween, edge2);
        }
    }

    // Helper classes for testing
    public class TestNode : Node
    {
        public TestNode(string id) : base(id) { }
    }

    public class TestEdge : Edge
    {
        public TestEdge(string id, INode source, INode target, string type) : base(id, source, target, type) { }
    }
}