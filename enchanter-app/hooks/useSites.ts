import { useCallback, useEffect, useState } from 'react';
import { getSites, Site } from '../lib/api';

export function useSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    getSites()
      .then((data) => {
        if (!cancelled) {
          setSites(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return load();
  }, [load]);

  return { sites, loading, error, refetch: load };
}
