import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TreeNode, FlatNode, SelectionConfig } from './types';
import { buildSearchIndex, resolveFullPath } from './utils';
import SearchBar from './subcomponents/SearchBar';
import BreadcrumbTrail from './subcomponents/BreadcrumbTrail';
import NodeList from './subcomponents/NodeList';
import './MultiLevelSelect.css';

interface MultiLevelSelectProps {
  data: TreeNode[];
  config: SelectionConfig;
  loading?: boolean;
  error?: string | null;
  defaultPath?: TreeNode[];
  className?: string;
  onConfirm: (path: TreeNode[]) => void;
}

const MultiLevelSelect: React.FC<MultiLevelSelectProps> = ({
  data,
  config,
  loading = false,
  error = null,
  defaultPath,
  className = '',
  onConfirm,
}) => {
  const [viewStack, setViewStack]       = useState<TreeNode[][]>([data]);
  const [selectedPath, setSelectedPath] = useState<TreeNode[]>([]);
  const [searchTerm, setSearchTerm]     = useState<string>('');
  const [confirmed, setConfirmed]       = useState<TreeNode[] | null>(defaultPath ?? null);
  const [isOpen, setIsOpen]             = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Reset drill-down stack when data first loads
  useEffect(() => {
    setViewStack([data]);
  }, [data]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flat index built once — powers typeahead search
  const flatIndex = useMemo(() => buildSearchIndex(data), [data]);

  // O(1) lookup: id → node (used for path reconstruction in search mode)
  const nodeById = useMemo<Record<string, TreeNode>>(
    () => Object.fromEntries(flatIndex.map(n => [n.id, n])),
    [flatIndex]
  );

  const isSearchMode = searchTerm.trim().length > 0;

  const visibleItems: TreeNode[] | FlatNode[] = isSearchMode
    ? flatIndex.filter(n => n.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : viewStack[viewStack.length - 1] ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelect = (node: TreeNode, isFlatResult: boolean): void => {
    if (node.level < config.mandatoryLevel) return;

    const fullPath: TreeNode[] = isFlatResult
      ? resolveFullPath(node as FlatNode, nodeById)
      : [...selectedPath, node];

    setConfirmed(fullPath);
    setIsOpen(false);
    setSearchTerm('');
    onConfirm(fullPath);
  };

  const handleDrillDown = (node: TreeNode): void => {
    if (!node.children?.length) return;
    setViewStack(prev => [...prev, node.children!]);
    setSelectedPath(prev => [...prev, node]);
    setSearchTerm('');
  };

  const handleBack = (): void => {
    if (viewStack.length > 1) {
      setViewStack(prev => prev.slice(0, -1));
      setSelectedPath(prev => prev.slice(0, -1));
    }
    setSearchTerm('');
  };

  // Breadcrumb click — jump to an ancestor level
  const handleBreadcrumbNavigate = (index: number): void => {
    if (index === -1) {
      setViewStack([data]);
      setSelectedPath([]);
    } else {
      setViewStack(prev => prev.slice(0, index + 2));
      setSelectedPath(prev => prev.slice(0, index + 1));
    }
    setSearchTerm('');
  };

  // Called when confirmed chips are clicked — resets and reopens
  const handleOpen = (): void => {
    setConfirmed(null);
    setViewStack([data]);
    setSelectedPath([]);
    setSearchTerm('');
    setIsOpen(true);
  };

  // Called when the search input is clicked/focused — just opens, no reset
  const handleActivate = (): void => {
    setIsOpen(true);
  };

  const handleClear = (): void => {
    setConfirmed(null);
    setViewStack([data]);
    setSelectedPath([]);
    setSearchTerm('');
    setIsOpen(true);
  };

  // Typing always opens the dropdown
  const handleSearchChange = (term: string): void => {
    setSearchTerm(term);
    setIsOpen(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <div className={`mls-container ${className}`}><div className="mls-status">Loading…</div></div>;
  if (error)   return <div className={`mls-container ${className}`}><div className="mls-status mls-status--error">Error: {error}</div></div>;

  const levelLabel    = config.levelLabels?.[config.mandatoryLevel] ?? `Level ${config.mandatoryLevel}`;
  const currentDepth  = selectedPath.length + 1;

  return (
    <div className={`mls-container${isOpen ? ' mls-container--open' : ''} ${className}`} ref={containerRef}>

      {/* Search bar — shows chips when confirmed, input when open */}
      <SearchBar
        searchTerm={searchTerm}
        placeholder={config.placeholder ?? 'Search…'}
        canGoBack={!isSearchMode && viewStack.length > 1}
        confirmedPath={confirmed}
        onChange={handleSearchChange}
        onBack={handleBack}
        onOpen={handleOpen}
        onActivate={handleActivate}
        onClear={handleClear}
      />

      {/* Dropdown — only rendered when open */}
      {isOpen && (
        <>
          {/* Breadcrumb trail */}
          {!isSearchMode && (
            <BreadcrumbTrail
              path={selectedPath}
              onNavigate={handleBreadcrumbNavigate}
            />
          )}

          {/* Node list */}
          <NodeList
            items={visibleItems}
            isSearchMode={isSearchMode}
            mandatoryLevel={config.mandatoryLevel}
            onSelect={handleSelect}
            onDrillDown={handleDrillDown}
          />

          {/* Footer */}
          {!isSearchMode && (
            <div className="mls-footer">
              <span>Depth: {currentDepth} / {config.maxLevels}</span>
              {currentDepth < config.mandatoryLevel && (
                <span className="mls-footer-hint"> — navigate to {levelLabel} to select</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MultiLevelSelect;
