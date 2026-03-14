export interface TreeNode {
  id: string;
  code: string;
  label: string;
  level: number;
  children?: TreeNode[];
}

export interface FlatNode extends TreeNode {
  hierarchy: string;   // "NAM > United States > California"
  pathIds: string[];   // ancestor id chain including self
}

export interface SelectionConfig {
  mandatoryLevel: number;
  maxLevels: number;
  allowSelectionAtAnyLevel: boolean;
  searchable: boolean;
  placeholder?: string;
  levelLabels?: Record<number, string>;
}
