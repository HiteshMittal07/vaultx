"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { LOGOS } from "@/constants/config";

interface PositionSummaryProps {
  projectedCollateral: number;
  projectedBorrow: number;
  currentLTV: number;
  projectedLTV: number;
  lltv: number;
  borrowRate: string;
  isDanger: boolean;
  isAtRisk: boolean;
  hasFormInput: boolean;
}

export function PositionSummary({
  projectedCollateral,
  projectedBorrow,
  currentLTV,
  projectedLTV,
  lltv,
  borrowRate,
  isDanger,
  isAtRisk,
  hasFormInput,
}: PositionSummaryProps) {
  const showProjectedLTV =
    hasFormInput && Math.abs(projectedLTV - currentLTV) > 0.001;

  return (
    <div className="rounded-2xl bg-zinc-900/20 border border-white/5 p-4 space-y-3">
      {/* Collateral Row */}
      <div className="flex justify-between text-sm items-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.XAUt0} alt="XAUt0" width={12} height={12} />
          </div>
          <span className="text-xs">Collateral (XAUt0)</span>
        </div>
        <span className="text-white text-xs font-medium">
          {projectedCollateral < 0.0001 ? "< 0.0001" : projectedCollateral.toFixed(4)}{" "}
          XAUt0
        </span>
      </div>

      {/* Loan Row */}
      <div className="flex justify-between text-sm items-center">
        <div className="flex items-center gap-2 text-zinc-400">
          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.USDT0} alt="USDT" width={12} height={12} />
          </div>
          <span className="text-xs">Loan (USDT0)</span>
        </div>
        <span className="text-white text-xs font-medium">
          {projectedBorrow.toFixed(2)} USDT0
        </span>
      </div>

      <div className="h-px bg-white/5 my-1" />

      {/* LTV Row */}
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">LTV</span>
        <span
          className={cn(
            "font-medium",
            isDanger ? "text-red-400" : isAtRisk ? "text-amber-400" : "text-white"
          )}
        >
          {currentLTV.toFixed(2)}%
          {showProjectedLTV && (
            <>
              <span className="mx-1.5 text-zinc-600">→</span>
              <span
                className={cn(
                  projectedLTV >= lltv * 0.95
                    ? "text-red-400"
                    : projectedLTV >= lltv * 0.9
                      ? "text-amber-400"
                      : projectedLTV < currentLTV
                        ? "text-emerald-400"
                        : "text-white"
                )}
              >
                {projectedLTV > 100 ? ">100" : projectedLTV.toFixed(2)}%
              </span>
            </>
          )}
        </span>
      </div>

      {/* Liquidation LTV Row */}
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">Liquidation LTV</span>
        <span className="text-white font-medium">{lltv.toFixed(0)}%</span>
      </div>

      {/* APR Row */}
      <div className="flex justify-between text-xs">
        <span className="text-zinc-500">APR</span>
        <span className="text-emerald-400 font-medium">{borrowRate}%</span>
      </div>
    </div>
  );
}
