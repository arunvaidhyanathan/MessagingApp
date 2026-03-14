import { useState, useEffect } from 'react';
import { TreeNode } from '../types';

interface UseGeoDataResult {
  data: TreeNode[];
  loading: boolean;
  error: string | null;
}

const useGeoData = (): UseGeoDataResult => {
  const [data, setData]       = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/geo/tree')
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json() as Promise<TreeNode[]>;
      })
      .then(tree => {
        setData(tree);
        setError(null);
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
};

export default useGeoData;
