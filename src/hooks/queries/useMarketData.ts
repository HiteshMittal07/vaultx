"use client";

import { useQuery } from "@tanstack/react-query";

interface MarketData {
  totalMarketSize: number;
  totalLiquidity: number;
  borrowedFunds: number;
  utilization: string;
  borrowRate: string;
  oraclePrice: number;
  lltv: number;
  timestamp: number;
}

const STALE_TIME = 15_000;
const REFETCH_INTERVAL = 30_000;

/**
 * React Query hook for fetching market data from /api/market.
 */
export function useMarketData(options?: { enabled?: boolean }) {
  return useQuery<MarketData>({
    queryKey: ["market-data"],
    queryFn: async () => {
      const res = await fetch("/api/market");
      if (!res.ok) throw new Error("Failed to fetch market data");
      return res.json();
    },
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    ...options,
  });
}
