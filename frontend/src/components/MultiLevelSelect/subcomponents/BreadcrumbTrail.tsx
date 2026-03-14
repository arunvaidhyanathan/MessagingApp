import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TreeNode } from '../types';

interface BreadcrumbTrailProps {
  path: TreeNode[];
  onNavigate: (index: number) => void;
}

const BreadcrumbTrail: React.FC<BreadcrumbTrailProps> = ({ path, onNavigate }) => {
  if (path.length === 0) return null;

  return (
    <div className="mls-breadcrumb">
      <button className="mls-breadcrumb-item mls-breadcrumb-root" onClick={() => onNavigate(-1)}>
        All
      </button>
      {path.map((node, index) => (
        <React.Fragment key={node.id}>
          <ChevronRight size={12} className="mls-breadcrumb-sep" />
          <button
            className={`mls-breadcrumb-item${index === path.length - 1 ? ' mls-breadcrumb-current' : ''}`}
            onClick={() => onNavigate(index)}
          >
            {node.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default BreadcrumbTrail;
