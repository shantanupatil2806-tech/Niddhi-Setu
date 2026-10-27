import { useState, useCallback } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialLimit?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPage] = useState<number>(options.initialPage || 1);
  const [limit, setLimit] = useState<number>(options.initialLimit || 10);
  const [total, setTotal] = useState<number>(0);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const nextPage = useCallback(() => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((prev) => Math.max(prev - 1, 1));
  }, []);

  const goToPage = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const reset = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    limit,
    total,
    totalPages,
    setPage: goToPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    reset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
