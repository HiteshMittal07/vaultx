"use client";

import Image from "next/image";
import { LOGOS } from "@/constants/config";
import { PythPrices } from "@/types";

interface RepayInputsProps {
  repayAmount: string;
  withdrawAmount: string;
  userBorrow: number;
  userCollateral: number;
  pythPrices: PythPrices;
  onRepayChange: (value: string) => void;
  onWithdrawChange: (value: string) => void;
  onRepayMax: () => void;
  onWithdrawMax: () => void;
}

export function RepayInputs({
  repayAmount,
  withdrawAmount,
  userBorrow,
  userCollateral,
  pythPrices,
  onRepayChange,
  onWithdrawChange,
  onRepayMax,
  onWithdrawMax,
}: RepayInputsProps) {
  return (
    <div className="space-y-4">
      {/* Repay Input */}
      <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
        <div className="flex justify-between text-xs items-center">
          <span className="text-zinc-400 font-medium">Repay Loan USDT</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.USDT} alt="USDT" width={16} height={16} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={repayAmount}
            onChange={(e) => onRepayChange(e.target.value)}
            className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
            placeholder="0.00"
          />
          <button
            onClick={onRepayMax}
            className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-500">
            ${(Number(repayAmount || 0) * pythPrices.USDT).toLocaleString()}
          </span>
          <span className="text-zinc-600 font-mono">
            Loan: {userBorrow.toFixed(2)} USDT
          </span>
        </div>
      </div>

      {/* Withdraw Input */}
      <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
        <div className="flex justify-between text-xs items-center">
          <span className="text-zinc-400 font-medium">Withdraw Collateral XAUt</span>
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
            <Image src={LOGOS.XAUt} alt="XAUt" width={16} height={16} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => onWithdrawChange(e.target.value)}
            className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
            placeholder="0.00"
          />
          <button
            onClick={onWithdrawMax}
            className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between items-center text-[10px]">
          <span className="text-zinc-500">
            ${(Number(withdrawAmount || 0) * pythPrices.XAUt).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-zinc-600 font-mono">
            {userCollateral < 0.0001 ? "< 0.0001" : userCollateral.toFixed(4)} XAUt
          </span>
        </div>
      </div>
    </div>
  );
}
