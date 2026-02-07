"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Address } from "viem";
import {
  getMorphoMarketData,
  getBorrowRate,
  getOraclePrice,
} from "@/lib/blockchain/utils";
import {
  MorphoMarketParamsRaw,
  MorphoMarketStateRaw,
  MorphoUserPositionRaw,
} from "@/types";

interface MorphoMarketDataResult {
  params: MorphoMarketParamsRaw | null;
  state: MorphoMarketStateRaw | null;
  position: MorphoUserPositionRaw | null;
  borrowRate: string;
  oraclePrice: number;
  computed: {
    totalMarketSize: number;
    totalLiquidity: number;
    borrowedFunds: number;
    utilization: string;
    lltv: number;
    userCollateral: number;
    userBorrow: number;
  };
}

const QUERY_KEY_PREFIX = "morpho-market-data";
const STALE_TIME = 30_000; // 30 seconds
const REFETCH_INTERVAL = 60_000; // 1 minute

interface UseMorphoMarketDataOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
}

/**
 * React Query hook for fetching Morpho market data.
 * Replaces manual useState/useEffect patterns in BorrowDashboard.
 */
export function useMorphoMarketData(
  userAddress: Address | undefined,
  options: UseMorphoMarketDataOptions = {}
) {
  const { enabled = true, refetchInterval = REFETCH_INTERVAL } = options;

  return useQuery({
    queryKey: [QUERY_KEY_PREFIX, userAddress],
    queryFn: async (): Promise<MorphoMarketDataResult> => {
      if (!userAddress) {
        throw new Error("No user address provided");
      }

      // Fetch base market data
      const { params, state, position } = await getMorphoMarketData(userAddress);

      // Fetch additional data
      let borrowRate = "0.00";
      let oraclePrice = 0;

      if (params && state) {
        borrowRate = await getBorrowRate(params, state);
        oraclePrice = await getOraclePrice(params);
      }

      // Cast to proper types
      const typedParams = params as MorphoMarketParamsRaw | null;
      const typedState = state as MorphoMarketStateRaw | null;
      const typedPosition = position as MorphoUserPositionRaw | null;

      // Compute derived values
      const computed = computeMarketValues(
        typedParams,
        typedState,
        typedPosition,
      );

      return {
        params: typedParams,
        state: typedState,
        position: typedPosition,
        borrowRate,
        oraclePrice,
        computed,
      };
    },
    enabled: enabled && !!userAddress,
    staleTime: STALE_TIME,
    refetchInterval,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook to invalidate and refetch market data.
 */
export function useInvalidateMorphoData() {
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
 * Compute market values from raw data.
 */
function computeMarketValues(
  params: MorphoMarketParamsRaw | null,
  state: MorphoMarketStateRaw | null,
  position: MorphoUserPositionRaw | null,
) {
  // Market values
  const borrowedFunds =
    state && state.length >= 3 ? Number(state[2]) / 1e6 : 0;

  const marketLiquidity =
    state && state.length >= 3 ? Number(state[0] - state[2]) / 1e6 : 0;

  const totalMarketSize = borrowedFunds + marketLiquidity;
  const totalLiquidity = marketLiquidity;

  const utilization =
    state && Number(state[0]) > 0
      ? `${((Number(state[2]) / Number(state[0])) * 100).toFixed(2)}%`
      : "0.00%";

  const lltv =
    params && params.length >= 5 ? (Number(params[4]) / 1e18) * 100 : 0;

  // User position values
  const userCollateral =
    position && position.length >= 3 ? Number(position[2]) / 1e6 : 0;

  const userBorrow =
    position &&
    position.length >= 2 &&
    state &&
    state.length >= 4 &&
    Number(state[3]) > 0
      ? (Number(position[1]) * Number(state[2])) / Number(state[3]) / 1e6
      : 0;

  return {
    totalMarketSize,
    totalLiquidity,
    borrowedFunds,
    utilization,
    lltv,
    userCollateral,
    userBorrow,
  };
}
