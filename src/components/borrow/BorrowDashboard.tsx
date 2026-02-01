"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Copy, Check, CheckCircle2, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Address,
  formatUnits,
  parseUnits,
  encodeFunctionData,
  Hex,
  Call,
} from "viem";
import {
  useWallets,
  useSign7702Authorization,
  useSignMessage,
} from "@privy-io/react-auth";
import { AAService, bigIntReplacer } from "@/services/account-abstraction";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { publicClient } from "@/lib/blockchain/client";
import { ERC20_ABI, MORPHO_ABI } from "@/constants/abis";
import {
  USDT0,
  XAUT0,
  MORPHO_ADDRESS,
  MARKET_ID,
  BICONOMY_NEXUS_V1_2_0,
} from "@/constants/addresses";
import { LOGOS, arbitrum, APP_CONFIG } from "@/constants/config";
import {
  getTokenBalances,
  getMorphoMarketData,
  getBorrowRate,
  getOraclePrice,
  getLatestPythPrice,
  getMorphoUserPosition,
} from "@/lib/blockchain/utils";

import { MetricStat } from "./components/MetricStat";
import { ActivityTab } from "./tabs/ActivityTab";
import { OverviewTab } from "./tabs/OverviewTab";
import { YourPositionTab } from "./tabs/YourPositionTab";
import { SidebarActions } from "./SidebarActions";

export function BorrowDashboard() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0];
  const address = wallet?.address;

  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [sidebarMode, setSidebarMode] = useState<"borrow" | "repay">("borrow");
  const [repayMax, setRepayMax] = useState(false);
  const [withdrawMax, setWithdrawMax] = useState(false);

  const [activeTab, setActiveTab] = useState("Overview");
  const [actionType, setActionType] = useState<"borrow" | "repay">("borrow");
  const [history, setHistory] = useState<any[]>([]);

  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  useEffect(() => {
    if (tabParam === "position") {
      setActiveTab("Your Position");
    }
  }, [tabParam]);

  useEffect(() => {
    if (!address) return;
    const saved = localStorage.getItem(`vaultx_history_${address}`);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    } else {
      setHistory([]);
    }
  }, [address]);

  useEffect(() => {
    if (address && history.length > 0) {
      localStorage.setItem(
        `vaultx_history_${address}`,
        JSON.stringify(history),
      );
    }
  }, [history, address]);

  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const isExecuting = executingAction !== null;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    txHash?: string;
  } | null>(null);

  // Market Data
  const [marketParams, setMarketParams] = useState<any>(null);
  const [marketState, setMarketState] = useState<any>(null);
  const [userPosition, setUserPosition] = useState<any>(null);
  const [balances, setBalances] = useState({ loan: "0", collateral: "0" });
  const [borrowRate, setBorrowRate] = useState<string>("0.00");
  const [oraclePrice, setOraclePrice] = useState<number>(0);
  const [pythPrices, setPythPrices] = useState<{
    XAUt0: number;
    USDT0: number;
  }>({ XAUt0: 0, USDT0: 1 });
  const [marketIdCopied, setMarketIdCopied] = useState(false);

  const handleCopyMarketId = () => {
    navigator.clipboard.writeText(MARKET_ID);
    setMarketIdCopied(true);
    setTimeout(() => setMarketIdCopied(false), 2000);
  };

  const fetchData = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    try {
      const [{ params, state, position }, [loanBal, collBal]] =
        await Promise.all([
          getMorphoMarketData(address as Address),
          getTokenBalances(address as Address, [USDT0, XAUT0]),
        ]);

      setMarketParams(params);
      setMarketState(state);
      setUserPosition(position);
      setBalances({
        loan: formatUnits(loanBal, 6),
        collateral: formatUnits(collBal, 6),
      });

      // Fetch Borrow Rate from IRM
      if (params && state) {
        const rate = await getBorrowRate(params, state);
        setBorrowRate(rate);
      }

      // Fetch Oracle Price
      if (params) {
        const price = await getOraclePrice(params);
        setOraclePrice(price);
      }

      // Fetch Pyth Prices
      const [pXAUT, pUSDT] = await Promise.all([
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt0),
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT0),
      ]);
      if (pXAUT > 0 && pUSDT > 0) {
        setPythPrices({ XAUt0: pXAUT, USDT0: pUSDT });
      }
    } catch (err) {
      console.error("Error fetching borrow data:", err);
      setError("Failed to fetch market data");
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setSupplyAmount("");
    setBorrowAmount("");
    setRepayAmount("");
    setWithdrawAmount("");
    setRepayMax(false);
    setWithdrawMax(false);
    setNotification(null);
  }, [activeTab]);

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
    if (!address || !marketParams) return;
    const actionId = overrides?.actionId ?? "main";
    setExecutingAction(actionId);

    const sAmt = overrides?.supply ?? supplyAmount;
    const bAmt = overrides?.borrow ?? borrowAmount;
    const rAmt = overrides?.repay ?? repayAmount;
    const wAmt = overrides?.withdraw ?? withdrawAmount;
    const aType = overrides?.type ?? actionType;
    const isRepayMax = overrides?.repayMax ?? repayMax;
    const isWithdrawMax = overrides?.withdrawMax ?? withdrawMax;

    try {
      const calls: Call[] = [];

      // 1. Supply Collateral
      if (sAmt && Number(sAmt) > 0) {
        const parsedSupply = parseUnits(sAmt, 6);
        calls.push({
          to: XAUT0 as Address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MORPHO_ADDRESS, parsedSupply],
          }),
          value: BigInt(0),
        });
        calls.push({
          to: MORPHO_ADDRESS as Address,
          data: encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: "supplyCollateral",
            args: [marketParams, parsedSupply, address as Address, "0x"],
          }),
          value: BigInt(0),
        });
      }

      // 2. Borrow
      if (aType === "borrow" && bAmt && Number(bAmt) > 0) {
        const parsedBorrow = parseUnits(bAmt, 6);
        calls.push({
          to: MORPHO_ADDRESS as Address,
          data: encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: "borrow",
            args: [
              marketParams,
              parsedBorrow,
              BigInt(0),
              address as Address,
              address as Address,
            ],
          }),
          value: BigInt(0),
        });
      }

      // 3. Repay
      if (aType === "repay" && rAmt && Number(rAmt) > 0) {
        const approvalAmount = isRepayMax
          ? BigInt(
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            )
          : parseUnits(rAmt, 6);
        const assetsToRepay = isRepayMax ? BigInt(0) : parseUnits(rAmt, 6);
        const sharesToRepay = isRepayMax
          ? BigInt(userPosition?.[1] || 0)
          : BigInt(0);

        calls.push({
          to: USDT0 as Address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MORPHO_ADDRESS, approvalAmount],
          }),
          value: BigInt(0),
        });
        calls.push({
          to: MORPHO_ADDRESS as Address,
          data: encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: "repay",
            args: [
              marketParams,
              assetsToRepay,
              sharesToRepay,
              address as Address,
              "0x",
            ],
          }),
          value: BigInt(0),
        });
      }

      // 4. Withdraw Collateral
      if (wAmt && Number(wAmt) > 0) {
        const parsedWithdraw = isWithdrawMax
          ? BigInt(userPosition?.[2] || 0)
          : parseUnits(wAmt, 6);
        calls.push({
          to: MORPHO_ADDRESS as Address,
          data: encodeFunctionData({
            abi: MORPHO_ABI,
            functionName: "withdrawCollateral",
            args: [
              marketParams,
              parsedWithdraw,
              address as Address,
              address as Address,
            ],
          }),
          value: BigInt(0),
        });
      }

      if (calls.length === 0) return;

      const bytecode = await publicClient.getBytecode({
        address: address as Address,
      });
      const hasCode = bytecode !== undefined && bytecode !== "0x";

      let authorization;
      if (!hasCode) {
        authorization = await signAuthorization(
          {
            contractAddress: BICONOMY_NEXUS_V1_2_0,
            chainId: arbitrum.id,
            nonce: 0,
          },
          { address: address as Address },
        );
      }

      const userOp = await AAService.prepare(
        address as Address,
        calls,
        authorization || undefined,
      );

      const hash = getUserOperationHash({
        chainId: arbitrum.id,
        entryPointAddress: entryPoint07Address,
        entryPointVersion: "0.7",
        userOperation: {
          ...userOp,
          sender: userOp.sender,
          signature: "0x",
        },
      });

      const { signature } = await signMessage({ message: hash });

      const userOpWithSignature = {
        ...userOp,
        signature: signature as Hex,
      };

      const response = await fetch("/api/aa/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          {
            userOp: userOpWithSignature,
            authorization: authorization || null,
          },
          bigIntReplacer,
        ),
      });

      const { txHash, error: relayError } = await response.json();
      if (relayError) throw new Error(relayError);

      setNotification({
        type: "success",
        message: "Transaction submitted! Waiting for confirmation...",
        txHash: txHash,
      });

      // Wait for receipt
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });

      setNotification({
        type: "success",
        message: "Transaction confirmed!",
        txHash: txHash,
      });

      // Determine history type
      let hType: string = aType;
      if (wAmt && Number(wAmt) > 0) hType = "withdraw";
      if (!bAmt && !rAmt && sAmt && Number(sAmt) > 0) hType = "supply";

      setHistory((prev) => [
        {
          id: txHash,
          type: hType,
          supply: sAmt,
          borrow: bAmt,
          repay: rAmt,
          withdraw: wAmt,
          timestamp: new Date().toLocaleTimeString(),
          status: "success",
        },
        ...prev,
      ]);

      setSupplyAmount("");
      setBorrowAmount("");
      setRepayAmount("");
      setWithdrawAmount("");
      setRepayMax(false);
      setWithdrawMax(false);
      if (sidebarMode === "repay") {
        const position = await getMorphoUserPosition(
          address as Address,
          MARKET_ID,
        );
        if (position?.[1] === BigInt(0) && position?.[2] === BigInt(0)) {
          setSidebarMode("borrow");
          setActionType("borrow");
        }
      }
      await fetchData();
    } catch (err: any) {
      console.error("Borrow execution failed:", err);
      setNotification({
        type: "error",
        message: err.message || "Execution failed",
      });
    } finally {
      setExecutingAction(null);
    }
  };

  const borrowedFunds =
    marketState && marketState.length >= 3
      ? Number(formatUnits(marketState[2] as bigint, 6))
      : 0;

  const marketLiquidity =
    marketState && marketState.length >= 3
      ? Number(
          formatUnits(
            (marketState[0] as bigint) - (marketState[2] as bigint),
            6,
          ),
        )
      : 0;

  const totalMarketSize = borrowedFunds + marketLiquidity;
  const totalLiquidity = marketLiquidity;

  const lltv =
    marketParams && marketParams.length >= 5
      ? Number(formatUnits(marketParams[4] as bigint, 18)) * 100
      : 0;

  const userCollateral =
    userPosition && userPosition.length >= 3
      ? Number(formatUnits(userPosition[2] as bigint, 6))
      : 0;

  const userBorrow =
    userPosition &&
    userPosition.length >= 2 &&
    marketState &&
    marketState.length >= 4 &&
    Number(marketState[3]) > 0
      ? (Number(userPosition[1]) * Number(marketState[2])) /
        Number(marketState[3]) /
        1e6
      : 0;

  const currentLTV =
    userCollateral > 0 && oraclePrice > 0
      ? (userBorrow / (userCollateral * oraclePrice)) * 100
      : 0;

  const projectedBorrow =
    actionType === "borrow"
      ? userBorrow + Number(borrowAmount || 0)
      : Math.max(0, userBorrow - Number(repayAmount || 0));

  const projectedCollateral =
    userCollateral + Number(supplyAmount || 0) - Number(withdrawAmount || 0);

  const projectedLTV =
    projectedCollateral > 0 && oraclePrice > 0
      ? (projectedBorrow / (projectedCollateral * oraclePrice)) * 100
      : 0;

  const maxWithdrawable =
    userBorrow > 0 && oraclePrice > 0 && lltv > 0
      ? Math.max(0, userCollateral - userBorrow / (oraclePrice * (lltv / 100)))
      : userCollateral;

  const isAtRisk = projectedLTV >= lltv * 0.9;
  const isDanger = projectedLTV >= lltv * 0.95;

  const liquidationPrice =
    userCollateral > 0 && lltv > 0
      ? userBorrow / (userCollateral * (lltv / 100))
      : 0;

  const percentDropToLiquidation =
    oraclePrice > 0 && liquidationPrice > 0
      ? ((oraclePrice - liquidationPrice) / oraclePrice) * 100
      : 0;

  const utilization =
    marketState && Number(marketState[0]) > 0
      ? `${((Number(marketState[2]) / Number(marketState[0])) * 100).toFixed(2)}%`
      : "0.00%";

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 p-4">
      <div className="lg:col-span-2 space-y-8">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white z-10 border-4 border-[#050505] overflow-hidden">
              <Image src={LOGOS.USDT0} alt="USDT0" width={48} height={48} />
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white z-0 border-4 border-[#050505] overflow-hidden">
              <Image src={LOGOS.XAUt0} alt="XAUt0" width={48} height={48} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-4xl font-light text-white">
            XAUt0 <span className="text-zinc-500">/</span> USDT0
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
            value={`$${(totalMarketSize * (pythPrices.USDT0 || 1)).toFixed(2)}`}
            subValue={`${totalMarketSize.toFixed(2)} USDT0`}
            isLoading={isLoading}
            info="The total value of all assets deposited as collateral in this specific market."
          />
          <MetricStat
            label="Available Liquidity"
            value={`$${(totalLiquidity * (pythPrices.USDT0 || 1)).toFixed(2)}`}
            subValue={`${totalLiquidity.toFixed(2)} USDT0`}
            isLoading={isLoading}
            info="The amount of USDT0 currently available in the pool for borrowing."
          />
          <MetricStat
            label="APR"
            value={`${borrowRate}%`}
            isLoading={isLoading}
            info="The current annualized percentage rate for borrowing USDT0. This rate is variable and based on market utilization."
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
                  : "text-zinc-500 hover:text-white",
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
            currentLTV={currentLTV}
            lltv={lltv}
            pythPrices={pythPrices}
            liquidationPrice={liquidationPrice}
            percentDropToLiquidation={percentDropToLiquidation}
            utilization={utilization}
          />
        )}

        {activeTab === "Activity" && <ActivityTab history={history} />}

        {activeTab === "Overview" && (
          <OverviewTab
            utilization={utilization}
            oraclePrice={oraclePrice}
            lltv={lltv}
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
          balances={balances}
          pythPrices={pythPrices}
          totalLiquidity={totalLiquidity}
          maxWithdrawable={maxWithdrawable}
          projectedCollateral={projectedCollateral}
          projectedBorrow={projectedBorrow}
          currentLTV={currentLTV}
          projectedLTV={projectedLTV}
          lltv={lltv}
          isDanger={isDanger}
          isAtRisk={isAtRisk}
          borrowRate={borrowRate}
          executingAction={executingAction}
          isExecuting={isExecuting}
          handleAction={handleAction}
        />
      </div>

      {/* Notification Pop-up */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-start gap-3">
              {notification.type === "success" ? (
                <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              ) : (
                <div className="mt-0.5 rounded-full bg-red-500/10 p-1">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">
                  {notification.type === "success" ? "Success" : "Error"}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                  {notification.message}
                </p>

                {notification.txHash && (
                  <a
                    href={`https://arbiscan.io/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
                  >
                    View on Arbiscan
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <button
                onClick={() => setNotification(null)}
                className="rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <XCircle className="h-4 w-4 opacity-50" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
