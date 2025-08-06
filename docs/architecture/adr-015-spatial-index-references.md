# ADR-015: SpatialIndex Pattern References

## Status
Informational

## Context
The SpatialIndex is a critical component of Sharpee's architecture, managing spatial relationships between entities. This document captures references and prior art for the patterns used in its design.

## Pattern Description
The SpatialIndex implements a **"Bidirectional Tree Index"** or **"Parent-Pointer Tree with Child Index"** - a Repository pattern using a Bidirectional Map data structure to maintain spatial relationships as a DAG (Directed Acyclic Graph), providing O(1) indexed access to parent-child relationships.

## Academic and Formal References

### Bidirectional Maps
- **"Introduction to Algorithms"** (Cormen, Leiserson, Rivest, Stein) - Discusses bidirectional indexing strategies
- **Google Guava BiMap** - Production implementation with extensive documentation
- **Boost.Bimap** - C++ implementation with formal specifications
- Mathematical foundation: Bijective function with cached inverse

### Spatial Data Structures
- **"Foundations of Multidimensional and Metric Data Structures"** (Hanan Samet, 2006) - Comprehensive reference for spatial indexing
- **"Computational Geometry: Algorithms and Applications"** (de Berg, Cheong, van Kreveld, Overmars) - Spatial query algorithms
- While R-trees and Quadtrees solve different problems, they share the indexing philosophy

### Repository Pattern
- **"Domain-Driven Design"** (Eric Evans, 2003) - Original Repository pattern definition
- **"Patterns of Enterprise Application Architecture"** (Martin Fowler, 2002) - Repository as data access abstraction
- **"Implementing Domain-Driven Design"** (Vaughn Vernon, 2013) - Modern repository implementations

### Graph Theory
- **"Introduction to Graph Theory"** (Douglas West, 2000) - Parent→children map as adjacency list
- **"The Algorithm Design Manual"** (Steven Skiena) - DAG algorithms and cycle detection
- **"Graph Algorithms"** (Shimon Even) - Efficient graph traversal patterns

## Game Engine Prior Art

### Unity's Transform Hierarchy
```csharp
// Bidirectional parent-child relationships
transform.parent = containerTransform;          // Set parent (updates both directions)
transform.GetChild(index);                      // Access children
transform.GetComponentsInChildren<T>();         // Recursive traversal
transform.SetParent(newParent, worldPositionStays);
```

### Unreal Engine's Scene Graph
- Actor/Component attachment system with bidirectional references
- `AttachToComponent()` / `DetachFromComponent()`
- World Outliner maintains hierarchical view
- Supports multiple attachment types (socket, bone, relative)

### Source Engine (Valve)
- Entity parenting system
- `SetParent()` / `GetParent()` maintains bidirectional links
- Hierarchical transformation propagation

## Interactive Fiction Precedents

### Inform 7
```inform7
The jewelry box is a closed openable container.
The ring is in the jewelry box.

-- Internally maintains:
-- parent(ring) = jewelry_box
-- contents(jewelry_box) = [ring]
```

### TADS 3
```cpp
class Container: Thing
    contents = []      // Forward mapping
    location = nil     // Reverse mapping
    
    // Bidirectional update methods
    addToContents(obj) { 
        contents += obj; 
        obj.location = self; 
    }
```

### Inform 6
```inform6
Object -> kitchen "Kitchen"
  has light;
  
Object -> -> table "wooden table"
  has supporter;
  
Object -> -> -> lamp "brass lamp"
  has light;

! Parent/child relationships maintained by compiler
```

### Hugo
- Uses `parent` and `child` properties
- Automatic bidirectional maintenance
- `FindObject()` for spatial queries

## Related Data Structure Patterns

### File Systems
```c
struct inode {
    struct inode *parent;           // Parent directory
    struct list_head children;      // Directory contents
    char name[NAME_MAX];
};

// Linux dcache (directory entry cache) - bidirectional for fast lookups
struct dentry {
    struct dentry *d_parent;        // Parent directory
    struct list_head d_subdirs;     // Subdirectories
};
```

### DOM (Document Object Model)
```javascript
// W3C DOM specification - bidirectional navigation
element.parentNode;                 // O(1) parent access
element.childNodes;                 // O(1) children access
element.appendChild(child);         // Updates both directions
element.removeChild(child);         // Updates both directions
```

### Scene Graphs (Computer Graphics)
- **"Computer Graphics: Principles and Practice"** (Foley, van Dam, Feiner, Hughes)
- **"Real-Time Rendering"** (Akenine-Möller, Haines, Hoffman)
- OpenSceneGraph documentation
- Open Inventor scene graph design

## Implementation Patterns

### Java Examples
```java
// Google Guava
BiMap<String, String> parentToChild = HashBiMap.create();
parentToChild.put(parentId, childId);
String parent = parentToChild.inverse().get(childId); // O(1)

// Apache Commons Collections
BidiMap map = new TreeBidiMap();
```

### C++ Examples
```cpp
// Boost.Bimap
boost::bimap<string, string> relations;
relations.insert(boost::bimap<string,string>::value_type(parent, child));

// Custom implementation pattern
std::unordered_map<ID, std::unordered_set<ID>> parentToChildren;
std::unordered_map<ID, ID> childToParent;
```

### Database Patterns
```sql
-- Adjacency List Model
CREATE TABLE entities (
    id PRIMARY KEY,
    parent_id REFERENCES entities(id),
    INDEX idx_parent (parent_id)  -- Bidirectional query support
);

-- Materialized Path
CREATE TABLE entities (
    id PRIMARY KEY,
    path VARCHAR(255),  -- /root/container/item
    INDEX idx_path (path)
);
```

## Performance Characteristics

### Time Complexity
- Parent lookup: O(1)
- Children lookup: O(1)
- Add relationship: O(1)
- Remove relationship: O(1)
- Find all ancestors: O(depth)
- Find all descendants: O(|subtree|)
- Cycle detection: O(depth)

### Space Complexity
- O(n) for n relationships
- Roughly 2x memory of unidirectional (worth it for O(1) bidirectional access)

## Alternative Names in Literature

The pattern appears under various names:
- **"Bidirectional Tree Index"** - Emphasizes tree structure with two-way lookups
- **"Parent-Pointer Tree with Child Index"** - Data structures textbooks
- **"Augmented Parent-Pointer Structure"** - Academic papers
- **"Bidirectionally Indexed Hierarchy"** - Database literature
- **"Inverse Function Index"** - Mathematical/theoretical CS
- **"Two-Way Navigation Structure"** - OOP design books
- **"Doubly-Linked Tree"** - By analogy with doubly-linked lists

## Best Practices

### From Production Systems
1. **Consistency Invariants**: Always update both directions atomically
2. **Cycle Prevention**: Check before updates, not after
3. **Bulk Operations**: Provide batch update methods for efficiency
4. **Memory Management**: Clear both directions on removal
5. **Thread Safety**: Consider read-write locks if concurrent access needed

### From IF Engines
1. **Implicit Containment**: Objects default to being containable
2. **Special Root**: Often uses null/nil to represent "nowhere"
3. **Recursive Operations**: Support "all contents" queries
4. **Capacity Limits**: Optional max children per parent
5. **Type Restrictions**: Optional constraints on parent-child relationships

## Key References Summary

### Books
1. **"Game Engine Architecture"** (Jason Gregory, 2018) - Chapter 14: Runtime Gameplay Foundation Systems
2. **"Data Structures and Algorithms in Java"** (Goodrich, Tamassia, Goldwasser) - Parent-pointer trees
3. **"Design Patterns"** (Gang of Four) - Composite pattern (related structure)

### Papers
1. "Efficient Hierarchical Spatial Index Structures" - Discusses bidirectional indexing
2. "Parent Pointer Trees and Their Applications" - Tree algorithms

### Online Resources
1. Unity Documentation - Transform hierarchy
2. Unreal Engine Documentation - Actor attachment
3. Google Guava Wiki - BiMap design rationale
4. Martin Fowler's Repository pattern article

## Conclusion

The SpatialIndex pattern is a well-established solution seen across multiple domains:
- Game engines (Unity, Unreal, Source)
- Interactive fiction (Inform, TADS, Hugo)
- System software (file systems, DOM)
- Graphics (scene graphs)

While the specific combination for IF spatial relationships doesn't have a single canonical name, it builds on solid theoretical foundations and proven implementation patterns.
