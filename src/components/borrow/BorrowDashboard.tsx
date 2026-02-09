"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Address } from "viem";
import {
  useWallets,
  useSignMessage,
} from "@privy-io/react-auth";
import { MARKET_ID } from "@/constants/addresses";
import { LOGOS } from "@/constants/config";
import { TransactionHistoryItem } from "@/types";
import {
  useNotification,
  useTransactionExecution,
  useMarketData,
  usePrices,
  usePosition,
  useTokenBalances,
  useTransactionHistory,
} from "@/hooks";

import { MetricStat } from "./components/MetricStat";
import { ActivityTab } from "./tabs/ActivityTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { YourPositionTab } from "./tabs/YourPositionTab";
import { SidebarActions } from "./sidebar";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { useBorrowCalculations } from "./hooks/useBorrowCalculations";

export function BorrowDashboard() {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0];
  const address = wallet?.address;

  // Form state
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sidebarMode, setSidebarMode] = useState<"borrow" | "repay">("borrow");
  const [repayMax, setRepayMax] = useState(false);
  const [withdrawMax, setWithdrawMax] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("Overview");
  const [actionType, setActionType] = useState<"borrow" | "repay">("borrow");
  const [marketIdCopied, setMarketIdCopied] = useState(false);

  // Data hooks (all fetched from backend APIs)
  const { data: market, isLoading: marketLoading } = useMarketData();
  const { data: position, refetch: refetchPosition } = usePosition(address);
  const { prices: pythPrices } = usePrices();
  const { data: balances, refetch: refetchBalances } = useTokenBalances(
    address as Address | undefined
  );

  // Other hooks
  const { history, saveTransaction } = useTransactionHistory(address);
  const { notification, showSuccess, showError, dismiss } = useNotification();

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // "setState during render" pattern to avoid set-state-in-effect lint error
  const [prevTabParam, setPrevTabParam] = useState(tabParam);
  if (prevTabParam !== tabParam) {
    setPrevTabParam(tabParam);
    if (tabParam === "position") {
      setActiveTab("Your Position");
    }
  }

  const handleCopyMarketId = () => {
    navigator.clipboard.writeText(MARKET_ID);
    setMarketIdCopied(true);
    setTimeout(() => setMarketIdCopied(false), 2000);
  };

  // "setState during render" pattern to reset form on tab change
  const [prevActiveTab, setPrevActiveTab] = useState(activeTab);
  if (prevActiveTab !== activeTab) {
    setPrevActiveTab(activeTab);
    setSupplyAmount("");
    setBorrowAmount("");
    setRepayAmount("");
    setWithdrawAmount("");
    setRepayMax(false);
    setWithdrawMax(false);
    dismiss();
  }

  // Derived values from API data
  const userCollateral = position?.userCollateral ?? 0;
  const userBorrow = position?.userBorrow ?? 0;
  const oraclePrice = position?.oraclePrice ?? market?.oraclePrice ?? 0;
  const lltv = position?.lltv ?? market?.lltv ?? 0;

  const calculations = useBorrowCalculations({
    userCollateral,
    userBorrow,
    supplyAmount,
    borrowAmount,
    repayAmount,
    withdrawAmount,
    lltv,
    oraclePrice,
    actionType,
  });

  const totalMarketSize = market?.totalMarketSize ?? 0;
  const totalLiquidity = market?.totalLiquidity ?? 0;
  const utilization = market?.utilization ?? "0.00%";
  const borrowRate = market?.borrowRate ?? "0.00";

  // Balances for sidebar
  const sidebarBalances = {
    loan: balances?.usdt.formatted ?? "0",
    collateral: balances?.xaut.formatted ?? "0",
  };

  // Transaction execution via backend
  const { isExecuting, executeBorrowAction } = useTransactionExecution({
    address: address as Address | undefined,
    signMessage,
  });

  const executingAction = isExecuting ? "main" : null;

  const resetForm = () => {
    setSupplyAmount("");
    setBorrowAmount("");
    setRepayAmount("");
    setWithdrawAmount("");
    setRepayMax(false);
    setWithdrawMax(false);
  };

  const handleAction = async (overrides?: {
    supply?: string;
    borrow?: string;
    repay?: string;
    withdraw?: string;
    type?: "borrow" | "repay";
    actionId?: string;
    repayMax?: boolean;
    withdrawMax?: boolean;
  }) => {
    if (!address) return;

    showSuccess("Transaction submitted! Waiting for confirmation...");

    const effectiveSupply = overrides?.supply ?? supplyAmount;
    const effectiveBorrow = overrides?.borrow ?? borrowAmount;
    const effectiveRepay = overrides?.repay ?? repayAmount;
    const effectiveWithdraw = overrides?.withdraw ?? withdrawAmount;
    const effectiveActionType = overrides?.type ?? actionType;

    const result = await executeBorrowAction({
      supplyAmount: effectiveSupply,
      borrowAmount: effectiveBorrow,
      repayAmount: effectiveRepay,
      withdrawAmount: effectiveWithdraw,
      repayMax: overrides?.repayMax ?? repayMax,
      withdrawMax: overrides?.withdrawMax ?? withdrawMax,
    });

    if (result.success && result.txHash) {
      // Determine history type
      let hType: string = effectiveActionType;
      if (effectiveWithdraw && Number(effectiveWithdraw) > 0) hType = "withdraw";
      if (!effectiveBorrow && !effectiveRepay && effectiveSupply && Number(effectiveSupply) > 0)
        hType = "supply";

      showSuccess("Transaction confirmed!", result.txHash);
      saveTransaction({
        walletAddress: address,
        action: hType as TransactionHistoryItem["type"],
        txHash: result.txHash,
        executedBy: "user",
        supply: effectiveSupply || undefined,
        borrow: effectiveBorrow || undefined,
        repay: effectiveRepay || undefined,
        withdraw: effectiveWithdraw || undefined,
      });
      resetForm();

      // Refetch position and balances after transaction
      const updatedPosition = await refetchPosition();
      if (sidebarMode === "repay" && updatedPosition.data) {
        if (!updatedPosition.data.hasPosition) {
          setSidebarMode("borrow");
          setActionType("borrow");
        }
      }
      refetchBalances();
    } else if (result.error) {
      showError(result.error);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-4">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white z-10 border-4 border-[#050505] overflow-hidden">
              <Image src={LOGOS.USDT} alt="USDT" width={48} height={48} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white z-0 border-4 border-[#050505] overflow-hidden">
              <Image src={LOGOS.XAUt} alt="XAUt" width={48} height={48} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-white">
            XAUt <span className="text-zinc-500">/</span> USDT
          </h1>
          <button
            onClick={handleCopyMarketId}
            className="p-1 hover:bg-white/5 rounded transition-colors group"
          >
            {marketIdCopied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4 text-zinc-500 group-hover:text-white" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
          <MetricStat
            label="Total Market Size"
            value={`$${(totalMarketSize * (pythPrices.USDT || 1)).toFixed(2)}`}
            subValue={`${totalMarketSize.toFixed(2)} USDT`}
            isLoading={marketLoading}
            info="The total value of all assets deposited as collateral in this specific market."
          />
          <MetricStat
            label="Available Liquidity"
            value={`$${(totalLiquidity * (pythPrices.USDT || 1)).toFixed(2)}`}
            subValue={`${totalLiquidity.toFixed(2)} USDT`}
            isLoading={marketLoading}
            info="The amount of USDT currently available in the pool for borrowing."
          />
          <MetricStat
            label="APR"
            value={`${borrowRate}%`}
            isLoading={marketLoading}
            info="The current annualized percentage rate for borrowing USDT. This rate is variable and based on market utilization."
          />
        </div>

        <div className="flex gap-6 sm:gap-8 border-b border-zinc-800 pb-4 overflow-x-auto scrollbar-hide">
          {["Your Position", "Overview", "Activity"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "transition-colors pb-4 -mb-[17px] outline-none cursor-pointer",
                activeTab === tab
                  ? "text-white font-medium border-b-2 border-emerald-500"
                  : "text-zinc-500 hover:text-white"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Your Position" && (
          <YourPositionTab
            userCollateral={userCollateral}
            userBorrow={userBorrow}
            currentLTV={calculations.currentLTV}
            lltv={calculations.lltv}
            pythPrices={pythPrices}
            liquidationPrice={calculations.liquidationPrice}
            percentDropToLiquidation={calculations.percentDropToLiquidation}
            utilization={utilization}
          />
        )}

        {activeTab === "Activity" && <ActivityTab history={history} />}

        {activeTab === "Overview" && (
          <OverviewTab
            utilization={utilization}
            oraclePrice={oraclePrice}
            lltv={calculations.lltv}
          />
        )}
      </div>

      <div className="lg:col-span-1">
        <SidebarActions
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          setActionType={setActionType}
          userCollateral={userCollateral}
          userBorrow={userBorrow}
          supplyAmount={supplyAmount}
          setSupplyAmount={setSupplyAmount}
          borrowAmount={borrowAmount}
          setBorrowAmount={setBorrowAmount}
          repayAmount={repayAmount}
          setRepayAmount={setRepayAmount}
          withdrawAmount={withdrawAmount}
          setWithdrawAmount={setWithdrawAmount}
          repayMax={repayMax}
          setRepayMax={setRepayMax}
          withdrawMax={withdrawMax}
          setWithdrawMax={setWithdrawMax}
          balances={sidebarBalances}
          pythPrices={pythPrices}
          totalLiquidity={totalLiquidity}
          maxWithdrawable={calculations.maxWithdrawable}
          projectedCollateral={calculations.projectedCollateral}
          projectedBorrow={calculations.projectedBorrow}
          currentLTV={calculations.currentLTV}
          projectedLTV={calculations.projectedLTV}
          lltv={calculations.lltv}
          isDanger={calculations.isDanger}
          isAtRisk={calculations.isAtRisk}
          borrowRate={borrowRate}
          executingAction={executingAction}
          isExecuting={isExecuting}
          handleAction={handleAction}
        />
      </div>

      <NotificationToast notification={notification} onDismiss={dismiss} />
    </div>
  );
}
