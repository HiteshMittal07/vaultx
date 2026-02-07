"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { TokenInfo } from "@/types";

interface UseSwapQuoteOptions {
  debounceMs?: number;
}

interface SwapQuoteResult {
  buyAmount: string;
  isQuoting: boolean;
  error: string | null;
  fetchQuote: (amount: string) => void;
}

/**
 * Custom hook for fetching Uniswap V3 swap quotes.
 * Extracts quote fetching logic from SwapCard with debouncing.
 */
export function useSwapQuote(
  tokenIn: TokenInfo,
  tokenOut: TokenInfo,
  options: UseSwapQuoteOptions = {}
): SwapQuoteResult {
  const { debounceMs = 450 } = options;

  const [buyAmount, setBuyAmount] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchQuote = useCallback(
    async (amount: string) => {
      // Clear any pending debounced calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const inputVal = Number(amount);
      if (!amount || isNaN(inputVal) || inputVal <= 0) {
        setBuyAmount("");
        setError(null);
        return;
      }

      setIsQuoting(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          tokenIn: tokenIn.address,
          tokenOut: tokenOut.address,
          amountIn: amount,
          decimalsIn: String(tokenIn.decimals),
          decimalsOut: String(tokenOut.decimals),
        });

        const res = await fetch(`/api/swap/quote?${params}`);
        if (!res.ok) throw new Error("Quote failed");

        const data = await res.json();
        setBuyAmount(Number(data.amountOut).toFixed(tokenOut.decimals));
      } catch (err) {
        console.error("[Swap] Quote failed:", err);
        setError("No liquidity or route found");
        setBuyAmount("");
      } finally {
        setIsQuoting(false);
      }
    },
    [tokenIn, tokenOut]
  );

  /**
   * Debounced quote fetch - use this for input changes.
   */
  const fetchQuoteDebounced = useCallback(
    (amount: string) => {
      // Clear any pending debounced calls
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        fetchQuote(amount);
      }, debounceMs);
    },
    [fetchQuote, debounceMs]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    buyAmount,
    isQuoting,
    error,
    fetchQuote: fetchQuoteDebounced,
  };
}
