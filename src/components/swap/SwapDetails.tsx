"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Fuel, Info, ChevronDown, ChevronUp } from "lucide-react";
import { TokenInfo, PythPrices } from "@/types";

interface SwapDetailsProps {
  isOpen: boolean;
  sellAmount: string;
  buyAmount: string;
  slippage: string;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  pythPrices: PythPrices;
  onToggle: () => void;
}

export function SwapDetails({
  isOpen,
  sellAmount,
  buyAmount,
  slippage,
  tokenIn,
  tokenOut,
  pythPrices,
  onToggle,
}: SwapDetailsProps) {
  const hasQuote = sellAmount && buyAmount;
  const exchangeRate =
    hasQuote && Number(sellAmount) > 0
      ? (Number(buyAmount) / Number(sellAmount)).toFixed(6)
      : "0.00";

  return (
    <div className="relative mt-2 px-1">
      <button
        onClick={onToggle}
        disabled={!hasQuote}
        className="group flex w-full items-center justify-between py-2 text-[11px] transition-colors hover:text-white disabled:opacity-0"
      >
        <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors font-medium">
          <span>
            1 {tokenIn.symbol} = {exchangeRate} {tokenOut.symbol}
          </span>
          <span className="text-zinc-600">
            ($
            {pythPrices[tokenIn.symbol].toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            )
          </span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors">
          <Fuel className="h-3.5 w-3.5" />
          <span className="font-mono text-[10px]">$0.05</span>
          {isOpen ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-x-0 top-full z-[60] mt-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
          >
            <div className="space-y-2.5 p-5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span>Fee</span>
                  <Info className="h-2.5 w-2.5" />
                </div>
                <span className="font-bold text-pink-500">Free</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span>Order routing</span>
                  <Info className="h-2.5 w-2.5" />
                </div>
                <span className="text-zinc-300 font-medium">Uniswap API</span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-500">
                  <span>Max slippage</span>
                  <Info className="h-2.5 w-2.5" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                    {Number(slippage) <= 5 ? "Auto" : "Custom"}
                  </span>
                  <span className="text-zinc-300 font-medium">{slippage}%</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
