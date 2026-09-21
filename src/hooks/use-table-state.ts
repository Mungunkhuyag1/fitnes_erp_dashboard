'use client';

import { useCallback, useMemo, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/components/data-table';

export interface TableSort {
  key: string;
  dir: 'ASC' | 'DESC';
}

/**
 * Хүснэгтийн хуудас / хэмжээ / эрэмбийн ТӨЛӨВ.
 *
 * ★ ЯАГААД ТУСДАА ДЭГЭЭ ВЭ
 *
 * Гурван төлөв нь БИЕ БИЕЭСЭЭ хамаардаг: хэмжээ эсвэл эрэмбэ солигдоход
 * хуудсыг ЗААВАЛ 1 болгоно. Эс бөгөөс ажилтан 7-р хуудсан дээр байгаад
 * эрэмбэ солиход өөр өгөгдлийн 7-р хуудас гарч ирнэ — тэр нь хоосон ч
 * байж мэднэ. Дэлгэц бүр дээр гараар бичвэл хаа нэгтээ мартагдана.
 *
 * `params` нь `qs()`-д шууд задлах хэлбэртэй: backend-ийн `PageQueryDto`
 * нэрстэй (`page`, `limit`, `sort`, `order`).
 */
export function useTableState(defaultSort?: TableSort) {
  const [page, setPage] = useState(1);
  const [pageSize, setSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSortState] = useState<TableSort | undefined>(defaultSort);

  const setPageSize = useCallback((n: number) => {
    setSize(n);
    setPage(1);
  }, []);

  const setSort = useCallback((s: TableSort) => {
    setSortState(s);
    setPage(1);
  }, []);

  /**
   * Шүүлтүүр солигдоход дуудна — хуудсыг эхлэлд нь буцаана.
   *
   * Хэд хэдэн дэлгэц дээр `setFilter` нэртэй ижил туслах бичигдсэн
   * байсан; энэ нь тэднийг нэгтгэнэ.
   */
  const onFilter = useCallback((apply: () => void) => {
    apply();
    setPage(1);
  }, []);

  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      sort: sort?.key,
      order: sort?.dir,
    }),
    [page, pageSize, sort],
  );

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    sort,
    setSort,
    onFilter,
    params,
  };
}
