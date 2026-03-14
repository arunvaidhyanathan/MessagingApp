import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TreeNode } from '../types';

interface NodeRowProps {
  node: TreeNode;
  hierarchy?: string;       // shown beneath label when in search mode
  isSelectable: boolean;    // node.level >= mandatoryLevel
  hasChildren: boolean;
  onSelect: () => void;
  onDrillDown: () => void;
}

const NodeRow: React.FC<NodeRowProps> = ({
  node,
  hierarchy,
  isSelectable,
  hasChildren,
  onSelect,
  onDrillDown,
}) => (
  <div className={`mls-node-row${!isSelectable ? ' mls-node-row--disabled' : ''}`}>
    {/* Text area — selecting the value */}
    <div
      className="mls-node-label"
      onClick={isSelectable ? onSelect : undefined}
      title={isSelectable ? `Select ${node.label}` : `Navigate deeper to select`}
    >
      <span className="mls-node-label-text">{node.label}</span>
      {hierarchy && (
        <span className="mls-node-hierarchy">{hierarchy}</span>
      )}
    </div>

    {/* Chevron — drilling into children */}
    {hasChildren && (
      <button
        className="mls-chevron-btn"
        onClick={onDrillDown}
        title={`Explore ${node.label}`}
      >
        <ChevronRight size={16} />
      </button>
    )}
  </div>
);

export default NodeRow;
