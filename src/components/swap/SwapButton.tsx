"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { TokenInfo } from "@/types";

interface SwapButtonProps {
  sellAmount: string;
  isInsufficientBalance: boolean;
  isQuoting: boolean;
  isExecuting: boolean;
  error: string | null;
  tokenIn: TokenInfo;
  onClick: () => void;
}

export function SwapButton({
  sellAmount,
  isInsufficientBalance,
  isQuoting,
  isExecuting,
  error,
  tokenIn,
  onClick,
}: SwapButtonProps) {
  const isDisabled =
    !sellAmount ||
    Number(sellAmount) <= 0 ||
    !!error ||
    isQuoting ||
    isExecuting ||
    isInsufficientBalance;

  const getButtonText = () => {
    if (isExecuting) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Executing...</span>
        </div>
      );
    }
    if (isInsufficientBalance) {
      return `Insufficient ${tokenIn.symbol} balance`;
    }
    if (error) {
      return "No Route";
    }
    if (Number(sellAmount) > 0) {
      return "Swap";
    }
    return "Enter amount";
  };

  return (
    <motion.button
      whileHover={{
        scale: 1.01,
        backgroundColor: isInsufficientBalance ? "#ef4444" : "#10b981",
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isDisabled}
      className={`mt-8 w-full relative overflow-hidden rounded-2xl py-4 text-lg font-black transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
        isInsufficientBalance
          ? "bg-red-500 text-white shadow-[0_20px_40px_-15px_rgba(239,68,68,0.3)]"
          : "bg-emerald-500 text-black shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]"
      }`}
    >
      {getButtonText()}
    </motion.button>
  );
}
