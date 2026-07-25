import { useCallback, useEffect, useState } from 'react';
import { QueryConstraint, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { getPaginated } from '@/firebase/firestore';

interface UseFirestoreCollectionResult<T> {
  docs: (T & { id: string })[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
}

/**
 * Hook generik untuk membaca koleksi Firestore dengan PAGINATION WAJIB (§13),
 * supaya read tidak membengkak saat data tanah bertambah banyak.
 */
export function useFirestoreCollection<T = DocumentData>(
  collectionName: string,
  constraints: QueryConstraint[] = [],
  pageSize = 25
): UseFirestoreCollectionResult<T> {
  const [docs, setDocs] = useState<(T & { id: string })[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: unknown, append = false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getPaginated<T>(collectionName, constraints, pageSize, cursor);
        setDocs((prev) => (append ? [...prev, ...result.docs] : result.docs));
        setLastDoc(result.lastDoc as QueryDocumentSnapshot | null);
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memuat data.');
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionName, JSON.stringify(constraints.map(String)), pageSize]
  );

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (lastDoc) await fetchPage(lastDoc, true);
  }, [lastDoc, fetchPage]);

  const reload = useCallback(async () => {
    await fetchPage();
  }, [fetchPage]);

  return { docs, loading, error, hasMore, loadMore, reload };
}
