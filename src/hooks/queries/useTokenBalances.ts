"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Address, formatUnits } from "viem";
import { usePrivy } from "@privy-io/react-auth";

const QUERY_KEY_PREFIX = "token-balances";
const STALE_TIME = 15_000; // 15 seconds
const REFETCH_INTERVAL = 30_000; // 30 seconds

interface TokenBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
}

interface UseTokenBalancesResult {
  usdt0: TokenBalance;
  xaut0: TokenBalance;
}

interface UseTokenBalanceOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * React Query hook for fetching token balances via /api/balances.
 */
export function useTokenBalances(
  userAddress: Address | undefined,
  options: UseTokenBalanceOptions = {}
) {
  const { enabled = true, refetchInterval = REFETCH_INTERVAL } = options;
  const { getAccessToken } = usePrivy();

  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, userAddress],
    queryFn: async (): Promise<UseTokenBalancesResult> => {
      if (!userAddress) {
        throw new Error("No user address provided");
      }

      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const res = await fetch(`/api/balances?address=${userAddress}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch balances");

      const data = await res.json();

      return {
        usdt0: {
          raw: BigInt(data.usdt0.raw),
          formatted: data.usdt0.formatted,
          decimals: data.usdt0.decimals,
        },
        xaut0: {
          raw: BigInt(data.xaut0.raw),
          formatted: data.xaut0.formatted,
          decimals: data.xaut0.decimals,
        },
      };
    },
    enabled: enabled && !!userAddress,
    staleTime: STALE_TIME,
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch token balances.
 */
export function useInvalidateTokenBalances() {
  const queryClient = useQueryClient();

  return (userAddress?: Address) => {
    if (userAddress) {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_PREFIX, userAddress],
      });
    } else {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY_PREFIX],
      });
    }
  };
}

/**
 * Helper to format balance for display.
 */
export function formatBalanceDisplay(
  raw: bigint,
  decimals: number,
  symbol: string,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showLessThan?: boolean;
  }
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 4,
    showLessThan = true,
  } = options ?? {};

  const value = Number(formatUnits(raw, decimals));

  // Handle very small values
  if (showLessThan && value > 0 && value < 0.0001) {
    return `< 0.0001 ${symbol}`;
  }

  // Format based on symbol type
  if (symbol === "XAUt0") {
    return `${value.toFixed(maximumFractionDigits)} ${symbol}`;
  }

  return `${value.toLocaleString(undefined, {
    minimumFractionDigits,
    maximumFractionDigits,
  })} ${symbol}`;
}
