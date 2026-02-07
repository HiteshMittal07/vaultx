"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { LOGOS } from "@/constants/config";
import { PythPrices } from "@/types";

interface BorrowInputsProps {
  supplyAmount: string;
  borrowAmount: string;
  balances: { loan: string; collateral: string };
  pythPrices: PythPrices;
  totalLiquidity: number;
  onSupplyChange: (value: string) => void;
  onBorrowChange: (value: string) => void;
  onSupplyMax: () => void;
  onBorrowMax: () => void;
}

export function BorrowInputs({
  supplyAmount,
  borrowAmount,
  balances,
  pythPrices,
  totalLiquidity,
  onSupplyChange,
  onBorrowChange,
  onSupplyMax,
  onBorrowMax,
}: BorrowInputsProps) {
  return (
    <div className="space-y-4">
      {/* Supply Input */}
      <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
        <div className="flex justify-between text-xs items-center">
          <span className="text-zinc-400 font-medium">Supply Collateral XAUt0</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.XAUt0} alt="XAUt0" width={16} height={16} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={supplyAmount}
            onChange={(e) => onSupplyChange(e.target.value)}
            className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
            placeholder="0.00"
          />
          <button
            onClick={onSupplyMax}
            className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-500">
            ${(Number(supplyAmount || 0) * pythPrices.XAUt0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={cn(
              "font-mono",
              Number(supplyAmount) > Number(balances.collateral)
                ? "text-red-400"
                : "text-zinc-600"
            )}
          >
            Balance: {Number(balances.collateral).toFixed(4)} XAUt0
          </span>
        </div>
      </div>

      {/* Borrow Input */}
      <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
        <div className="flex justify-between text-xs items-center">
          <span className="text-zinc-400 font-medium">Borrow USDT0</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.USDT0} alt="USDT0" width={16} height={16} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => onBorrowChange(e.target.value)}
            className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
            placeholder="0.00"
          />
          <button
            onClick={onBorrowMax}
            className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-500">
            ${(Number(borrowAmount || 0) * pythPrices.USDT0).toLocaleString()}
          </span>
          <span
            className={cn(
              "font-mono",
              Number(borrowAmount) > totalLiquidity ? "text-red-400" : "text-zinc-600"
            )}
          >
            Available: {totalLiquidity.toFixed(2)} USDT0
          </span>
        </div>
      </div>
    </div>
  );
}
