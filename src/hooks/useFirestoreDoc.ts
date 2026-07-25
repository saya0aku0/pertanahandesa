import { useEffect, useState } from 'react';
import { DocumentData } from 'firebase/firestore';
import { getDocById } from '@/firebase/firestore';

export function useFirestoreDoc<T = DocumentData>(collectionName: string, id: string | undefined) {
  const [data, setData] = useState<(T & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    getDocById<T>(collectionName, id)
      .then((result) => {
        if (active) setData(result as (T & { id: string }) | null);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [collectionName, id]);

  return { data, loading, error };
}
