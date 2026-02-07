"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SwapSettingsProps {
  isOpen: boolean;
  slippage: string;
  deadlineMinutes: string;
  onSlippageChange: (value: string) => void;
  onDeadlineChange: (value: string) => void;
}

const PRESET_SLIPPAGES = ["0.5", "1.0", "5.0"];

export function SwapSettings({
  isOpen,
  slippage,
  deadlineMinutes,
  onSlippageChange,
  onDeadlineChange,
}: SwapSettingsProps) {
  const handleSlippageInput = (value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) {
      onSlippageChange("");
    } else {
      onSlippageChange(Math.min(50, Math.max(0, val)).toString());
    }
  };

  const handleDeadlineInput = (value: string) => {
    const val = parseInt(value);
    if (isNaN(val)) {
      onDeadlineChange("");
    } else {
      onDeadlineChange(Math.min(4320, Math.max(1, val)).toString());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 top-full z-[60] mt-2 w-72 origin-top-right overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
        >
          <div className="p-5 space-y-4">
            {/* Slippage Input */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Max Slippage
              </span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={slippage}
                  min="0.1"
                  max="50"
                  step="0.1"
                  onChange={(e) => handleSlippageInput(e.target.value)}
                  className="w-16 bg-white/5 rounded-lg px-2 py-1 text-right text-xs font-mono text-emerald-400 outline-none border border-white/5 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="ml-1 text-[10px] text-zinc-500">%</span>
              </div>
            </div>

            {/* High Slippage Warning */}
            {Number(slippage) > 5 && (
              <p className="text-[9px] font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md text-center">
                High slippage may result in unfavorable rates
              </p>
            )}

            {/* Deadline Input */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Transaction Deadline
              </span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={deadlineMinutes}
                  min="1"
                  max="4320"
                  onChange={(e) => handleDeadlineInput(e.target.value)}
                  className="w-16 bg-white/5 rounded-lg px-2 py-1 text-right text-xs font-mono text-emerald-400 outline-none border border-white/5 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="ml-1 text-[10px] text-zinc-500">m</span>
              </div>
            </div>

            {/* Preset Slippage Buttons */}
            <div className="flex gap-2">
              {PRESET_SLIPPAGES.map((s) => (
                <button
                  key={s}
                  onClick={() => onSlippageChange(s)}
                  className={`flex-1 rounded-lg py-1 text-[10px] font-black transition-all ${
                    slippage === s
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-white/5 text-zinc-500 border border-transparent hover:border-white/10"
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
