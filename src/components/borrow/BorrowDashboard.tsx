import { useState, useEffect, useCallback } from "react";
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
import { LOGOS, arbitrum } from "@/constants/config";
import {
  getTokenBalances,
  getMorphoMarketData,
  getBorrowRate,
  getOraclePrice,
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
  const [repayMax, setRepayMax] = useState(false);

  const [activeTab, setActiveTab] = useState("Your Position");
  const [actionType, setActionType] = useState<"borrow" | "repay">("borrow");
  const [history, setHistory] = useState<any[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("vaultx_history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem("vaultx_history", JSON.stringify(history));
    }
  }, [history]);

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
        const parsedRepay = isRepayMax
          ? BigInt(
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            )
          : parseUnits(rAmt, 6);
        const sharesToRepay = isRepayMax
          ? BigInt(
              "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
            )
          : BigInt(0);

        calls.push({
          to: USDT0 as Address,
          data: encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "approve",
            args: [MORPHO_ADDRESS, parsedRepay],
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
              BigInt(0),
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
        const parsedWithdraw = parseUnits(wAmt, 6);
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
            nonce: 1,
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
      fetchData();
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
      : projectedBorrow > 0
        ? 1000
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
              <Image src={LOGOS.XAUT0} alt="XAUT0" width={48} height={48} />
            </div>
          </div>
          <h1 className="text-4xl font-light text-white">
            XAUT0 <span className="text-zinc-500">/</span> USDT0
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

        <div className="grid grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1 text-zinc-500 text-sm mb-1">
              Total Market Size <Info className="h-3 w-3" />
            </div>
            <div className="text-3xl font-medium text-white">
              {isLoading ? "..." : `$${totalMarketSize.toFixed(2)}`}
            </div>
            <div className="text-sm text-zinc-500">
              {isLoading ? "..." : `${totalMarketSize.toFixed(2)} USDT0`}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-zinc-500 text-sm mb-1">
              Total Liquidity <Info className="h-3 w-3" />
            </div>
            <div className="text-3xl font-medium text-white">
              {isLoading ? "..." : `$${totalLiquidity.toFixed(2)}`}
            </div>
            <div className="text-sm text-zinc-500">
              {isLoading ? "..." : `${totalLiquidity.toFixed(2)} USDT0`}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-zinc-500 text-sm mb-1">
              Rate <Info className="h-3 w-3" />
            </div>
            <div className="text-3xl font-medium text-white">
              {isLoading ? "..." : `${borrowRate}%`}
            </div>
          </div>
        </div>

        <div className="flex gap-8 border-b border-zinc-800 pb-4">
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
          <div className="space-y-12">
            <div className="grid grid-cols-2 gap-x-20 gap-y-10 pt-4">
              {/* Left Column Stats */}
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
                  <span className="text-zinc-400 text-sm">Collateral</span>
                  <div className="flex items-center gap-2">
                    <Image
                      src={LOGOS.XAUT0}
                      alt="XAUT0"
                      width={16}
                      height={16}
                    />
                    <span className="text-white font-medium">
                      {userCollateral.toFixed(6)} XAUT0
                    </span>
                    <span className="text-zinc-500 text-xs">
                      ${(userCollateral * oraclePrice).toFixed(2)}
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

            {/* Position Management Actions */}
            <div className="pt-8 border-t border-zinc-800">
              <h3 className="text-white text-xl font-light mb-6">
                Manage Position
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Repay Section */}
                <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Repay Loan</span>
                    <Image
                      src={LOGOS.USDT0}
                      alt="USDT0"
                      width={16}
                      height={16}
                    />
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={repayAmount}
                      onChange={(e) => {
                        setActionType("repay");
                        setRepayAmount(e.target.value);
                        setRepayMax(false);
                      }}
                      className="bg-transparent text-xl text-white outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => {
                        setActionType("repay");
                        setRepayAmount(
                          Math.min(
                            Number(balances.loan),
                            userBorrow,
                          ).toString(),
                        );
                        setRepayMax(true);
                      }}
                      className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      handleAction({
                        type: "repay",
                        repay: repayAmount,
                        actionId: "repay",
                        repayMax: repayMax,
                      })
                    }
                    disabled={
                      !repayAmount ||
                      Number(repayAmount) <= 0 ||
                      isExecuting ||
                      Number(repayAmount) > Number(balances.loan)
                    }
                    className="w-full py-2 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-zinc-100 transition-colors disabled:cursor-not-allowed"
                  >
                    {executingAction === "repay" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Executing...
                      </div>
                    ) : Number(repayAmount) > Number(balances.loan) ? (
                      "Insufficient USDT"
                    ) : (
                      "Repay"
                    )}
                  </button>
                </div>

                {/* Add Collateral Section */}
                <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">
                      Add Collateral
                    </span>
                    <Image
                      src={LOGOS.XAUT0}
                      alt="XAUT0"
                      width={16}
                      height={16}
                    />
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={supplyAmount}
                      onChange={(e) => {
                        setActionType("borrow"); // Using borrow for supply
                        setSupplyAmount(e.target.value);
                      }}
                      className="bg-transparent text-xl text-white outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() => setSupplyAmount(balances.collateral)}
                      className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      handleAction({
                        type: "borrow",
                        supply: supplyAmount,
                        borrow: "0",
                        actionId: "add-collateral",
                      })
                    }
                    disabled={
                      !supplyAmount ||
                      Number(supplyAmount) <= 0 ||
                      isExecuting ||
                      Number(supplyAmount) > Number(balances.collateral)
                    }
                    className="w-full py-2 bg-white text-black rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer"
                  >
                    {executingAction === "add-collateral" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Executing...
                      </div>
                    ) : Number(supplyAmount) > Number(balances.collateral) ? (
                      "Insufficient XAUT"
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>

                {/* Withdraw Section */}
                <div className="p-6 rounded-3xl bg-zinc-900/40 border border-white/5 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">
                      Withdraw Collateral
                    </span>
                    <Image
                      src={LOGOS.XAUT0}
                      alt="XAUT0"
                      width={16}
                      height={16}
                    />
                  </div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <input
                      type="number"
                      placeholder="0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="bg-transparent text-xl text-white outline-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      onClick={() =>
                        setWithdrawAmount(
                          userBorrow > 0
                            ? (maxWithdrawable * 0.999).toFixed(6)
                            : userCollateral.toFixed(6),
                        )
                      }
                      className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer"
                    >
                      MAX
                    </button>
                  </div>
                  <button
                    onClick={() =>
                      handleAction({
                        withdraw: withdrawAmount,
                        actionId: "withdraw",
                      })
                    }
                    disabled={
                      !withdrawAmount ||
                      Number(withdrawAmount) <= 0 ||
                      isExecuting ||
                      Number(withdrawAmount) > userCollateral ||
                      (projectedLTV > lltv + 0.01 && userBorrow > 0)
                    }
                    className="w-full py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-sm font-bold disabled:opacity-50 cursor-pointer hover:bg-emerald-500/20 transition-colors disabled:cursor-not-allowed"
                  >
                    {executingAction === "withdraw" ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Executing...
                      </div>
                    ) : Number(withdrawAmount) > userCollateral ? (
                      "Exceeds Collateral"
                    ) : projectedLTV > lltv + 0.01 ? (
                      "LTV Limit"
                    ) : (
                      "Withdraw"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "Activity" && (
          <div className="space-y-6 pt-4">
            <h3 className="text-xl text-white font-light">Your Transactions</h3>
            <div className="rounded-3xl border border-white/5 bg-zinc-900/20 overflow-hidden min-h-[300px]">
              {history.length === 0 ? (
                <div className="flex items-center justify-center h-[300px]">
                  <span className="text-zinc-500 text-sm">
                    No transactions found.
                  </span>
                </div>
              ) : (
                <div className="w-full">
                  {history.map((tx, i) => (
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
                          View on Arbiscan <ExternalLink className="h-3 w-3" />
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
                  value="XAUT0"
                  logo={LOGOS.XAUT0}
                  href={`https://arbiscan.io/address/${XAUT0}`}
                />
                <MarketAttribute
                  label="Oracle price"
                  value={`XAUT0 / USDT0 = ${oraclePrice.toLocaleString(
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
                  description={`If your LTV exceeds ${lltv.toFixed(0)}%, your collateral (XAUT0) can be seized. Maintain a safe margin.`}
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
                  description="Exposure to XAUT0 and USDT0. Risks include stablecoin de-pegging."
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-xl space-y-6">
          <div className="flex gap-2">
            <div className="flex-1 rounded-full py-2 text-sm font-medium bg-zinc-800/80 text-white text-center">
              Borrow
            </div>
          </div>

          {/* Supply Input */}
          <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Supply Collateral XAUT0</span>
              <div className="flex items-center gap-1 overflow-hidden rounded-full">
                <Image src={LOGOS.XAUT0} alt="XAUT0" width={16} height={16} />
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
                className="w-full bg-transparent text-2xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <button
                onClick={() => setSupplyAmount(balances.collateral)}
                className="text-xs bg-zinc-800 text-zinc-400 px-2 py-1 rounded hover:bg-zinc-700 hover:text-white cursor-pointer"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <div className="flex flex-col gap-1">
                <span>
                  $
                  {(Number(supplyAmount || 0) * oraclePrice).toLocaleString(
                    undefined,
                    { maximumFractionDigits: 2 },
                  )}
                </span>
                {Number(supplyAmount) > Number(balances.collateral) && (
                  <span className="text-red-400 font-bold">
                    Exceeds balance
                  </span>
                )}
              </div>
              <span
                className={cn(
                  Number(supplyAmount) > Number(balances.collateral)
                    ? "text-red-400"
                    : "text-zinc-500",
                )}
              >
                Available: {Number(balances.collateral).toFixed(6)} XAUT0
              </span>
            </div>
          </div>

          {/* Borrow Input */}
          <div className="rounded-2xl bg-zinc-900/50 p-4 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Borrow USDT0</span>
              <div className="flex items-center gap-1 overflow-hidden rounded-full">
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
                className="w-full bg-transparent text-2xl font-medium text-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
              />
              <button
                onClick={() => setBorrowAmount(totalLiquidity.toString())}
                className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors"
              >
                MAX
              </button>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <div className="flex flex-col gap-1">
                <span>${Number(borrowAmount || 0).toLocaleString()}</span>
                {Number(borrowAmount) > totalLiquidity && (
                  <span className="text-red-400 font-bold">
                    Exceeds liquidity
                  </span>
                )}
              </div>
              <span
                className={cn(
                  Number(borrowAmount) > totalLiquidity
                    ? "text-red-400"
                    : "text-zinc-500",
                )}
              >
                Available: {totalLiquidity.toFixed(2)} USDT0
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="space-y-3 pt-2">
            <SummaryRow
              label="Collateral (XAUT0)"
              value={`${userCollateral.toFixed(6)} → ${projectedCollateral.toFixed(6)}`}
              logo={LOGOS.XAUT0}
            />
            <SummaryRow
              label="Loan (USDT0)"
              value={`${userBorrow.toFixed(2)} → ${projectedBorrow.toFixed(2)}`}
              logo={LOGOS.USDT0}
            />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">LTV</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">
                  {currentLTV > 0 ? currentLTV.toFixed(2) : "0"}%
                </span>
                <span className="text-zinc-600">→</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "font-medium",
                      isDanger
                        ? "text-red-400"
                        : isAtRisk
                          ? "text-amber-400"
                          : "text-emerald-400",
                    )}
                  >
                    {projectedLTV > 0 ? projectedLTV.toFixed(2) : "0"}%
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Rate</span>
              <span className="text-white">{borrowRate}%</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActionType("borrow");
              handleAction();
            }}
            disabled={
              isExecuting ||
              (!supplyAmount && !borrowAmount) ||
              Number(supplyAmount) > Number(balances.collateral) ||
              Number(borrowAmount) > totalLiquidity ||
              (projectedLTV >= lltv && projectedBorrow > userBorrow) // Only block if LTV increases or stays high while borrowing
            }
            className={cn(
              "w-full rounded-xl py-3 text-medium font-bold transition-all flex items-center justify-center gap-2",
              isExecuting ||
                (!supplyAmount && !borrowAmount) ||
                Number(supplyAmount) > Number(balances.collateral) ||
                Number(borrowAmount) > totalLiquidity ||
                (projectedLTV > lltv + 0.01 && projectedBorrow > userBorrow)
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-emerald-500 text-black hover:bg-emerald-400",
            )}
          >
            {executingAction === "main" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : Number(supplyAmount) > Number(balances.collateral) ? (
              "Insufficient Balance"
            ) : Number(borrowAmount) > totalLiquidity ? (
              "Insufficient Liquidity"
            ) : projectedLTV >= lltv && projectedBorrow > userBorrow ? (
              "Loan Too High (LTV Limit)"
            ) : !supplyAmount && !borrowAmount ? (
              "Enter Amount"
            ) : (
              "Confirm Transaction"
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
  href,
  onCopy,
}: any) {
  return (
    <div className="flex justify-between items-center border-b border-zinc-800/50 pb-4">
      <span className="text-zinc-400 text-sm flex items-center gap-1">
        {label} {hasInfo && <Info className="h-3 w-3" />}
      </span>
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
