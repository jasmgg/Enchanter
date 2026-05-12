import { useEffect, useState, useCallback, useRef } from 'react';
import { getSpells, getMySpells, Spell, SpellLibraryParams, SpellLibraryResponse } from '../lib/api';

// ── useMySpells — for Spellbook tab (user's own spells) ───────────────────

export function useMySpells() {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await getMySpells({ sort: 'date_desc', limit: 50 });
      setSpells(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { spells, loading, refreshing, error, refresh: () => fetch(true) };
}

// ── useSpellLibrary — for Library tab (paginated global list) ─────────────

export function useSpellLibrary(params: SpellLibraryParams = {}) {
  const [spells, setSpells] = useState<Spell[]>([]);
  const [pagination, setPagination] = useState<SpellLibraryResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef(1);

  const fetchPage = useCallback(async (page: number, replace: boolean) => {
    try {
      const res = await getSpells({ ...params, page, limit: 20 });
      setSpells(prev => replace ? res.data : [...prev, ...res.data]);
      setPagination(res.pagination);
      pageRef.current = page;
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [JSON.stringify(params)]);

  useEffect(() => {
    setLoading(true);
    pageRef.current = 1;
    fetchPage(1, true);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (!pagination) return;
    if (pageRef.current >= pagination.total_pages) return;
    if (loadingMore) return;
    setLoadingMore(true);
    fetchPage(pageRef.current + 1, false);
  }, [pagination, loadingMore, fetchPage]);

  const refresh = useCallback(() => {
    setRefreshing(true);
    pageRef.current = 1;
    fetchPage(1, true);
  }, [fetchPage]);

  return { spells, pagination, loading, loadingMore, refreshing, error, loadMore, refresh };
}
