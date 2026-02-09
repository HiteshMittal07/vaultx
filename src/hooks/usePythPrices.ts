"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PythPrices } from "@/types";
import { getLatestPythPrice } from "@/lib/blockchain/utils";
import { APP_CONFIG } from "@/constants/config";

const DEFAULT_PRICES: PythPrices = {
  XAUt: 0,
  USDT: 1,
};

const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds

interface UsePythPricesOptions {
  refreshInterval?: number;
  enabled?: boolean;
}

/**
 * Custom hook for fetching and caching Pyth price feeds.
 * Extracts the duplicated Pyth price fetching pattern from SwapCard, BorrowDashboard, and Dashboard.
 */
export function usePythPrices(options: UsePythPricesOptions = {}) {
  const { refreshInterval = DEFAULT_REFRESH_INTERVAL, enabled = true } =
    options;

  const [prices, setPrices] = useState<PythPrices>(DEFAULT_PRICES);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use ref to track if component is mounted
  const isMounted = useRef(true);

  const fetchPrices = useCallback(async () => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      const [pXAUT, pUSDT] = await Promise.all([
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt),
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT),
      ]);

      if (!isMounted.current) return;

      if (pXAUT > 0 && pUSDT > 0) {
        setPrices({ XAUt: pXAUT, USDT: pUSDT });
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (!isMounted.current) return;
      console.error("Failed to fetch Pyth prices:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch prices"));
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [enabled]);

  // Initial fetch and interval setup
  useEffect(() => {
    isMounted.current = true;

    if (enabled) {
      fetchPrices();
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => {
        isMounted.current = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted.current = false;
    };
  }, [fetchPrices, refreshInterval, enabled]);

  /**
   * Get the USD value of a token amount.
   */
  const getUsdValue = useCallback(
    (amount: number, token: keyof PythPrices): number => {
      return amount * prices[token];
    },
    [prices],
  );

  /**
   * Format a USD value for display.
   */
  const formatUsdValue = useCallback(
    (
      amount: number,
      token: keyof PythPrices,
      options?: Intl.NumberFormatOptions,
    ): string => {
      const usdValue = getUsdValue(amount, token);
      return usdValue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        ...options,
      });
    },
    [getUsdValue],
  );

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    refetch: fetchPrices,
    getUsdValue,
    formatUsdValue,
  };
}
