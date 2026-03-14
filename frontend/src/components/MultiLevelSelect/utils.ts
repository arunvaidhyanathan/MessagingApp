import { TreeNode, FlatNode } from './types';

/**
 * Recursively flattens the tree into a searchable index.
 * Each node carries its full ancestor label chain and id chain.
 */
export const buildSearchIndex = (
  nodes: TreeNode[],
  ancestorLabels: string[] = [],
  ancestorIds: string[] = []
): FlatNode[] =>
  nodes.reduce<FlatNode[]>((acc, node) => {
    const labels = [...ancestorLabels, node.label];
    const ids    = [...ancestorIds,    node.id];
    acc.push({ ...node, hierarchy: labels.join(' > '), pathIds: ids });
    if (node.children?.length) {
      acc.push(...buildSearchIndex(node.children, labels, ids));
    }
    return acc;
  }, []);

/**
 * Given a FlatNode (from search results), reconstruct the full ancestor
 * path as TreeNode[] using the pre-built id→node lookup map.
 */
export const resolveFullPath = (
  node: FlatNode,
  nodeById: Record<string, TreeNode>
): TreeNode[] =>
  node.pathIds.map(id => nodeById[id]).filter(Boolean);
