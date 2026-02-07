"use client";

import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LOGOS } from "@/constants/config";
import { TokenInfo, PythPrices } from "@/types";

interface SwapTokenInputProps {
  label: "Sell" | "Buy";
  token: TokenInfo;
  amount: string;
  balance: string;
  isInsufficientBalance?: boolean;
  isQuoting?: boolean;
  pythPrices: PythPrices;
  error?: string | null;
  readOnly?: boolean;
  onAmountChange?: (amount: string) => void;
  onMaxClick?: () => void;
}

export function SwapTokenInput({
  label,
  token,
  amount,
  balance,
  isInsufficientBalance = false,
  isQuoting = false,
  pythPrices,
  error,
  readOnly = false,
  onAmountChange,
  onMaxClick,
}: SwapTokenInputProps) {
  const isSellInput = label === "Sell";

  return (
    <div
      className={`rounded-3xl bg-white/[0.03] p-5 border transition-colors ${
        isInsufficientBalance
          ? "border-red-500/50"
          : "border-white/5 hover:border-white/10"
      }`}
    >
      <div className="mb-3 flex justify-between text-sm font-medium">
        <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`font-mono text-[11px] transition-colors ${
              isInsufficientBalance ? "text-red-400" : "text-zinc-600"
            }`}
          >
            Balance: {balance} {token.symbol}
          </span>
          {isSellInput && onMaxClick && (
            <button
              onClick={onMaxClick}
              className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded"
            >
              Max
            </button>
          )}
          {!isSellInput && isQuoting && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <RefreshCw className="h-3 w-3 animate-spin text-emerald-400/60" />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        {readOnly ? (
          <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-3xl md:text-4xl font-semibold text-white/90">
            {amount || (isQuoting ? "..." : "0")}
          </div>
        ) : (
          <input
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => onAmountChange?.(e.target.value)}
            className={`w-full bg-transparent text-3xl md:text-4xl font-semibold placeholder-zinc-800 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
              isInsufficientBalance ? "text-red-400" : "text-white"
            }`}
          />
        )}
        <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10 transition-all border border-white/5 group/asset cursor-pointer">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xl">
            <Image
              src={LOGOS[token.symbol]}
              alt={token.symbol}
              width={24}
              height={24}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-bold text-white tracking-tight">
            {token.symbol}
          </span>
        </div>
      </div>

      {!isSellInput && (
        <div className="mt-3 flex justify-between items-center h-4">
          <span className="text-[11px] text-zinc-600 font-medium">
            ~${(Number(amount || 0) * pythPrices[token.symbol]).toFixed(2)}
          </span>
          {error && (
            <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
