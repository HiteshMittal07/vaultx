"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarMode } from "@/types";

interface ActionButtonProps {
  sidebarMode: SidebarMode;
  // Form values
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  withdrawAmount: string;
  // Balances
  balances: { loan: string; collateral: string };
  totalLiquidity: number;
  userBorrow: number;
  userCollateral: number;
  // Metrics
  projectedLTV: number;
  projectedBorrow: number;
  projectedCollateral: number;
  lltv: number;
  // State
  isExecuting: boolean;
  executingAction: string | null;
  // Actions
  onClick: () => void;
}

export function ActionButton({
  sidebarMode,
  supplyAmount,
  borrowAmount,
  repayAmount,
  withdrawAmount,
  balances,
  totalLiquidity,
  userBorrow,
  userCollateral,
  projectedLTV,
  projectedBorrow,
  projectedCollateral,
  lltv,
  isExecuting,
  executingAction,
  onClick,
}: ActionButtonProps) {
  // Validation checks
  const isSupplyInsufficient = Number(supplyAmount) > Number(balances.collateral);
  const isBorrowInsufficient = Number(borrowAmount) > totalLiquidity;
  const isRepayInsufficient = Number(repayAmount) > Number(balances.loan);
  const isRepayExcessive = Number(repayAmount) > userBorrow + 0.0001;
  const isWithdrawExcessive = Number(withdrawAmount) > userCollateral;
  const isLTVExceeded = projectedLTV > lltv + 0.01 && projectedBorrow > userBorrow;
  const isNoCollateral = projectedBorrow > userBorrow && projectedCollateral <= 0;

  const isBorrowModeEmpty =
    sidebarMode === "borrow" &&
    Number(supplyAmount || 0) <= 0 &&
    Number(borrowAmount || 0) <= 0;

  const isRepayModeEmpty =
    sidebarMode === "repay" &&
    Number(repayAmount || 0) <= 0 &&
    Number(withdrawAmount || 0) <= 0;

  const isDisabled =
    isExecuting ||
    isBorrowModeEmpty ||
    isRepayModeEmpty ||
    isSupplyInsufficient ||
    isBorrowInsufficient ||
    isRepayInsufficient ||
    isRepayExcessive ||
    isWithdrawExcessive ||
    isLTVExceeded ||
    isNoCollateral;

  const getButtonText = () => {
    if (executingAction === "main") {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Executing...
        </>
      );
    }

    if (sidebarMode === "borrow") {
      if (isSupplyInsufficient) return "Insufficient Balance";
      if (isBorrowInsufficient) return "Insufficient Liquidity";
      if (isNoCollateral || (projectedLTV >= lltv && projectedBorrow > userBorrow))
        return "Insufficient Collateral";
      if (isBorrowModeEmpty) return "Enter an amount";
      if (Number(supplyAmount || 0) > 0 && Number(borrowAmount || 0) > 0)
        return "Supply & Borrow";
      if (Number(supplyAmount || 0) > 0) return "Supply Collateral";
      return "Borrow USDT";
    }

    // Repay mode
    if (isRepayInsufficient) return "Insufficient USDT";
    if (isRepayExcessive) return "Inconsistent Amount";
    if (isWithdrawExcessive) return "Insufficient Collateral";
    if (projectedLTV >= lltv && userBorrow > 0) return "LTV Limit (Repay or Add more)";
    if (isRepayModeEmpty) return "Enter an amount";
    if (Number(repayAmount || 0) > 0 && Number(withdrawAmount || 0) > 0)
      return "Repay & Withdraw";
    if (Number(repayAmount || 0) > 0) return "Repay Loan";
    return "Withdraw Collateral";
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "w-full rounded-2xl py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/10",
        isDisabled
          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          : "bg-white text-black hover:bg-zinc-100"
      )}
    >
      {getButtonText()}
    </motion.button>
  );
}
