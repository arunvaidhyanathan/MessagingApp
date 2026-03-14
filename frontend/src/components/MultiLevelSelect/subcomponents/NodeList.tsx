import React from 'react';
import { TreeNode, FlatNode } from '../types';
import NodeRow from './NodeRow';

interface NodeListProps {
  items: TreeNode[] | FlatNode[];
  isSearchMode: boolean;
  mandatoryLevel: number;
  onSelect: (node: TreeNode, isFlatNode: boolean) => void;
  onDrillDown: (node: TreeNode) => void;
}

const isFlatNode = (node: TreeNode): node is FlatNode =>
  'hierarchy' in node;

const NodeList: React.FC<NodeListProps> = ({
  items,
  isSearchMode,
  mandatoryLevel,
  onSelect,
  onDrillDown,
}) => {
  if (items.length === 0) {
    return (
      <div className="mls-empty">
        {isSearchMode ? 'No results found.' : 'No items available.'}
      </div>
    );
  }

  return (
    <div className="mls-node-list">
      {items.map(node => (
        <NodeRow
          key={node.id}
          node={node}
          hierarchy={isSearchMode && isFlatNode(node) ? node.hierarchy : undefined}
          isSelectable={node.level >= mandatoryLevel}
          hasChildren={!!(node.children?.length)}
          onSelect={() => onSelect(node, isFlatNode(node))}
          onDrillDown={() => onDrillDown(node)}
        />
      ))}
    </div>
  );
};

export default NodeList;
