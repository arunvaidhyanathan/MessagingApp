# Multi-Level Typeahead Select — Implementation Plan

## Overview

A reusable, configurable React/TypeScript component that supports **2–4 level hierarchical selection** with typeahead search, chevron-based drill-down navigation, and configurable mandatory depth. The geographic hierarchy (Region → Country → State → City) serves as the reference dataset.

---

## 1. Data Model

### 1.1 Database Schema

A single self-referencing table handles all hierarchy levels generically.

```
geo_node
─────────────────────────────────────────
id          BIGSERIAL PK
code        VARCHAR(20)   -- e.g. "NAM", "US", "CA"
label       VARCHAR(255)  -- display name
level       INT           -- 1=Region, 2=Country, 3=State, 4=City
parent_id   BIGINT FK → geo_node(id)
sort_order  INT           -- controls display ordering within siblings
active      BOOLEAN
```

**Why a single table?** The component is generic — it doesn't care whether levels represent geo nodes, product categories, or org hierarchy. One table allows a single API endpoint and one recursive query.

### 1.2 TypeScript Types (Frontend)

```ts
// shared types — used by component AND API layer
export interface TreeNode {
  id: string;
  code: string;
  label: string;
  level: number;
  children?: TreeNode[];
}

export interface FlatNode extends TreeNode {
  hierarchy: string;   // "NAM > United States > California"
  pathIds: string[];   // ["r1", "c1", "s1"] for breadcrumb reconstruction
}

export interface SelectionConfig {
  mandatoryLevel: number;        // minimum level user must reach to confirm
  maxLevels: number;             // deepest navigable level (2–4)
  allowSelectionAtAnyLevel: boolean;
  searchable: boolean;
  placeholder?: string;
  levelLabels?: Record<number, string>;  // e.g. {1:"Region", 2:"Country"}
}
```

---

## 2. Architecture

### 2.1 Component Tree

```
<MultiLevelSelect>           ← exported common component
  ├── <SearchBar />          ← input + back-chevron
  ├── <BreadcrumbTrail />    ← clickable path (Region > USA > ...)
  ├── <NodeList />           ← drill-down OR search results view
  │     └── <NodeRow />      ← label click (select) + chevron click (drill)
  └── <SelectionFooter />    ← depth indicator + validation hint
```

### 2.2 State Model

| State variable | Type | Purpose |
|---|---|---|
| `viewStack` | `TreeNode[][]` | Stack of visible item lists — push on drill-down, pop on back |
| `selectedPath` | `TreeNode[]` | Confirmed ancestors at each level |
| `searchTerm` | `string` | Toggles between drill-down view and flat search view |
| `pendingNode` | `TreeNode \| null` | Node highlighted but not yet confirmed |

### 2.3 Two Interaction Modes

```
Mode A — Drill-Down (searchTerm is empty)
  viewStack[top]  →  renders current level items
  Text click      →  calls onConfirm if level >= mandatoryLevel
  Chevron click   →  push children onto viewStack

Mode B — Search (searchTerm has value)
  flatIndex       →  filters across all levels simultaneously
  Each result     →  shows label + hierarchy breadcrumb below it
  Text click      →  resolves full path from pathIds, calls onConfirm
  Chevron click   →  switches to drill-down at that node's children
  Back button     →  clears searchTerm, returns to Mode A
```

---

## 3. Component API (Props)

```ts
interface MultiLevelSelectProps {
  // Required
  data: TreeNode[];
  config: SelectionConfig;
  onConfirm: (path: TreeNode[]) => void;

  // Optional
  className?: string;
  defaultPath?: TreeNode[];          // pre-selected state for edit forms
  loading?: boolean;                 // shows skeleton while data loads
  error?: string;                    // shows error state
  onSearch?: (term: string) => void; // hook for server-side search
}
```

### Config Examples

```ts
// Mandatory: at least Country (level 2). Optional: State + City
const geoConfig: SelectionConfig = {
  mandatoryLevel: 2,
  maxLevels: 4,
  allowSelectionAtAnyLevel: false,
  searchable: true,
  placeholder: "Search region, country, city…",
  levelLabels: { 1: "Region", 2: "Country", 3: "State", 4: "City" }
};

// Strict: must reach City (level 4)
const strictGeoConfig: SelectionConfig = {
  mandatoryLevel: 4,
  maxLevels: 4,
  allowSelectionAtAnyLevel: false,
  searchable: true,
  placeholder: "Find a city…"
};

// Two-level only (e.g. Category > Sub-category)
const categoryConfig: SelectionConfig = {
  mandatoryLevel: 2,
  maxLevels: 2,
  allowSelectionAtAnyLevel: false,
  searchable: true,
  placeholder: "Select category…"
};
```

---

## 4. Key Algorithms

### 4.1 Search Index (built once with `useMemo`)

```ts
const buildSearchIndex = (nodes: TreeNode[], ancestorLabels: string[] = [], ancestorIds: string[] = []): FlatNode[] =>
  nodes.reduce<FlatNode[]>((acc, node) => {
    const labels = [...ancestorLabels, node.label];
    const ids    = [...ancestorIds, node.id];
    acc.push({ ...node, hierarchy: labels.join(" > "), pathIds: ids });
    if (node.children) acc.push(...buildSearchIndex(node.children, labels, ids));
    return acc;
  }, []);
```

### 4.2 Path Reconstruction (for search → confirm)

When the user clicks a result in search mode, reconstruct the full ancestor path from `pathIds` using the flat index (O(n) lookup):

```ts
const nodeById = useMemo(
  () => Object.fromEntries(flatIndex.map(n => [n.id, n])),
  [flatIndex]
);

const resolveFullPath = (node: FlatNode): TreeNode[] =>
  node.pathIds.map(id => nodeById[id]);
```

### 4.3 Back Navigation

```ts
const goBack = () => {
  if (viewStack.length > 1) {
    setViewStack(prev => prev.slice(0, -1));
    setSelectedPath(prev => prev.slice(0, -1));
  }
};
```

---

## 5. Backend API

### 5.1 Endpoint

```
GET /api/v1/geo/tree
```

Returns the full tree from the database, assembled recursively server-side. The frontend caches this in `useMemo` — no repeated fetches during interaction.

### 5.2 Spring Boot — Service Layer

```java
// Recursive CTE query to build tree
@Query(value = """
  WITH RECURSIVE tree AS (
    SELECT * FROM geo_node WHERE parent_id IS NULL AND active = true
    UNION ALL
    SELECT g.* FROM geo_node g JOIN tree t ON g.parent_id = t.id WHERE g.active = true
  )
  SELECT * FROM tree ORDER BY level, sort_order
""", nativeQuery = true)
List<GeoNode> fetchFullTree();
```

Map flat result into `TreeNodeDto` hierarchy in the service layer before returning.

### 5.3 Response DTO

```java
public record TreeNodeDto(
    String id,
    String code,
    String label,
    int level,
    List<TreeNodeDto> children
) {}
```

---

## 6. Styling Strategy

The component accepts a `className` prop and uses **Tailwind CSS** utility classes internally. Override via `className` for per-instance customisation. No inline styles.

| Element | Default classes |
|---|---|
| Container | `w-full max-w-md border rounded-lg bg-white shadow-sm` |
| Search bar | `flex items-center p-3 border-b bg-gray-50` |
| Node row | `flex items-center justify-between px-4 py-3 hover:bg-blue-50 border-b` |
| Chevron button | `p-1 text-gray-300 group-hover:text-blue-500 hover:bg-blue-100 rounded` |
| Hierarchy label | `text-[10px] text-gray-400 uppercase tracking-tight` |
| Footer | `p-2 bg-gray-50 text-[10px] text-gray-500 border-t` |

---

## 7. Validation

| Condition | Behaviour |
|---|---|
| `node.level < mandatoryLevel` | Text is greyed out; click shows inline hint, does not confirm |
| `node.level >= mandatoryLevel` | Text is full colour; click calls `onConfirm(path)` |
| No children | Chevron is hidden |
| `searchTerm` active + back clicked | Clears search; returns to drill-down at last position |

---

## 8. File Structure

```
frontend/src/
└── components/
    └── MultiLevelSelect/
        ├── index.tsx                  ← re-exports MultiLevelSelect
        ├── MultiLevelSelect.tsx       ← main component
        ├── MultiLevelSelect.css       ← optional overrides
        ├── types.ts                   ← TreeNode, FlatNode, SelectionConfig
        ├── utils.ts                   ← buildSearchIndex, resolveFullPath
        ├── hooks/
        │   └── useGeoData.ts          ← fetches + caches /api/v1/geo/tree
        └── subcomponents/
            ├── SearchBar.tsx
            ├── BreadcrumbTrail.tsx
            ├── NodeList.tsx
            └── NodeRow.tsx
```

---

## 9. Implementation Phases

### Phase 1 — Data Layer
- [ ] Run Liquibase migration: `geo_node` table + seed data
- [ ] Spring Boot entity, repository, service, DTO
- [ ] `GET /api/v1/geo/tree` endpoint returning full nested tree

### Phase 2 — Core Component
- [ ] `types.ts` — `TreeNode`, `FlatNode`, `SelectionConfig`
- [ ] `utils.ts` — `buildSearchIndex`, `resolveFullPath`
- [ ] `MultiLevelSelect.tsx` — drill-down mode (no search yet)
- [ ] `useGeoData.ts` — fetch hook with loading/error states

### Phase 3 — Search & UX
- [ ] Typeahead search with flat index
- [ ] Hierarchy breadcrumb display in search results
- [ ] `BreadcrumbTrail` navigation strip at top
- [ ] Back button in drill-down mode

### Phase 4 — Polish & Reusability
- [ ] `SelectionConfig` validation (mandatory level enforcement)
- [ ] `defaultPath` prop for pre-populated edit forms
- [ ] `loading` skeleton + `error` state rendering
- [ ] Keyboard navigation (↑ ↓ Enter Escape)
- [ ] Demonstrate component reuse with a second non-geo config

---

## 10. Demo Usage (LocationSelector page)

```tsx
import MultiLevelSelect from '../components/MultiLevelSelect';
import useGeoData from '../components/MultiLevelSelect/hooks/useGeoData';

const LocationSelector = () => {
  const { data, loading, error } = useGeoData();

  return (
    <MultiLevelSelect
      data={data}
      loading={loading}
      error={error}
      config={{
        mandatoryLevel: 2,
        maxLevels: 4,
        allowSelectionAtAnyLevel: false,
        searchable: true,
        placeholder: "Search region, country, city…",
        levelLabels: { 1: "Region", 2: "Country", 3: "State", 4: "City" }
      }}
      onConfirm={(path) => console.log("Selected path:", path.map(n => n.label).join(" > "))}
    />
  );
};
```
