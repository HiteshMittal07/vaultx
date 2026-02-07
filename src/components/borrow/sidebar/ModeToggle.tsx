"use client";

import { cn } from "@/lib/utils";
import { SidebarMode } from "@/types";

interface ModeToggleProps {
  mode: SidebarMode;
  hasPosition: boolean;
  onModeChange: (mode: SidebarMode) => void;
}

export function ModeToggle({ mode, hasPosition, onModeChange }: ModeToggleProps) {
  return (
    <div className="flex bg-zinc-950/50 p-1 rounded-2xl border border-white/5">
      <button
        onClick={() => onModeChange("borrow")}
        className={cn(
          "flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all",
          mode === "borrow"
            ? "bg-zinc-800 text-white shadow-xl"
            : "text-zinc-500 hover:text-zinc-300"
        )}
      >
        Borrow
      </button>
      {hasPosition && (
        <button
          onClick={() => onModeChange("repay")}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all",
            mode === "repay"
              ? "bg-zinc-800 text-white shadow-xl"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Repay
        </button>
      )}
    </div>
  );
}
