"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { PythPrices } from "@/types";

interface PricesResponse extends PythPrices {
  timestamp: number;
}

const STALE_TIME = 10_000;
const REFETCH_INTERVAL = 15_000;

/**
 * React Query hook for fetching prices from /api/prices.
 * Drop-in replacement for usePythPrices.
 */
export function usePrices(options?: { enabled?: boolean }) {
  const query = useQuery<PricesResponse>({
    queryKey: ["prices"],
    queryFn: async () => {
      const res = await fetch("/api/prices");
      if (!res.ok) throw new Error("Failed to fetch prices");
      return res.json();
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    ...options,
  });

  const prices: PythPrices = useMemo(() => ({
    XAUt: query.data?.XAUt ?? 0,
    USDT: query.data?.USDT ?? 1,
  }), [query.data?.XAUt, query.data?.USDT]);

  const getUsdValue = useCallback(
    (amount: number, token: keyof PythPrices): number => {
      return amount * prices[token];
    },
    [prices]
  );

  const formatUsdValue = useCallback(
    (
      amount: number,
      token: keyof PythPrices,
      formatOptions?: Intl.NumberFormatOptions
    ): string => {
      const usdValue = getUsdValue(amount, token);
      return usdValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...formatOptions,
      });
    },
    [getUsdValue]
  );

  return {
    prices,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    getUsdValue,
    formatUsdValue,
  };
}
