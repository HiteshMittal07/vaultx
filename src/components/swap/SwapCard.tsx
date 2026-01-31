"use client";

import { useState } from "react";
import { Settings, ArrowDown, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

export function SwapCard() {
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  return (
    <div className="w-full max-w-[480px] rounded-3xl border border-white/10 bg-black/40 p-4 backdrop-blur-xl md:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-4">
          <button className="rounded-full bg-zinc-800/50 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800">
            Swap
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Limit
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Buy
          </button>
          <button className="px-4 py-1.5 text-sm font-medium text-zinc-400 transition-colors hover:text-white">
            Sell
          </button>
        </div>
        <button className="text-zinc-400 hover:text-white">
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Sell Input */}
      <div className="relative mb-2 rounded-2xl bg-zinc-900/50 p-4 transition-colors hover:bg-zinc-900/70">
        <div className="mb-2 text-sm text-zinc-400">Sell</div>
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="0"
            value={sellAmount}
            onChange={(e) => setSellAmount(e.target.value)}
            className="w-full bg-transparent text-4xl font-medium text-white placeholder-zinc-600 outline-none"
          />
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-black font-bold">T</div>
            <span className="font-medium text-white">USDT0</span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
        <div className="mt-2 text-sm text-zinc-500">$0</div>
      </div>

      {/* Arrow Divider */}
      <div className="relative -my-4 z-10 flex justify-center">
        <div className="rounded-xl border border-[#050505] bg-zinc-900 p-1.5 text-zinc-400">
          <ArrowDown className="h-4 w-4" />
        </div>
      </div>

      {/* Buy Input */}
      <div className="rounded-2xl bg-zinc-900/50 p-4 pt-6 transition-colors hover:bg-zinc-900/70">
        <div className="mb-2 text-sm text-zinc-400">Buy</div>
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="0"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="w-full bg-transparent text-4xl font-medium text-white placeholder-zinc-600 outline-none"
          />
          <div className="flex shrink-0 items-center gap-2 rounded-full bg-zinc-800 px-3 py-1.5 hover:bg-zinc-700">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-[10px] text-black font-bold">G</div>
            <span className="font-medium text-white">XAUT0</span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </div>
        </div>
         <div className="mt-2 text-sm text-zinc-500">$0</div>
      </div>

      {/* Action Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-6 w-full rounded-2xl bg-zinc-800 py-4 text-lg font-bold text-zinc-400 hover:bg-zinc-700 hover:text-white"
      >
        Enter an amount
      </motion.button>
    </div>
  );
}
