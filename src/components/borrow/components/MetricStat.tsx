import { useState } from "react";
import { Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MetricStatProps } from "@/types";

export function MetricStat({ label, value, subValue, info, isLoading }: MetricStatProps) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative group/metric">
      <div className="flex items-center gap-1 text-zinc-500 text-sm mb-1">
        <span>{label}</span>
        <div
          className="relative"
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
        >
          <Info className="h-3 w-3 cursor-help hover:text-white transition-colors" />
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute left-0 bottom-full mb-2 w-48 z-50 p-3 rounded-xl bg-zinc-950 border border-white/10 shadow-2xl text-[11px] font-normal leading-relaxed text-zinc-400 pointer-events-none"
              >
                {info}
                <div className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="text-3xl font-medium text-white">
        {isLoading ? "..." : value}
      </div>
      {subValue && (
        <div className="text-sm text-zinc-500">
          {isLoading ? "..." : subValue}
        </div>
      )}
    </div>
  );
}
