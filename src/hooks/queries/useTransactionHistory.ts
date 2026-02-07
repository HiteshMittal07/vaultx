"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { TransactionHistoryItem, TransactionType, ExecutedBy } from "@/types";
import { USDT0, XAUT0 } from "@/constants/addresses";

/** Map known token addresses to symbols for display. */
function resolveTokenSymbol(address?: string): string | undefined {
  if (!address) return undefined;
  const lower = address.toLowerCase();
  if (lower === USDT0.toLowerCase()) return "USDT0";
  if (lower === XAUT0.toLowerCase()) return "XAUt0";
  return address;
}

/** Convert ISO timestamp to IST date/time string. */
function toIST(isoString: string): string {
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
  });
}

interface RawHistoryEntry {
  id: string;
  action: string;
  txHash: string;
  timestamp: string;
  executedBy: string;
  status: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  supply?: string;
  borrow?: string;
  repay?: string;
  withdraw?: string;
}

interface SaveTransactionParams {
  walletAddress: string;
  action: TransactionType;
  txHash: string;
  executedBy: ExecutedBy;
  status?: string;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  supply?: string;
  borrow?: string;
  repay?: string;
  withdraw?: string;
}

/**
 * React Query hook for fetching and saving transaction history from /api/history.
 */
export function useTransactionHistory(address?: string) {
  const { getAccessToken } = usePrivy();
  const queryClient = useQueryClient();

  const query = useQuery<TransactionHistoryItem[]>({
    queryKey: ["transactionHistory", address],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const res = await fetch(`/api/history?walletAddress=${address}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch history");
      const data: RawHistoryEntry[] = await res.json();

      return data.map((entry) => ({
        id: entry.txHash,
        type: entry.action as TransactionType,
        timestamp: toIST(entry.timestamp),
        status: entry.status as TransactionHistoryItem["status"],
        executedBy: entry.executedBy as ExecutedBy,
        tokenIn: resolveTokenSymbol(entry.tokenIn),
        tokenOut: resolveTokenSymbol(entry.tokenOut),
        amountIn: entry.amountIn,
        amountOut: entry.amountOut,
        supply: entry.supply,
        borrow: entry.borrow,
        repay: entry.repay,
        withdraw: entry.withdraw,
      }));
    },
    enabled: !!address,
    staleTime: 10_000,
  });

  const mutation = useMutation({
    mutationFn: async (params: SaveTransactionParams) => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token");

      const res = await fetch("/api/history", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });
      if (!res.ok) throw new Error("Failed to save history");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["transactionHistory", address],
      });
    },
  });

  return {
    history: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    saveTransaction: mutation.mutate,
  };
}
