"use client";

import { useCallback } from "react";
import { SidebarMode, ActionType, PythPrices, BorrowActionOverrides } from "@/types";
import { ModeToggle } from "./ModeToggle";
import { BorrowInputs } from "./BorrowInputs";
import { RepayInputs } from "./RepayInputs";
import { PositionSummary } from "./PositionSummary";
import { ActionButton } from "./ActionButton";

interface SidebarActionsProps {
  // Mode
  sidebarMode: SidebarMode;
  setSidebarMode: (mode: SidebarMode) => void;
  setActionType: (type: ActionType) => void;
  // Position data
  userCollateral: number;
  userBorrow: number;
  // Form state
  supplyAmount: string;
  setSupplyAmount: (val: string) => void;
  borrowAmount: string;
  setBorrowAmount: (val: string) => void;
  repayAmount: string;
  setRepayAmount: (val: string) => void;
  withdrawAmount: string;
  setWithdrawAmount: (val: string) => void;
  repayMax: boolean;
  setRepayMax: (val: boolean) => void;
  withdrawMax: boolean;
  setWithdrawMax: (val: boolean) => void;
  // Balances & prices
  balances: { loan: string; collateral: string };
  pythPrices: PythPrices;
  // Market data
  totalLiquidity: number;
  maxWithdrawable: number;
  // Calculations
  projectedCollateral: number;
  projectedBorrow: number;
  currentLTV: number;
  projectedLTV: number;
  lltv: number;
  isDanger: boolean;
  isAtRisk: boolean;
  borrowRate: string;
  // Execution state
  executingAction: string | null;
  isExecuting: boolean;
  handleAction: (overrides?: BorrowActionOverrides) => Promise<void>;
}

export function SidebarActions({
  sidebarMode,
  setSidebarMode,
  setActionType,
  userCollateral,
  userBorrow,
  supplyAmount,
  setSupplyAmount,
  borrowAmount,
  setBorrowAmount,
  repayAmount,
  setRepayAmount,
  withdrawAmount,
  setWithdrawAmount,
  repayMax,
  setRepayMax,
  withdrawMax,
  setWithdrawMax,
  balances,
  pythPrices,
  totalLiquidity,
  maxWithdrawable,
  projectedCollateral,
  projectedBorrow,
  currentLTV,
  projectedLTV,
  lltv,
  isDanger,
  isAtRisk,
  borrowRate,
  executingAction,
  isExecuting,
  handleAction,
}: SidebarActionsProps) {
  const hasPosition = userCollateral > 0 || userBorrow > 0;
  const hasFormInput = !!(supplyAmount || borrowAmount || repayAmount || withdrawAmount);

  // Mode change handler
  const handleModeChange = useCallback(
    (mode: SidebarMode) => {
      setSidebarMode(mode);
      setActionType(mode);
    },
    [setSidebarMode, setActionType]
  );

  // Supply amount change with action type
  const handleSupplyChange = useCallback(
    (value: string) => {
      setActionType("borrow");
      setSupplyAmount(value);
    },
    [setActionType, setSupplyAmount]
  );

  // Borrow amount change with action type
  const handleBorrowChange = useCallback(
    (value: string) => {
      setActionType("borrow");
      setBorrowAmount(value);
    },
    [setActionType, setBorrowAmount]
  );

  // Repay amount change
  const handleRepayChange = useCallback(
    (value: string) => {
      setActionType("repay");
      setRepayAmount(value);
      setRepayMax(false);
    },
    [setActionType, setRepayAmount, setRepayMax]
  );

  // Withdraw amount change
  const handleWithdrawChange = useCallback(
    (value: string) => {
      setWithdrawAmount(value);
      setWithdrawMax(false);
    },
    [setWithdrawAmount, setWithdrawMax]
  );

  // Max handlers
  const handleSupplyMax = useCallback(() => {
    setSupplyAmount(balances.collateral);
  }, [setSupplyAmount, balances.collateral]);

  const handleBorrowMax = useCallback(() => {
    setBorrowAmount(totalLiquidity.toString());
  }, [setBorrowAmount, totalLiquidity]);

  const handleRepayMax = useCallback(() => {
    setActionType("repay");
    const canRepayFull = Number(balances.loan) >= userBorrow;
    const amount = Math.min(Number(balances.loan), userBorrow);
    setRepayAmount(amount.toFixed(6).replace(/\.?0+$/, ""));
    setRepayMax(canRepayFull);
  }, [setActionType, balances.loan, userBorrow, setRepayAmount, setRepayMax]);

  const handleWithdrawMax = useCallback(() => {
    const isClosing = repayMax || userBorrow <= 0.01;
    const maxW = isClosing
      ? userCollateral
      : Math.floor(maxWithdrawable * 0.999 * 1e6) / 1e6;
    setWithdrawAmount(maxW.toFixed(6).replace(/\.?0+$/, ""));
    setWithdrawMax(isClosing);
  }, [repayMax, userBorrow, userCollateral, maxWithdrawable, setWithdrawAmount, setWithdrawMax]);

  // Action handler
  const handleActionClick = useCallback(() => {
    if (sidebarMode === "repay") {
      handleAction({
        type: "repay",
        repay: repayAmount,
        withdraw: withdrawAmount,
        actionId: "main",
        repayMax,
        withdrawMax,
      });
    } else {
      handleAction();
    }
  }, [sidebarMode, repayAmount, withdrawAmount, repayMax, withdrawMax, handleAction]);

  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-6">
      {/* Mode Toggle */}
      <ModeToggle
        mode={sidebarMode}
        hasPosition={hasPosition}
        onModeChange={handleModeChange}
      />

      {/* Inputs based on mode */}
      {sidebarMode === "borrow" ? (
        <BorrowInputs
          supplyAmount={supplyAmount}
          borrowAmount={borrowAmount}
          balances={balances}
          pythPrices={pythPrices}
          totalLiquidity={totalLiquidity}
          onSupplyChange={handleSupplyChange}
          onBorrowChange={handleBorrowChange}
          onSupplyMax={handleSupplyMax}
          onBorrowMax={handleBorrowMax}
        />
      ) : (
        <RepayInputs
          repayAmount={repayAmount}
          withdrawAmount={withdrawAmount}
          userBorrow={userBorrow}
          userCollateral={userCollateral}
          pythPrices={pythPrices}
          onRepayChange={handleRepayChange}
          onWithdrawChange={handleWithdrawChange}
          onRepayMax={handleRepayMax}
          onWithdrawMax={handleWithdrawMax}
        />
      )}

      {/* Position Summary */}
      <PositionSummary
        projectedCollateral={projectedCollateral}
        projectedBorrow={projectedBorrow}
        currentLTV={currentLTV}
        projectedLTV={projectedLTV}
        lltv={lltv}
        borrowRate={borrowRate}
        isDanger={isDanger}
        isAtRisk={isAtRisk}
        hasFormInput={hasFormInput}
      />

      {/* Action Button */}
      <ActionButton
        sidebarMode={sidebarMode}
        supplyAmount={supplyAmount}
        borrowAmount={borrowAmount}
        repayAmount={repayAmount}
        withdrawAmount={withdrawAmount}
        balances={balances}
        totalLiquidity={totalLiquidity}
        userBorrow={userBorrow}
        userCollateral={userCollateral}
        projectedLTV={projectedLTV}
        projectedBorrow={projectedBorrow}
        projectedCollateral={projectedCollateral}
        lltv={lltv}
        isExecuting={isExecuting}
        executingAction={executingAction}
        onClick={handleActionClick}
      />
    </div>
  );
}
