"use client";

import { useMemo } from "react";
import { BorrowMetrics, ActionType } from "@/types";

interface CalculationInputs {
  // User position
  userCollateral: number;
  userBorrow: number;
  // Form values
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  withdrawAmount: string;
  // Market params
  lltv: number;
  oraclePrice: number;
  // Mode
  actionType: ActionType;
}

interface CalculationResults extends BorrowMetrics {
  isAtRisk: boolean;
  isDanger: boolean;
}

/**
 * Custom hook for LTV and position calculations.
 * Extracts calculation logic from BorrowDashboard.
 */
export function useBorrowCalculations(
  inputs: CalculationInputs
): CalculationResults {
  const {
    userCollateral,
    userBorrow,
    supplyAmount,
    borrowAmount,
    repayAmount,
    withdrawAmount,
    lltv,
    oraclePrice,
    actionType,
  } = inputs;

  return useMemo(() => {
    // Calculate current LTV
    const currentLTV =
      userCollateral > 0 && oraclePrice > 0
        ? (userBorrow / (userCollateral * oraclePrice)) * 100
        : 0;

    // Calculate projected values based on action type
    const projectedBorrow =
      actionType === "borrow"
        ? userBorrow + Number(borrowAmount || 0)
        : Math.max(0, userBorrow - Number(repayAmount || 0));

    const projectedCollateral =
      userCollateral +
      Number(supplyAmount || 0) -
      Number(withdrawAmount || 0);

    // Calculate projected LTV
    const projectedLTV =
      projectedCollateral > 0 && oraclePrice > 0
        ? (projectedBorrow / (projectedCollateral * oraclePrice)) * 100
        : 0;

    // Calculate max withdrawable (maintaining LTV below LLTV)
    const maxWithdrawable =
      userBorrow > 0 && oraclePrice > 0 && lltv > 0
        ? Math.max(
            0,
            userCollateral - userBorrow / (oraclePrice * (lltv / 100))
          )
        : userCollateral;

    // Calculate liquidation price
    const liquidationPrice =
      userCollateral > 0 && lltv > 0
        ? userBorrow / (userCollateral * (lltv / 100))
        : 0;

    // Calculate percent drop to liquidation
    const percentDropToLiquidation =
      oraclePrice > 0 && liquidationPrice > 0
        ? ((oraclePrice - liquidationPrice) / oraclePrice) * 100
        : 0;

    // Risk indicators
    const isAtRisk = projectedLTV >= lltv * 0.9;
    const isDanger = projectedLTV >= lltv * 0.95;

    return {
      currentLTV,
      projectedLTV,
      lltv,
      userCollateral,
      userBorrow,
      projectedCollateral,
      projectedBorrow,
      maxWithdrawable,
      liquidationPrice,
      percentDropToLiquidation,
      isAtRisk,
      isDanger,
    };
  }, [
    userCollateral,
    userBorrow,
    supplyAmount,
    borrowAmount,
    repayAmount,
    withdrawAmount,
    lltv,
    oraclePrice,
    actionType,
  ]);
}
