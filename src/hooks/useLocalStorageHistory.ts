"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { TokenInfo, TransactionHistoryItem, TransactionType } from "@/types";

const STORAGE_KEY_PREFIX = "vaultx_history_";

function loadHistory(address: string | undefined): TransactionHistoryItem[] {
  if (!address || typeof window === "undefined") return [];
  const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      return JSON.parse(saved) as TransactionHistoryItem[];
    } catch {
      return [];
    }
  }
  return [];
}

export function useLocalStorageHistory(address: string | undefined) {
  const initialHistory = useMemo(() => loadHistory(address), [address]);
  const [history, setHistory] =
    useState<TransactionHistoryItem[]>(initialHistory);

  // When address changes, reset to the loaded history
  const [prevAddress, setPrevAddress] = useState(address);
  if (prevAddress !== address) {
    setPrevAddress(address);
    setHistory(loadHistory(address));
  }

  // Save history to localStorage when it changes
  useEffect(() => {
    if (!address) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
    if (history.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(history));
    }
  }, [history, address]);

  const addTransaction = useCallback((tx: TransactionHistoryItem) => {
    setHistory((prev) => [tx, ...prev]);
  }, []);

  const clearHistory = useCallback(() => {
    if (!address) return;
    const storageKey = `${STORAGE_KEY_PREFIX}${address}`;
    localStorage.removeItem(storageKey);
    setHistory([]);
  }, [address]);

  const updateTransactionStatus = useCallback(
    (txId: string, status: TransactionHistoryItem["status"]) => {
      setHistory((prev) =>
        prev.map((tx) => (tx.id === txId ? { ...tx, status } : tx)),
      );
    },
    [],
  );

  return {
    history,
    addTransaction,
    clearHistory,
    updateTransactionStatus,
  };
}

export function createSwapHistoryEntry(
  txHash: string,
  tokenIn: TokenInfo,
  tokenOut: TokenInfo,
  amountIn: string,
  amountOut: string,
): TransactionHistoryItem {
  return {
    id: txHash,
    type: "swap",
    tokenIn: tokenIn.symbol,
    tokenOut: tokenOut.symbol,
    amountIn,
    amountOut,
    timestamp: new Date().toLocaleTimeString(),
    status: "success",
  };
}

export function createBorrowHistoryEntry(
  txHash: string,
  actionType: string,
  supplyAmount?: string,
  borrowAmount?: string,
  repayAmount?: string,
  withdrawAmount?: string,
): TransactionHistoryItem {
  return {
    id: txHash,
    type: actionType as TransactionType,
    supply: supplyAmount,
    borrow: borrowAmount,
    repay: repayAmount,
    withdraw: withdrawAmount,
    timestamp: new Date().toLocaleTimeString(),
    status: "success",
  };
}