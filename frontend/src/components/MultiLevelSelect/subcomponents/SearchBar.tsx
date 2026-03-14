import React from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import { TreeNode } from '../types';

interface SearchBarProps {
  searchTerm: string;
  placeholder: string;
  canGoBack: boolean;
  confirmedPath: TreeNode[] | null;
  onChange: (term: string) => void;
  onBack: () => void;
  onOpen: () => void;
  onActivate: () => void;
  onClear: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  searchTerm,
  placeholder,
  canGoBack,
  confirmedPath,
  onChange,
  onBack,
  onOpen,
  onActivate,
  onClear,
}) => {
  // ── Confirmed state: show path as chips in the input area ──────────────
  if (confirmedPath) {
    return (
      <div className="mls-search-bar mls-search-bar--confirmed" onClick={onOpen}>
        <div className="mls-chips">
          {confirmedPath.map((node, i) => (
            <span key={node.id} className="mls-chip-segment">
              {i > 0 && <span className="mls-chip-sep"> › </span>}
              <span className="mls-chip">{node.label}</span>
            </span>
          ))}
        </div>
        <button
          className="mls-clear-btn"
          onClick={e => { e.stopPropagation(); onClear(); }}
          title="Clear selection"
        >
          ✕
        </button>
      </div>
    );
  }

  // ── Default state: search input ─────────────────────────────────────────
  return (
    <div className="mls-search-bar">
      {canGoBack && (
        <button className="mls-back-btn" onClick={onBack} title="Go back">
          <ChevronLeft size={18} />
        </button>
      )}
      <Search size={15} className="mls-search-icon" />
      <input
        className="mls-search-input"
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={e => onChange(e.target.value)}
        onClick={onActivate}
        onFocus={onActivate}
      />
      {searchTerm && (
        <button className="mls-clear-btn" onClick={() => onChange('')} title="Clear">
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchBar;
