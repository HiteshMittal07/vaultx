import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Info,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Scale,
  Droplets,
  Users,
} from "lucide-react";
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

  // Load history from localStorage
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
      setHistory([]); // Clear history if no data for this address
    }
  }, [address]);

  // Save history to localStorage
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
          <div className="space-y-8 sm:space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10 pt-4">
              {/* Left Column Stats */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">Collateral</span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={LOGOS.XAUt0}
                      alt="XAUt0"
                      width={16}
                      height={16}
                    />
                    <span className="text-white font-medium">
                      {userCollateral < 0.0001
                        ? "< 0.0001"
                        : userCollateral.toFixed(4)}{" "}
                      XAUt0
                    </span>
                    <span className="text-zinc-500 text-xs">
                      ${(userCollateral * pythPrices.XAUt0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">Loan</span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={LOGOS.USDT0}
                      alt="USDT0"
                      width={16}
                      height={16}
                    />
                    <span className="text-white font-medium">
                      {userBorrow.toFixed(2)} USDT0
                    </span>
                    <span className="text-zinc-500 text-xs">
                      ${(userBorrow * pythPrices.USDT0).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">
                    LTV / Liquidation LTV
                  </span>
                  <span className="text-white font-medium">
                    {currentLTV > 0 ? currentLTV.toFixed(2) : "-"}% /{" "}
                    {lltv.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Right Column Stats */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">
                    Liquidation price
                  </span>
                  <span className="text-white font-medium">
                    {liquidationPrice > 0
                      ? liquidationPrice.toLocaleString(undefined, {
                          maximumFractionDigits: 2,
                        })
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">
                    % drop to liquidation
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      percentDropToLiquidation < 10
                        ? "text-red-400"
                        : "text-white",
                    )}
                  >
                    {percentDropToLiquidation > 0
                      ? `${percentDropToLiquidation.toFixed(2)}%`
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm flex items-center gap-1">
                    Utilization
                  </span>
                  <span className="text-white font-medium">
                    {marketState && Number(marketState[0]) > 0
                      ? `${((Number(marketState[2]) / Number(marketState[0])) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Activity" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-xl text-white font-light">Your Transactions</h3>
            <div className="rounded-3xl border border-white/5 bg-zinc-900/20 overflow-hidden min-h-[300px]">
              {history.filter((tx) => tx.type !== "swap").length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <span className="text-zinc-500 text-sm">
                    No transactions found.
                  </span>
                </div>
              ) : (
                <div className="w-full">
                  {history
                    .filter((tx) => tx.type !== "swap")
                    .map((tx, i) => (
                      <div
                        key={i}
                        className="p-4 border-b border-white/5 last:border-b-0 flex items-center justify-between hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                            <RefreshCw className="h-4 w-4 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium capitalize">
                              {tx.type} Successful
                            </p>
                            <p className="text-zinc-500 text-xs">
                              {tx.timestamp}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <a
                            href={`https://arbiscan.io/tx/${tx.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 text-xs hover:underline flex items-center gap-1"
                          >
                            View on Arbiscan{" "}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "Overview" && (
          <div className="space-y-12">
            <div>
              <h3 className="text-zinc-400 font-medium mb-6">
                Market Attributes
              </h3>
              <div className="grid grid-cols-2 gap-x-20 gap-y-6">
                <MarketAttribute
                  label="Collateral"
                  value="XAUt0"
                  logo={LOGOS.XAUt0}
                  href={`https://arbiscan.io/address/${XAUT0}`}
                />
                <MarketAttribute
                  label="Oracle price"
                  value={`XAUt0 / USDT0 = ${oraclePrice.toLocaleString(
                    undefined,
                    {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    },
                  )}`}
                  simpleValue
                />
                <MarketAttribute
                  label="Loan"
                  value="USDT0"
                  logo={LOGOS.USDT0}
                  href={`https://arbiscan.io/address/${USDT0}`}
                />
                <MarketAttribute
                  label="Created on"
                  value="2026-01-09"
                  simpleValue
                />
                <MarketAttribute
                  label="Liquidation LTV"
                  value={`${lltv.toFixed(0)}%`}
                  simpleValue
                  hasInfo
                  infoText="The Loan-to-Value ratio at which your position becomes eligible for liquidation."
                />
                <MarketAttribute
                  label="Utilization"
                  value={
                    marketState &&
                    marketState.length >= 3 &&
                    Number(marketState[0]) > 0
                      ? `${((Number(marketState[2]) / Number(marketState[0])) * 100).toFixed(2)}%`
                      : "0.00%"
                  }
                  simpleValue
                  hasInfo
                  infoText="The percentage of the total pool that is currently being borrowed by all users."
                />
              </div>
            </div>

            <div className="pt-8 border-t border-zinc-800/50">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <h3 className="text-xl font-medium text-white">
                  Risk Considerations
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RiskCard
                  icon={<Scale className="h-4 w-4 text-amber-500" />}
                  title="Liquidation Risk"
                  description={`If your LTV exceeds ${lltv.toFixed(0)}%, your collateral (XAUt0) can be seized. Maintain a safe margin.`}
                />
                <RiskCard
                  icon={<ShieldAlert className="h-4 w-4 text-blue-500" />}
                  title="Oracle Risk"
                  description="Relies on an external price feed. Inaccurate data can lead to premature liquidations."
                />
                <RiskCard
                  icon={<Droplets className="h-4 w-4 text-emerald-500" />}
                  title="Liquidity Risk"
                  description="Low liquidity may impact rates or prevent borrowing further USDT0."
                />
                <RiskCard
                  icon={<Users className="h-4 w-4 text-purple-500" />}
                  title="Counterparty Risk"
                  description="Exposure to XAUt0 and USDT0. Risks include stablecoin de-pegging."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
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
                    Supply{" "}
                    {sidebarMode === "borrow" ? "Collateral" : "to Repay"} XAUt0
                  </span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
                    <Image
                      src={LOGOS.XAUt0}
                      alt="XAUt0"
                      width={16}
                      height={16}
                    />
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
                    {(
                      Number(supplyAmount || 0) * pythPrices.XAUt0
                    ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                  <span className="text-zinc-400 font-medium">
                    Borrow USDT0
                  </span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white overflow-hidden p-0.5">
                    <Image
                      src={LOGOS.USDT0}
                      alt="USDT0"
                      width={16}
                      height={16}
                    />
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
                    <Image
                      src={LOGOS.USDT0}
                      alt="USDT0"
                      width={16}
                      height={16}
                    />
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
                      const amount = Math.min(
                        Number(balances.loan),
                        userBorrow,
                      );
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
                    {(
                      Number(repayAmount || 0) * pythPrices.USDT0
                    ).toLocaleString()}
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
                    <Image
                      src={LOGOS.XAUt0}
                      alt="XAUt0"
                      width={16}
                      height={16}
                    />
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
                {(supplyAmount ||
                  borrowAmount ||
                  repayAmount ||
                  withdrawAmount) &&
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
              <span className="text-emerald-400 font-medium">
                {borrowRate}%
              </span>
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
              ) : (Number(borrowAmount) > userBorrow &&
                  projectedCollateral <= 0) ||
                (projectedLTV >= lltv && projectedBorrow > userBorrow) ? (
                "Insufficient Collateral"
              ) : Number(supplyAmount || 0) <= 0 &&
                Number(borrowAmount || 0) <= 0 ? (
                "Enter an amount"
              ) : Number(supplyAmount || 0) > 0 &&
                Number(borrowAmount || 0) > 0 ? (
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
            ) : Number(repayAmount || 0) > 0 &&
              Number(withdrawAmount || 0) > 0 ? (
              "Repay & Withdraw"
            ) : Number(repayAmount || 0) > 0 ? (
              "Repay Loan"
            ) : (
              "Withdraw Collateral"
            )}
          </motion.button>
        </div>
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

function MarketAttribute({
  label,
  value,
  logo,
  simpleValue,
  hasInfo,
  infoText,
  href,
  onCopy,
}: any) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
      <div className="text-zinc-400 text-sm flex items-center gap-1">
        <span>{label}</span>
        {hasInfo && (
          <div
            className="relative"
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <Info className="h-3 w-3 cursor-help hover:text-white transition-colors" />
            <AnimatePresence>
              {showInfo && (
                <motion.div
                  initial={{ opacity: 0, y: 5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 5, scale: 0.95 }}
                  className="absolute left-0 bottom-full mb-2 w-48 z-50 p-3 rounded-xl bg-[#0A0A0A] border border-white/10 shadow-2xl text-[11px] font-normal leading-relaxed text-zinc-400 pointer-events-none"
                >
                  {infoText || "More information about this attribute."}
                  <div className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/5" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      {simpleValue ? (
        <div className="flex items-center gap-2">
          <span className="text-white text-sm font-medium">{value}</span>
          {onCopy && (
            <Copy
              className="h-3.5 w-3.5 text-zinc-500 cursor-pointer hover:text-white transition-colors"
              onClick={onCopy}
            />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full overflow-hidden flex items-center justify-center">
            {logo && <Image src={logo} alt={value} width={20} height={20} />}
          </div>
          <span className="text-white text-sm font-medium">{value}</span>
          {href && (
            <a href={href} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3 text-zinc-500 hover:text-white transition-colors" />
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function MetricStat({ label, value, subValue, info, isLoading }: any) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative group/metric">
      <div className="flex items-center gap-1 text-zinc-500 text-sm mb-1">
        <span>{label}</span>
        <div
          className="relative"
          onMouseEnter={() => setShowInfo(true)}
          onMouseLeave={() => setShowInfo(false)}
        >
          <Info className="h-3 w-3 cursor-help hover:text-white transition-colors" />
          <AnimatePresence>
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                className="absolute left-0 bottom-full mb-2 w-48 z-50 p-3 rounded-xl bg-zinc-950 border border-white/10 shadow-2xl text-[11px] font-normal leading-relaxed text-zinc-400 pointer-events-none"
              >
                {info}
                <div className="absolute left-2 top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white/5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="text-3xl font-medium text-white">
        {isLoading ? "..." : value}
      </div>
      {subValue && (
        <div className="text-sm text-zinc-500">
          {isLoading ? "..." : subValue}
        </div>
      )}
    </div>
  );
}

function SummaryRow({ label, value, logo }: any) {
  return (
    <div className="flex justify-between text-sm items-center">
      <div className="flex items-center gap-2 text-zinc-400">
        <div className="h-4 w-4 rounded-full overflow-hidden flex items-center justify-center">
          {logo && <Image src={logo} alt={label} width={16} height={16} />}
        </div>
        <span>{label}</span>
      </div>
      <span className="text-white">{value}</span>
    </div>
  );
}

function RiskCard({ icon, title, description }: any) {
  return (
    <div className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
    </div>
  );
}
