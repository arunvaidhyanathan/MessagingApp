I want to build a react typescript component which is typeadhead and multi-level select, the user should be able to type and search for data, the data is going to be 2 level or 3 level or 4 levels which parent child relationship.
1) there can be a scenario where level 1 and level 2 are mandatory and level 3 and level 4 are optional. I should be able to configure the levels being mandatory.
2) I should be able to select on the text and I will have a chevron where clicking on the text should select and clicking on the chevron should navigate to next level. Chevron should be available if there are child nodes.
3) When I use the option to type, I should see the hierarchy below the value.
4) We can use something like region, country, state and city as an example. So give me a data so I can have this in the DB and test this scenario.

build a robust multi-level typeahead in React with TypeScript, you need a recursive data structure and a controlled component that tracks the "current view" versus the "selected path."

1. Database/JSON Data Structure

To support varying levels (up to 4) and parent-child relationships, use a recursive tree structure. This format allows you to easily determine if a node has children (to show the chevron).

JSON
[
  {
    "id": "reg-1",
    "label": "North America",
    "level": 1,
    "children": [
      {
        "id": "cnt-1",
        "label": "United States",
        "level": 2,
        "children": [
          {
            "id": "st-1",
            "label": "California",
            "level": 3,
            "children": [
              { "id": "ct-1", "label": "Los Angeles", "level": 4 },
              { "id": "ct-2", "label": "San Francisco", "level": 4 }
            ]
          },
          { "id": "st-2", "label": "Texas", "level": 3 }
        ]
      },
      { "id": "cnt-2", "label": "Canada", "level": 2 }
    ]
  }
]
2. Component Logic & Architecture

You can manage the state by tracking an array of selected nodes: selectedPath: Node[].

Mandatory Levels: Pass a prop minRequiredLevel: number. Validation fails if selectedPath.length < minRequiredLevel.

The "Chevron vs. Text" Split: In your render loop, the list item should have two click targets:

Text Click: Triggers onSelect(node). This sets the value for that level.

Chevron Click: Triggers onNavigate(node). This filters the visible list to show only node.children.

Search/Typeahead: When the user types, flatten the tree into a searchable list. To satisfy your requirement of seeing the hierarchy, each search result should store its lineage.

3. Implementation Strategy (TypeScript)

Type Definitions:

TypeScript
interface LocationNode {
  id: string;
  label: string;
  level: number;
  children?: LocationNode[];
  pathDisplay?: string; // e.g., "North America > USA > California"
}

interface MultiLevelSelectProps {
  data: LocationNode[];
  mandatoryLevels: number; // e.g., 2
  onComplete: (path: LocationNode[]) => void;
}
Search Logic:
To show the hierarchy during typing, use a helper function to flatten the tree once:

TypeScript
const flattenWithHierarchy = (nodes: LocationNode[], parentPath = ""): LocationNode[] => {
  return nodes.reduce((acc, node) => {
    const currentPath = parentPath ? `${parentPath} > ${node.label}` : node.label;
    const flattenedNode = { ...node, pathDisplay: currentPath };
    acc.push(flattenedNode);
    if (node.children) {
      acc.push(...flattenWithHierarchy(node.children, currentPath));
    }
    return acc;
  }, [] as LocationNode[]);
};
4. User Interaction Flow

Idle State: Show Level 1 items.

Chevron Click: Drill down. Update viewStack to show node.children.

Text Click: Select that node. If node.level >= mandatoryLevels, allow submission.

Typing: Switch view to the flattened list. Display pathDisplay (the hierarchy) below the label in the results.

Implementation: Multi-Level Select with Typeahead

This implementation uses a recursive structure to handle the UI and a flattened search index to handle the "hierarchy below the value" requirement.

1. The Data Schema

Use this structure for your database or mock file. It includes a parentId to make path reconstruction easier if needed.

TypeScript
export interface LocationNode {
  id: string;
  label: string;
  level: number; // 1: Region, 2: Country, 3: State, 4: City
  children?: LocationNode[];
}

const mockData: LocationNode[] = [
  {
    id: "r1", label: "Americas", level: 1,
    children: [
      {
        id: "c1", label: "United States", level: 2,
        children: [
          {
            id: "s1", label: "California", level: 3,
            children: [
              { id: "ct1", label: "Los Angeles", level: 4 },
              { id: "ct2", label: "San Francisco", level: 4 }
            ]
          },
          { id: "s2", label: "Texas", level: 3 }
        ]
      }
    ]
  }
];
2. The Component Logic

This component handles the "Chevron vs. Text" split and the "Mandatory Level" validation.

TypeScript
import React, { useState, useMemo } from 'react';
import { ChevronRight, Search } from 'lucide-react';

interface Props {
  data: LocationNode[];
  mandatoryLevels: number;
  onSelect: (path: LocationNode[]) => void;
}

const MultiLevelSelect: React.FC<Props> = ({ data, mandatoryLevels, onSelect }) => {
  const [query, setQuery] = useState('');
  const [currentLevelData, setCurrentLevelData] = useState<LocationNode[]>(data);
  const [selectedPath, setSelectedPath] = useState<LocationNode[]>([]);

  // Flatten data for search results to show hierarchy
  const flattenedData = useMemo(() => {
    const flatten = (nodes: LocationNode[], path: string = ""): any[] => {
      return nodes.reduce((acc, node) => {
        const fullPath = path ? `${path} > ${node.label}` : node.label;
        acc.push({ ...node, fullPath });
        if (node.children) acc.push(...flatten(node.children, fullPath));
        return acc;
      }, [] as any[]);
    };
    return flatten(data);
  }, [data]);

  const filteredResults = query 
    ? flattenedData.filter(n => n.label.toLowerCase().includes(query.toLowerCase()))
    : currentLevelData;

  const handleTextClick = (node: LocationNode) => {
    const newPath = [...selectedPath, node];
    if (node.level >= mandatoryLevels) {
      onSelect(newPath);
      // Logic to close or confirm
    }
    setSelectedPath(newPath);
  };

  const handleChevronClick = (e: React.MouseEvent, node: LocationNode) => {
    e.stopPropagation(); // Prevent text selection
    if (node.children) {
      setCurrentLevelData(node.children);
      setSelectedPath([...selectedPath, node]);
      setQuery(''); // Reset search when navigating
    }
  };

  return (
    <div className="w-80 border rounded-md shadow-sm bg-white">
      {/* Search Input */}
      <div className="flex items-center border-b p-2">
        <Search size={16} className="text-gray-400 mr-2" />
        <input 
          className="outline-none text-sm w-full"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* List Items */}
      <ul className="max-h-60 overflow-y-auto">
        {filteredResults.map((node) => (
          <li key={node.id} className="group flex items-center justify-between p-2 hover:bg-blue-50 cursor-pointer border-b last:border-0">
            <div onClick={() => handleTextClick(node)} className="flex-1">
              <p className="text-sm font-medium text-gray-700">{node.label}</p>
              {/* Requirement #3: Hierarchy display in search */}
              {query && (
                <p className="text-xs text-gray-400">{node.fullPath}</p>
              )}
            </div>
            
            {/* Requirement #2: Chevron for navigation */}
            {node.children && node.children.length > 0 && (
              <button 
                onClick={(e) => handleChevronClick(e, node)}
                className="p-1 hover:bg-blue-100 rounded text-gray-400 group-hover:text-blue-600"
              >
                <ChevronRight size={16} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {/* Validation Footer */}
      <div className="p-2 bg-gray-50 text-[10px] text-gray-500 italic">
        Minimum required depth: Level {mandatoryLevels}
      </div>
    </div>
  );
};
3. Key Design Considerations

Split Interaction: The li wrapper handles the text selection, while the nested button for the chevron uses stopPropagation. This ensures users can choose to "lock in" at a level or "peek inside."

Search View vs. Navigation View: When query is empty, the component acts as a drill-down menu. When query exists, it switches to a flat list that displays the fullPath string (e.g., Americas > USA > California).

Validation: The footer and handleTextClick logic ensure that a user cannot finalize a selection unless the node.level meets the mandatoryLevels threshold.

make this a truly reusable "Common Component," you should shift the logic from hardcoded values to a Configuration Object and Render Props. This allows you to control behavior (mandatory levels) and styling (CSS classes) without touching the core logic.

1. The Configuration Strategy

You should pass these as Props. Props are the standard way to inject configuration into React components, ensuring they remain "pure" and predictable.

What to pass:

data: The recursive tree.

config: An object defining minLevel, maxLevel, and searchable.

classNames: An object for custom styling (Tailwind or CSS modules).

renderItem: (Optional) A function to control how each row looks.

2. The Optimized Common Component

TypeScript
import React, { useState, useMemo } from 'react';

// 1. Define strict types for the Config
interface SelectionConfig {
  mandatoryLevel: number;
  maxLevels: number;
  allowSelectionAtAnyLevel: boolean;
  placeholder?: string;
}

interface StyleConfig {
  container?: string;
  item?: string;
  activeItem?: string;
  chevron?: string;
  searchBar?: string;
}

interface CommonMultiSelectProps {
  data: LocationNode[];
  config: SelectionConfig;
  styles?: StyleConfig;
  onConfirm: (path: LocationNode[]) => void;
}

const UniversalMultiSelect: React.FC<CommonMultiSelectProps> = ({ 
  data, 
  config, 
  styles, 
  onConfirm 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState<LocationNode[][]>([data]); 
  const [currentPath, setCurrentPath] = useState<LocationNode[]>([]);

  // Flatten logic for Typeahead (Requirement #3)
  const searchIndex = useMemo(() => {
    const flatten = (nodes: LocationNode[], parentLabels: string[] = []): any[] => {
      return nodes.reduce((acc, node) => {
        const hierarchy = [...parentLabels, node.label].join(" > ");
        acc.push({ ...node, hierarchy });
        if (node.children) acc.push(...flatten(node.children, [...parentLabels, node.label]));
        return acc;
      }, [] as any[]);
    };
    return flatten(data);
  }, [data]);

  const viewData = searchTerm 
    ? searchIndex.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : history[history.length - 1];

  const handleSelection = (node: LocationNode) => {
    const fullSelection = [...currentPath, node];
    
    // Requirement #1: Mandatory Level Check
    if (node.level >= config.mandatoryLevel) {
      onConfirm(fullSelection);
    } else {
      console.warn(`Selection requires at least level ${config.mandatoryLevel}`);
    }
  };

  const drillDown = (node: LocationNode) => {
    if (node.children) {
      setHistory([...history, node.children]);
      setCurrentPath([...currentPath, node]);
      setSearchTerm('');
    }
  };

  return (
    <div className={styles?.container || "border rounded w-full max-w-md"}>
      <input 
        className={styles?.searchBar || "w-full p-2 border-b"}
        placeholder={config.placeholder || "Search..."}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      
      <div className="max-h-80 overflow-auto">
        {viewData.map(node => (
          <div key={node.id} className="flex items-center justify-between p-3 hover:bg-gray-50 border-b">
            {/* Clickable Text Area */}
            <div 
              className="flex-1 cursor-pointer" 
              onClick={() => handleSelection(node)}
            >
              <div className="text-sm font-semibold">{node.label}</div>
              {searchTerm && <div className="text-xs text-gray-400">{node.hierarchy}</div>}
            </div>

            {/* Requirement #2: Chevron for Navigation */}
            {node.children && (
              <button 
                onClick={() => drillDown(node)}
                className={styles?.chevron || "p-2 hover:bg-gray-200 rounded"}
              >
                ▶
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
3. How to use it (The "Consumer" View)

This is how you call your common component in different parts of your app with different rules.

TypeScript
// Example: Region/City Selector (Mandatory level 2: Region and Country)
const RegionPicker = () => {
  const myConfig = {
    mandatoryLevel: 2,
    maxLevels: 4,
    allowSelectionAtAnyLevel: false,
    placeholder: "Find a city..."
  };

  const customStyles = {
    container: "shadow-lg border-blue-500 rounded-xl overflow-hidden",
    searchBar: "bg-blue-50 p-4 outline-none focus:ring-2 ring-blue-300",
    chevron: "text-blue-500 font-bold"
  };

  return (
    <UniversalMultiSelect 
      data={geoData} 
      config={myConfig} 
      styles={customStyles}
      onConfirm={(path) => console.log("Final Selection Path:", path)}
    />
  );
};
Why this is the "Best" solution:

Loose Coupling: The component doesn't care if it's "Region/City" or "Department/Employee." It only cares about level.

Explicit Validation: By passing mandatoryLevel, you centralize the "business logic" in the props rather than hardcoding if (level === 2) inside the component.

Path Awareness: Because you pass back the entire path (Array of nodes), the parent component knows exactly which Region, Country, and State were traversed to get to the City.

make the component truly "common" and reusable, the best approach is to decouple the Business Logic (validation and navigation) from the Presentation (styles).

By passing a Configuration Object and Render Props, you can use the same component for a "Region > City" selector in one part of your app and a "Category > Sub-category" selector in another, even if the styling and rules differ.

1. The Configuration Object

You should pass these as Props. This allows you to define the "rules" per instance.

mandatoryLevel: The minimum depth a user must reach to "Select."

maxLevels: The maximum depth allowed.

searchable: Boolean to toggle the typeahead.

onSelect: Callback that returns the full path (array of nodes).

2. The Implementation (TypeScript + React)

This version uses a "Breadcrumb" trail to solve the navigation issue and handles the "Chevron vs. Text" split with distinct click handlers.

TypeScript
import React, { useState, useMemo } from 'react';
import { ChevronRight, Search, ChevronLeft } from 'lucide-react';

interface LocationNode {
  id: string;
  label: string;
  level: number;
  children?: LocationNode[];
}

interface SelectionConfig {
  mandatoryLevel: number;
  maxLevels: number;
  placeholder?: string;
}

interface MultiLevelSelectProps {
  data: LocationNode[];
  config: SelectionConfig;
  className?: string;
  onConfirm: (path: LocationNode[]) => void;
}

const CommonMultiSelect: React.FC<MultiLevelSelectProps> = ({ 
  data, 
  config, 
  className = "", 
  onConfirm 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewStack, setViewStack] = useState<LocationNode[][]>([data]);
  const [selectedPath, setSelectedPath] = useState<LocationNode[]>([]);

  // Requirement #3: Flattened search with hierarchy strings
  const searchIndex = useMemo(() => {
    const flatten = (nodes: LocationNode[], pathLabels: string[] = []): any[] => {
      return nodes.reduce((acc, node) => {
        const hierarchy = [...pathLabels, node.label].join(" > ");
        acc.push({ ...node, hierarchy });
        if (node.children) acc.push(...flatten(node.children, [...pathLabels, node.label]));
        return acc;
      }, [] as any[]);
    };
    return flatten(data);
  }, [data]);

  const currentItems = searchTerm 
    ? searchIndex.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : viewStack[viewStack.length - 1];

  const handleTextClick = (node: LocationNode) => {
    // Requirement #1: Mandatory level check
    if (node.level >= config.mandatoryLevel) {
      const finalPath = searchTerm ? [] : [...selectedPath, node]; // Search results would need path reconstruction
      onConfirm(searchTerm ? [node] : finalPath);
    }
  };

  const handleChevronClick = (node: LocationNode) => {
    if (node.children) {
      setViewStack([...viewStack, node.children]);
      setSelectedPath([...selectedPath, node]);
      setSearchTerm(''); // Clear search on navigation
    }
  };

  const goBack = () => {
    if (viewStack.length > 1) {
      setViewStack(viewStack.slice(0, -1));
      setSelectedPath(selectedPath.slice(0, -1));
    }
  };

  return (
    <div className={`w-full max-w-md border rounded-lg bg-white shadow-sm ${className}`}>
      {/* Search Header */}
      <div className="flex items-center p-3 border-b bg-gray-50">
        {viewStack.length > 1 && !searchTerm && (
          <button onClick={goBack} className="mr-2 p-1 hover:bg-gray-200 rounded">
            <ChevronLeft size={18} />
          </button>
        )}
        <Search size={16} className="text-gray-400 mr-2" />
        <input 
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder={config.placeholder || "Search..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List Area */}
      <div className="max-h-72 overflow-y-auto">
        {currentItems.map((node) => (
          <div 
            key={node.id} 
            className="flex items-center justify-between px-4 py-3 hover:bg-blue-50 border-b last:border-0 group"
          >
            {/* Clickable Text Area */}
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => handleTextClick(node)}
            >
              <span className={`text-sm ${node.level < config.mandatoryLevel ? 'text-gray-400' : 'text-gray-800 font-medium'}`}>
                {node.label}
              </span>
              {searchTerm && (
                <div className="text-[10px] text-gray-400 uppercase tracking-tighter">
                  {node.hierarchy}
                </div>
              )}
            </div>

            {/* Requirement #2: Chevron for children */}
            {node.children && (
              <button 
                onClick={() => handleChevronClick(node)}
                className="ml-2 p-1 text-gray-300 group-hover:text-blue-500 hover:bg-blue-100 rounded transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Selection Progress Footer */}
      {!searchTerm && (
        <div className="p-2 bg-gray-50 text-[10px] text-gray-500 border-t">
          Selection Depth: {selectedPath.length + 1} / {config.maxLevels} 
          {selectedPath.length + 1 < config.mandatoryLevel && " (Min level not met)"}
        </div>
      )}
    </div>
  );
};
3. Example Usage (The Configuration)

When you call this component, you simply pass the "Rules of Engagement."

TypeScript
const LocationSelector = () => {
  const geoConfig = {
    mandatoryLevel: 2, // Must select at least a Country (Level 2)
    maxLevels: 4,      // Can go down to City (Level 4)
    placeholder: "Find Region, Country, or City..."
  };

  return (
    <CommonMultiSelect 
      data={regionData} 
      config={geoConfig}
      onConfirm={(path) => console.log("Final Selection:", path)}
    />
  );
};
Why this is the "Best" solution:

State Management: It uses a viewStack (array of arrays). This makes "Going Back" as easy as popping the last array from the stack.

Pathing: In the navigation mode, it tracks the selectedPath so when the user clicks the text, you return the full lineage (Region > Country > State) to the parent.

Search Logic: It renders the hierarchy breadcrumbs only when searching, providing context for duplicate names (e.g., "Springfield" exists in many states).

Backend (5 new files)

  ┌────────────────────────┬───────────────────────────────────────────────────────────────────────────┐
  │          File          │                               What it does                                │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ GeoNode.java           │ JPA entity mapping geo_node table                                         │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ GeoNodeRepository.java │ Spring Data repo — fetches all active nodes ordered by level              │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ TreeNodeDto.java       │ Serializable tree DTO; children omitted from JSON when empty (leaf nodes) │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ GeoService.java        │ Single-pass O(n) tree assembly using LinkedHashMap                        │
  ├────────────────────────┼───────────────────────────────────────────────────────────────────────────┤
  │ GeoController.java     │ GET /api/v1/geo/tree — verified returning full nested JSON                │
  └────────────────────────┴───────────────────────────────────────────────────────────────────────────┘

  Frontend (11 new files)

  ┌───────────────────────────────────┬─────────────────────────────────────────────────────────────────┐
  │               File                │                          What it does                           │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ types.ts                          │ TreeNode, FlatNode, SelectionConfig                             │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ utils.ts                          │ buildSearchIndex + resolveFullPath algorithms                   │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ hooks/useGeoData.ts               │ Fetches /api/v1/geo/tree with loading/error states              │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ subcomponents/SearchBar.tsx       │ Input with back button + clear button                           │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ subcomponents/BreadcrumbTrail.tsx │ Clickable ancestor path strip                                   │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ subcomponents/NodeRow.tsx         │ Split text-click (select) / chevron-click (drill-down)          │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ subcomponents/NodeList.tsx        │ Renders rows, handles empty state                               │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ MultiLevelSelect.tsx              │ Main component — viewStack state, search/drill-down mode toggle │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ MultiLevelSelect.css              │ Full component styling                                          │
  ├───────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
  │ index.tsx                         │ Re-exports component + types                                    │
  └───────────────────────────────────┴─────────────────────────────────────────────────────────────────┘