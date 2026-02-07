"use client";

import { Settings, RefreshCw } from "lucide-react";

interface SwapHeaderProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

export function SwapHeader({ showSettings, onToggleSettings }: SwapHeaderProps) {
  return (
    <div className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <RefreshCw className="h-3.5 w-3.5" />
        </span>
        <h2 className="text-lg font-bold text-white tracking-tight">Swap</h2>
      </div>
      <button
        onClick={onToggleSettings}
        className={`rounded-xl p-2 transition-colors ${
          showSettings
            ? "bg-emerald-500/20 text-emerald-400"
            : "text-zinc-500 hover:bg-white/5 hover:text-white"
        }`}
      >
        <Settings className="h-5 w-5" />
      </button>
    </div>
  );
}
