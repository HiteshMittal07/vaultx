"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";

interface PositionData {
  userCollateral: number;
  userBorrow: number;
  currentLTV: number;
  lltv: number;
  liquidationPrice: number;
  percentDropToLiquidation: number;
  maxWithdrawable: number;
  oraclePrice: number;
  hasPosition: boolean;
  timestamp: number;
}

const STALE_TIME = 15_000;

/**
 * React Query hook for fetching user position from /api/positions.
 */
export function usePosition(address?: string) {
  const { getAccessToken } = usePrivy();

  return useQuery<PositionData>({
    queryKey: ["position", address],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const res = await fetch(`/api/positions?address=${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch position");
      return res.json();
    },
    enabled: !!address,
    staleTime: STALE_TIME,
  });
}

/**
 * Hook to invalidate and refetch position data.
 */
export function useInvalidatePosition() {
  const queryClient = useQueryClient();

  return (address?: string) => {
    if (address) {
      queryClient.invalidateQueries({
        queryKey: ["position", address],
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: ["position"],
      });
    }
  };
}
