"use client";

import { motion } from "framer-motion";
import { Loader2, ArrowLeftRight, AlertTriangle } from "lucide-react";
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

  const variant = isInsufficientBalance
    ? "danger"
    : error
    ? "muted"
    : Number(sellAmount) > 0
    ? "active"
    : "idle";

  const content = (() => {
    if (isExecuting) {
      return (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Executing swap…
        </span>
      );
    }
    if (isInsufficientBalance) {
      return (
        <span className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Insufficient {tokenIn.symbol}
        </span>
      );
    }
    if (error) {
      return "No route found";
    }
    if (Number(sellAmount) > 0) {
      return (
        <span className="flex items-center justify-center gap-2">
          <ArrowLeftRight className="h-4 w-4" />
          Swap
        </span>
      );
    }
    return "Enter an amount";
  })();

  const styles = {
    active: "bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.3)] hover:shadow-[0_0_60px_rgba(52,211,153,0.5)]",
    idle: "bg-white/[0.04] text-zinc-500 cursor-default border border-white/[0.06]",
    danger: "bg-red-500/10 text-red-400 border border-red-500/20 cursor-default",
    muted: "bg-white/[0.04] text-zinc-500 cursor-default border border-white/[0.06]",
  };

  return (
    <motion.button
      whileHover={!isDisabled ? { scale: 1.01 } : {}}
      whileTap={!isDisabled ? { scale: 0.99 } : {}}
      onClick={!isDisabled ? onClick : undefined}
      disabled={isDisabled}
      className={`w-full rounded-2xl py-4 text-base font-bold transition-all duration-300 ${styles[variant]}`}
    >
      {content}
    </motion.button>
  );
}
