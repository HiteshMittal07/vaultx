import Image from "next/image";
import { cn } from "@/lib/utils";
import { LOGOS } from "@/constants/config";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface SidebarActionsProps {
  sidebarMode: "borrow" | "repay";
  setSidebarMode: (mode: "borrow" | "repay") => void;
  setActionType: (type: "borrow" | "repay") => void;
  userCollateral: number;
  userBorrow: number;
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
  balances: { loan: string; collateral: string };
  pythPrices: { XAUt0: number; USDT0: number };
  totalLiquidity: number;
  maxWithdrawable: number;
  projectedCollateral: number;
  projectedBorrow: number;
  currentLTV: number;
  projectedLTV: number;
  lltv: number;
  isDanger: boolean;
  isAtRisk: boolean;
  borrowRate: string;
  executingAction: string | null;
  isExecuting: boolean;
  handleAction: (overrides?: any) => Promise<void>;
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
  return (
    <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-6">
      {/* Borrow/Repay Toggle */}
      <div className="flex bg-zinc-950/50 p-1 rounded-2xl border border-white/5">
        <button
          onClick={() => {
            setSidebarMode("borrow");
            setActionType("borrow");
          }}
          className={cn(
            "flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all",
            sidebarMode === "borrow"
              ? "bg-zinc-800 text-white shadow-xl"
              : "text-zinc-500 hover:text-zinc-300",
          )}
        >
          Borrow
        </button>
        {(userCollateral > 0 || userBorrow > 0) && (
          <button
            onClick={() => {
              setSidebarMode("repay");
              setActionType("repay");
            }}
            className={cn(
              "flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all",
              sidebarMode === "repay"
                ? "bg-zinc-800 text-white shadow-xl"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            Repay
          </button>
        )}
      </div>

      {sidebarMode === "borrow" ? (
        <div className="space-y-4">
          {/* Supply Input */}
          <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
            <div className="flex justify-between text-xs items-center">
              <span className="text-zinc-400 font-medium">
                Supply {sidebarMode === "borrow" ? "Collateral" : "to Repay"}{" "}
                XAUt0
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
                <Image src={LOGOS.XAUt0} alt="XAUt0" width={16} height={16} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={supplyAmount}
                onChange={(e) => {
                  setActionType("borrow");
                  setSupplyAmount(e.target.value);
                }}
                className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
                placeholder="0.00"
              />
              <button
                onClick={() => setSupplyAmount(balances.collateral)}
                className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500">
                $
                {(Number(supplyAmount || 0) * pythPrices.XAUt0).toLocaleString(
                  undefined,
                  { maximumFractionDigits: 2 },
                )}
              </span>
              <span
                className={cn(
                  "font-mono",
                  Number(supplyAmount) > Number(balances.collateral)
                    ? "text-red-400"
                    : "text-zinc-600",
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
                onChange={(e) => {
                  setActionType("borrow");
                  setBorrowAmount(e.target.value);
                }}
                className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
                placeholder="0.00"
              />
              <button
                onClick={() => setBorrowAmount(totalLiquidity.toString())}
                className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500">
                $
                {(
                  Number(borrowAmount || 0) * pythPrices.USDT0
                ).toLocaleString()}
              </span>
              <span
                className={cn(
                  "font-mono",
                  Number(borrowAmount) > totalLiquidity
                    ? "text-red-400"
                    : "text-zinc-600",
                )}
              >
                Available: {totalLiquidity.toFixed(2)} USDT0
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Repay Input */}
          <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
            <div className="flex justify-between text-xs items-center">
              <span className="text-zinc-400 font-medium">
                Repay Loan USDT0
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
                <Image src={LOGOS.USDT0} alt="USDT0" width={16} height={16} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={repayAmount}
                onChange={(e) => {
                  setActionType("repay");
                  setRepayAmount(e.target.value);
                  setRepayMax(false);
                }}
                className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
                placeholder="0.00"
              />
              <button
                onClick={() => {
                  setActionType("repay");
                  const canRepayFull = Number(balances.loan) >= userBorrow;
                  const amount = Math.min(Number(balances.loan), userBorrow);
                  setRepayAmount(amount.toFixed(6).replace(/\.?0+$/, ""));
                  setRepayMax(canRepayFull);
                }}
                className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500">
                $
                {(Number(repayAmount || 0) * pythPrices.USDT0).toLocaleString()}
              </span>
              <span className="text-zinc-600 font-mono">
                Loan: {userBorrow.toFixed(2)} USDT0
              </span>
            </div>
          </div>

          {/* Withdraw Input */}
          <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
            <div className="flex justify-between text-xs items-center">
              <span className="text-zinc-400 font-medium">
                Withdraw Collateral XAUt0
              </span>
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
                <Image src={LOGOS.XAUt0} alt="XAUt0" width={16} height={16} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => {
                  setWithdrawAmount(e.target.value);
                  setWithdrawMax(false);
                }}
                className="w-full bg-transparent text-3xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none placeholder-zinc-800"
                placeholder="0.00"
              />
              <button
                onClick={() => {
                  const isClosing = repayMax || userBorrow <= 0.01;
                  const maxW = isClosing
                    ? userCollateral
                    : Math.floor(maxWithdrawable * 0.999 * 1e6) / 1e6;
                  setWithdrawAmount(maxW.toFixed(6).replace(/\.?0+$/, ""));
                  setWithdrawMax(isClosing);
                }}
                className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-zinc-500">
                $
                {(
                  Number(withdrawAmount || 0) * pythPrices.XAUt0
                ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
              <span className="text-zinc-600 font-mono">
                {userCollateral < 0.0001
                  ? "< 0.0001"
                  : userCollateral.toFixed(4)}{" "}
                XAUt0
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Position Summary - Reimagined for Side Panel */}
      <div className="rounded-2xl bg-zinc-900/20 border border-white/5 p-4 space-y-3">
        <div className="flex justify-between text-sm items-center">
          <div className="flex items-center gap-2 text-zinc-400">
            <div className="flex h-4 w-4 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
              <Image src={LOGOS.XAUt0} alt="XAUt0" width={12} height={12} />
            </div>
            <span className="text-xs">Collateral (XAUt0)</span>
          </div>
          <span className="text-white text-xs font-medium">
            {projectedCollateral < 0.0001
              ? "< 0.0001"
              : projectedCollateral.toFixed(4)}{" "}
            XAUt0
          </span>
        </div>
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
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">LTV</span>
          <span
            className={cn(
              "font-medium",
              isDanger
                ? "text-red-400"
                : isAtRisk
                  ? "text-amber-400"
                  : "text-white",
            )}
          >
            {currentLTV.toFixed(2)}%
            {(supplyAmount || borrowAmount || repayAmount || withdrawAmount) &&
            Math.abs(projectedLTV - currentLTV) > 0.001 ? (
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
                          : "text-white",
                  )}
                >
                  {projectedLTV > 100 ? ">100" : projectedLTV.toFixed(2)}%
                </span>
              </>
            ) : null}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">Liquidation LTV</span>
          <span className="text-white font-medium">{lltv.toFixed(0)}%</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-zinc-500">APR</span>
          <span className="text-emerald-400 font-medium">{borrowRate}%</span>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => {
          if (sidebarMode === "repay") {
            handleAction({
              type: "repay",
              repay: repayAmount,
              withdraw: withdrawAmount,
              actionId: "main",
              repayMax: repayMax,
              withdrawMax: withdrawMax,
            });
          } else {
            handleAction();
          }
        }}
        disabled={
          isExecuting ||
          (sidebarMode === "borrow" &&
            Number(supplyAmount || 0) <= 0 &&
            Number(borrowAmount || 0) <= 0) ||
          (sidebarMode === "repay" &&
            Number(repayAmount || 0) <= 0 &&
            Number(withdrawAmount || 0) <= 0) ||
          Number(supplyAmount) > Number(balances.collateral) ||
          Number(borrowAmount) > totalLiquidity ||
          Number(repayAmount) > Number(balances.loan) ||
          Number(repayAmount) > userBorrow + 0.0001 ||
          Number(withdrawAmount) > userCollateral ||
          (projectedLTV > lltv + 0.01 && projectedBorrow > userBorrow) ||
          (projectedBorrow > userBorrow && projectedCollateral <= 0)
        }
        className={cn(
          "w-full rounded-2xl py-4 text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-2xl shadow-emerald-500/10",
          isExecuting ||
            (sidebarMode === "borrow" &&
              Number(supplyAmount || 0) <= 0 &&
              Number(borrowAmount || 0) <= 0) ||
            (sidebarMode === "repay" &&
              Number(repayAmount || 0) <= 0 &&
              Number(withdrawAmount || 0) <= 0) ||
            Number(supplyAmount) > Number(balances.collateral) ||
            Number(borrowAmount) > totalLiquidity ||
            Number(repayAmount) > Number(balances.loan) ||
            Number(repayAmount) > userBorrow + 0.0001 ||
            Number(withdrawAmount) > userCollateral ||
            (projectedLTV > lltv + 0.01 && projectedBorrow > userBorrow) ||
            (projectedBorrow > userBorrow && projectedCollateral <= 0)
            ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            : "bg-white text-black hover:bg-zinc-100",
        )}
      >
        {executingAction === "main" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Executing...
          </>
        ) : sidebarMode === "borrow" ? (
          Number(supplyAmount) > Number(balances.collateral) ? (
            "Insufficient Balance"
          ) : Number(borrowAmount) > totalLiquidity ? (
            "Insufficient Liquidity"
          ) : (Number(borrowAmount) > userBorrow && projectedCollateral <= 0) ||
            (projectedLTV >= lltv && projectedBorrow > userBorrow) ? (
            "Insufficient Collateral"
          ) : Number(supplyAmount || 0) <= 0 &&
            Number(borrowAmount || 0) <= 0 ? (
            "Enter an amount"
          ) : Number(supplyAmount || 0) > 0 && Number(borrowAmount || 0) > 0 ? (
            "Supply & Borrow"
          ) : Number(supplyAmount || 0) > 0 ? (
            "Supply Collateral"
          ) : (
            "Borrow USDT0"
          )
        ) : Number(repayAmount) > Number(balances.loan) ? (
          "Insufficient USDT0"
        ) : Number(repayAmount) > userBorrow + 0.0001 ? (
          "Inconsistent Amount"
        ) : Number(withdrawAmount) > userCollateral ? (
          "Insufficient Collateral"
        ) : projectedLTV >= lltv && userBorrow > 0 ? (
          "LTV Limit (Repay or Add more)"
        ) : Number(repayAmount || 0) <= 0 &&
          Number(withdrawAmount || 0) <= 0 ? (
          "Enter an amount"
        ) : Number(repayAmount || 0) > 0 && Number(withdrawAmount || 0) > 0 ? (
          "Repay & Withdraw"
        ) : Number(repayAmount || 0) > 0 ? (
          "Repay Loan"
        ) : (
          "Withdraw Collateral"
        )}
      </motion.button>
    </div>
  );
}
