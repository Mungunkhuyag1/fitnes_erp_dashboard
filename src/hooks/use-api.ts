'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Cache<T> {
  /** Аль хүсэлтийн үр дүн вэ (`path#tick`). */
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Энгийн GET hook — ачаалах, алдаа, дахин ачаалах.
 *
 * `refreshMs` өгвөл тухайн интервалаар өөрөө шинэчлэнэ (ирцийн урсгал,
 * терминалын төлөв г.м. байнга өөрчлөгддөг өгөгдөлд).
 *
 * ⚠ `loading`-ыг STATE-д БИШ, УЛГААЖ (derive) авна: effect дотор
 * `setState` синхроноор дуудвал React-д cascading render үүсдэг
 * (`react-hooks/set-state-in-effect`). Иймд төлөвт зөвхөн «аль хүсэлтийн
 * үр дүн бэ» гэдгийг хадгалж, `loading`-ыг харьцуулалтаар гаргана.
 */
export function useApi<T>(
  path: string | null,
  opts: { refreshMs?: number } = {},
): { data: T | null; error: string | null; loading: boolean; reload: () => void } {
  const [tick, setTick] = useState(0);
  const [cache, setCache] = useState<Cache<T>>({
    key: null,
    data: null,
    error: null,
  });

  const key = path ? `${path}#${tick}` : null;

  useEffect(() => {
    if (!path || !key) return;
    const ctrl = new AbortController();
    // setState нь ЗӨВХӨН promise callback дотор — effect-ийн биед биш.
    api
      .get<T>(path, ctrl.signal)
      .then((data) => {
        if (!ctrl.signal.aborted) setCache({ key, data, error: null });
      })
      .catch((e: unknown) => {
        if (ctrl.signal.aborted) return;
        setCache({
          key,
          data: null,
          error: e instanceof Error ? e.message : 'Алдаа гарлаа',
        });
      });
    return () => ctrl.abort();
  }, [path, key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!opts.refreshMs || !path) return;
    const id = setInterval(reload, opts.refreshMs);
    return () => clearInterval(id);
  }, [opts.refreshMs, path, reload]);

  const fresh = cache.key === key;
  return {
    // Шинэчлэх үед хуучин өгөгдлийг харуулсаар байна (дэлгэц анивчихгүй).
    data: cache.data,
    error: fresh ? cache.error : null,
    loading: !!path && !fresh,
    reload,
  };
}
