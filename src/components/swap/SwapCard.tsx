"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  ArrowDown,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  Fuel,
  Info,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  parseUnits,
  formatUnits,
  Address,
  Hex,
  encodeFunctionData,
} from "viem";
import {
  useSign7702Authorization,
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth";
import { AAService, bigIntReplacer } from "@/services/account-abstraction";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";
import { publicClient } from "@/lib/blockchain/client";
import { ROUTER_ABI, QUOTER_ABI } from "@/constants/abis";
import {
  USDT0,
  XAUT0,
  V3_QUOTER,
  SWAP_ROUTER_02,
  BICONOMY_NEXUS_V1_2_0,
} from "@/constants/addresses";
import { LOGOS, DEFAULT_FEE, arbitrum, APP_CONFIG } from "@/constants/config";
import { getTokenBalances, getLatestPythPrice } from "@/lib/blockchain/utils";

type TokenInfo = {
  symbol: "USDT0" | "XAUt0";
  address: `0x${string}`;
  decimals: number;
};

export function SwapCard() {
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0];
  const address = wallet?.address;

  // Swap setup
  const [tokenIn, setTokenIn] = useState<TokenInfo>({
    symbol: "USDT0",
    address: USDT0,
    decimals: 6,
  });
  const [tokenOut, setTokenOut] = useState<TokenInfo>({
    symbol: "XAUt0",
    address: XAUT0,
    decimals: 6,
  });

  // Amounts
  const [sellAmount, setSellAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("");

  // Balances
  const [balanceIn, setBalanceIn] = useState("0.00");
  const [balanceOut, setBalanceOut] = useState("0.00");

  // Raw BigInt Balances for logic
  const [rawBalanceIn, setRawBalanceIn] = useState(BigInt(0));
  const [rawBalanceOut, setRawBalanceOut] = useState(BigInt(0));

  // UI States
  const [isQuoting, setIsQuoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    txHash?: string;
  } | null>(null);

  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slippage, setSlippage] = useState("5.0"); // 5% default
  const [deadlineMinutes, setDeadlineMinutes] = useState("30"); // 30 min default
  const [history, setHistory] = useState<any[]>([]);
  const [pythPrices, setPythPrices] = useState<{
    XAUt0: number;
    USDT0: number;
  }>({ XAUt0: 0, USDT0: 1 });

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
      setHistory([]);
    }
  }, [address]);

  // Fetch Pyth Prices
  const fetchPrices = useCallback(async () => {
    try {
      const [pXAUT, pUSDT] = await Promise.all([
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt0),
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT0),
      ]);
      if (pXAUT > 0 && pUSDT > 0) {
        setPythPrices({ XAUt0: pXAUT, USDT0: pUSDT });
      }
    } catch (err) {
      console.error("Failed to fetch Pyth prices:", err);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [fetchPrices]);

  // Save history to localStorage
  useEffect(() => {
    if (address && history.length > 0) {
      localStorage.setItem(
        `vaultx_history_${address}`,
        JSON.stringify(history),
      );
    }
  }, [history, address]);

  /**
   * Fetches user balances for both tokens
   */
  const fetchBalances = useCallback(async () => {
    if (!address) return;
    try {
      const [bIn, bOut] = await getTokenBalances(address as Address, [
        tokenIn.address as Address,
        tokenOut.address as Address,
      ]);

      setRawBalanceIn(bIn);
      setRawBalanceOut(bOut);

      setBalanceIn(
        tokenIn.symbol === "XAUt0"
          ? Number(formatUnits(bIn, tokenIn.decimals)) < 0.0001 &&
            Number(formatUnits(bIn, tokenIn.decimals)) > 0
            ? "< 0.0001"
            : Number(formatUnits(bIn, tokenIn.decimals)).toFixed(4)
          : Number(formatUnits(bIn, tokenIn.decimals)).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ),
      );
      setBalanceOut(
        tokenOut.symbol === "XAUt0"
          ? Number(formatUnits(bOut, tokenOut.decimals)) < 0.0001 &&
            Number(formatUnits(bOut, tokenOut.decimals)) > 0
            ? "< 0.0001"
            : Number(formatUnits(bOut, tokenOut.decimals)).toFixed(4)
          : Number(formatUnits(bOut, tokenOut.decimals)).toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ),
      );
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }, [address, tokenIn, tokenOut]);

  /**
   * Checks if input exceeds balance
   */
  const isInsufficientBalance = !!(
    sellAmount &&
    Number(sellAmount) > 0 &&
    parseUnits(sellAmount, tokenIn.decimals) > rawBalanceIn
  );

  /**
   * Sets sell amount to full balance
   */
  const setMaxBalance = () => {
    const formatted = formatUnits(rawBalanceIn, tokenIn.decimals);
    setSellAmount(formatted);
  };

  /**
   * Fetches the quote from Uniswap V3 Quoter
   */
  const fetchQuote = useCallback(
    async (amount: string) => {
      const inputVal = Number(amount);
      if (!amount || isNaN(inputVal) || inputVal <= 0) {
        setBuyAmount("");
        setError(null);
        return;
      }

      setIsQuoting(true);
      setError(null);

      try {
        const parsedAmountIn = parseUnits(amount, tokenIn.decimals);

        const { result } = await publicClient.simulateContract({
          address: V3_QUOTER,
          abi: QUOTER_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            tokenIn.address,
            tokenOut.address,
            DEFAULT_FEE,
            parsedAmountIn,
            BigInt(0),
          ],
        });

        const formattedAmountOut = formatUnits(result, tokenOut.decimals);
        setBuyAmount(Number(formattedAmountOut).toFixed(tokenOut.decimals));
      } catch (err: any) {
        console.error("[Swap] Quote failed:", err);
        setError("No liquidity or route found");
        setBuyAmount("");
      } finally {
        setIsQuoting(false);
      }
    },
    [tokenIn, tokenOut],
  );

  /**
   * Performs the swap using Universal Router and 7702 (if needed)
   */
  const handleSwap = async () => {
    if (!address || !sellAmount || !buyAmount) return;

    setIsExecuting(true);
    setNotification(null);
    setError(null);
    try {
      // 1. Check if wallet already has code (is already a smart account)
      const bytecode = await publicClient.getBytecode({
        address: address as Address,
      });
      const hasCode = bytecode !== undefined && bytecode !== "0x";

      let authorization;

      if (!hasCode) {
        // Sign 7702 authorization only if the wallet has no code
        authorization = await signAuthorization(
          {
            contractAddress: BICONOMY_NEXUS_V1_2_0,
            chainId: arbitrum.id,
            nonce: 0,
          },
          { address: address as Address },
        );
      }
      // 2. Prepare calls (Approve + Swap)
      const parsedAmountIn = parseUnits(sellAmount, tokenIn.decimals);

      const approveData = encodeFunctionData({
        abi: [
          {
            name: "approve",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [SWAP_ROUTER_02 as Address, parsedAmountIn],
      });

      const swapData = encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: "exactInputSingle",
        args: [
          {
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            fee: DEFAULT_FEE,
            recipient: address as Address,
            deadline: BigInt(
              Math.floor(Date.now() / 1000) +
                Number(deadlineMinutes || 30) * 60,
            ),
            amountIn: parsedAmountIn,
            amountOutMinimum: buyAmount
              ? (parseUnits(buyAmount, tokenOut.decimals) *
                  BigInt(
                    Math.floor((1 - Number(slippage || 5) / 100) * 10000),
                  )) /
                BigInt(10000)
              : BigInt(0),
            sqrtPriceLimitX96: BigInt(0),
          },
        ],
      });

      const calls = [
        {
          to: tokenIn.address as Address,
          data: approveData,
          value: BigInt(0),
        },
        {
          to: SWAP_ROUTER_02 as Address,
          data: swapData,
          value: BigInt(0),
        },
      ];

      // 3. Prepare UserOp
      const userOp = await AAService.prepare(
        address as Address,
        calls,
        authorization ? authorization : undefined,
      );

      // 4. Sign UserOp hash
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

      // 5. Submit to relay
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
            authorization: authorization ? authorization : null,
          },
          bigIntReplacer,
        ),
      });

      const { txHash, error: relayError } = await response.json();
      if (relayError) throw new Error(relayError);

      console.log("Swap successful! Tx Hash:", txHash);

      setNotification({
        type: "success",
        message: "Transaction sent! Waiting for confirmation...",
        txHash: txHash,
      });

      // Wait for transaction to be mined
      await publicClient.waitForTransactionReceipt({ hash: txHash as Hex });

      setNotification({
        type: "success",
        message: "Swap confirmed!",
        txHash: txHash,
      });

      // Add to history
      setHistory((prev) => [
        {
          id: txHash,
          type: "swap",
          tokenIn: tokenIn.symbol,
          tokenOut: tokenOut.symbol,
          amountIn: sellAmount,
          amountOut: buyAmount,
          timestamp: new Date().toLocaleTimeString(),
          status: "success",
        },
        ...prev,
      ]);

      fetchBalances();
      setSellAmount("");
      setBuyAmount("");
    } catch (err: any) {
      console.error("Swap failed:", err);
      const msg = err.message || "Swap failed";
      setError(msg);
      setNotification({
        type: "error",
        message: msg,
      });
    } finally {
      setIsExecuting(false);
    }
  };

  /**
   * Switches tokenIn and tokenOut
   */
  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setSellAmount("");
    setBuyAmount("");
  };

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchQuote(sellAmount);
    }, 450);
    return () => clearTimeout(handler);
  }, [sellAmount, fetchQuote]);

  return (
    <div className="w-full max-w-[480px] group relative">
      <div className="absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/20 to-blue-500/20 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative rounded-[2rem] border border-white/10 bg-black/40 p-5 backdrop-blur-3xl md:p-7 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <RefreshCw className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Swap
            </h2>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`rounded-xl p-2 transition-colors ${showSettings ? "bg-emerald-500/20 text-emerald-400" : "text-zinc-500 hover:bg-white/5 hover:text-white"}`}
            >
              <Settings className="h-5 w-5" />
            </button>

            {/* Settings Dropdown */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 top-full z-[60] mt-2 w-72 origin-top-right overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
                >
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Max Slippage
                      </span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={slippage}
                          min="0.1"
                          max="50"
                          step="0.1"
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) setSlippage("");
                            else
                              setSlippage(
                                Math.min(50, Math.max(0, val)).toString(),
                              );
                          }}
                          className="w-16 bg-white/5 rounded-lg px-2 py-1 text-right text-xs font-mono text-emerald-400 outline-none border border-white/5 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="ml-1 text-[10px] text-zinc-500">
                          %
                        </span>
                      </div>
                    </div>
                    {Number(slippage) > 5 && (
                      <p className="text-[9px] font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md text-center">
                        ⚠️ High slippage may result in unfavorable rates
                      </p>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        Transaction Deadline
                      </span>
                      <div className="relative flex items-center">
                        <input
                          type="number"
                          value={deadlineMinutes}
                          min="1"
                          max="4320"
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (isNaN(val)) setDeadlineMinutes("");
                            else
                              setDeadlineMinutes(
                                Math.min(4320, Math.max(1, val)).toString(),
                              );
                          }}
                          className="w-16 bg-white/5 rounded-lg px-2 py-1 text-right text-xs font-mono text-emerald-400 outline-none border border-white/5 focus:border-emerald-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="ml-1 text-[10px] text-zinc-500">
                          m
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {["0.5", "1.0", "5.0"].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSlippage(s)}
                          className={`flex-1 rounded-lg py-1 text-[10px] font-black transition-all ${slippage === s ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-zinc-500 border border-transparent hover:border-white/10"}`}
                        >
                          {s}%
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Sell Section */}
        <div className="relative transition-all duration-300">
          <div
            className={`rounded-3xl bg-white/[0.03] p-5 border transition-colors ${isInsufficientBalance ? "border-red-500/50" : "border-white/5 hover:border-white/10"}`}
          >
            <div className="mb-3 flex justify-between text-sm font-medium">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
                Sell
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`font-mono text-[11px] transition-colors ${isInsufficientBalance ? "text-red-400" : "text-zinc-600"}`}
                >
                  Balance: {balanceIn} {tokenIn.symbol}
                </span>
                <button
                  onClick={setMaxBalance}
                  className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-tighter bg-emerald-500/10 px-1.5 py-0.5 rounded"
                >
                  Max
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <input
                type="number"
                placeholder="0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className={`w-full bg-transparent text-3xl md:text-4xl font-semibold placeholder-zinc-800 outline-none transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isInsufficientBalance ? "text-red-400" : "text-white"}`}
              />
              <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10 transition-all border border-white/5 group/asset cursor-pointer">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xl">
                  <Image
                    src={LOGOS[tokenIn.symbol]}
                    alt={tokenIn.symbol}
                    width={24}
                    height={24}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-bold text-white tracking-tight">
                  {tokenIn.symbol}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Divider / Switch Icon */}
        <div className="relative -my-4 z-10 flex justify-center">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9, rotate: 180 }}
            onClick={switchTokens}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-[#050505] text-zinc-400 shadow-2xl hover:text-emerald-400 transition-colors"
          >
            <ArrowDown className="h-5 w-5" />
          </motion.div>
        </div>

        {/* Buy Section */}
        <div className="mt-2">
          <div className="rounded-3xl bg-white/[0.03] p-5 border border-white/5 hover:border-white/10 transition-colors">
            <div className="mb-3 flex justify-between text-sm font-medium">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">
                Buy
              </span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-mono text-[11px]">
                  Balance: {balanceOut} {tokenOut.symbol}
                </span>
                <AnimatePresence>
                  {isQuoting && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <RefreshCw className="h-3 w-3 animate-spin text-emerald-400/60" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-3xl md:text-4xl font-semibold text-white/90">
                {buyAmount || (isQuoting ? "..." : "0")}
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10 transition-all border border-white/5 group/asset cursor-pointer">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xl">
                  <Image
                    src={LOGOS[tokenOut.symbol]}
                    alt={tokenOut.symbol}
                    width={24}
                    height={24}
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-bold text-white tracking-tight">
                  {tokenOut.symbol}
                </span>
              </div>
            </div>

            <div className="mt-3 flex justify-between items-center h-4">
              <span className="text-[11px] text-zinc-600 font-medium">
                ~$
                {(Number(sellAmount || 0) * pythPrices[tokenIn.symbol]).toFixed(
                  2,
                )}
              </span>
              {error && (
                <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest">
                  {error}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <motion.button
          whileHover={{
            scale: 1.01,
            backgroundColor: isInsufficientBalance ? "#ef4444" : "#10b981",
          }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSwap}
          disabled={
            !sellAmount ||
            Number(sellAmount) <= 0 ||
            !!error ||
            isQuoting ||
            isExecuting ||
            isInsufficientBalance
          }
          className={`mt-8 w-full relative overflow-hidden rounded-2xl py-4 text-lg font-black transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
            isInsufficientBalance
              ? "bg-red-500 text-white shadow-[0_20px_40px_-15px_rgba(239,68,68,0.3)]"
              : "bg-emerald-500 text-black shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]"
          }`}
        >
          {isExecuting ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Executing...</span>
            </div>
          ) : isInsufficientBalance ? (
            `Insufficient ${tokenIn.symbol} balance`
          ) : error ? (
            "No Route"
          ) : Number(sellAmount) > 0 ? (
            "Swap"
          ) : (
            "Enter amount"
          )}
        </motion.button>

        {/* Swap Details Dropdown */}
        <div className="relative mt-2 px-1">
          <button
            onClick={() => setShowDetails(!showDetails)}
            disabled={!sellAmount || !buyAmount}
            className="group flex w-full items-center justify-between py-2 text-[11px] transition-colors hover:text-white disabled:opacity-0"
          >
            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors font-medium">
              <span>
                1 {tokenIn.symbol} ={" "}
                {sellAmount && buyAmount
                  ? (Number(buyAmount) / Number(sellAmount)).toFixed(6)
                  : "0.00"}{" "}
                {tokenOut.symbol}
              </span>
              <span className="text-zinc-600">
                ($
                {pythPrices[tokenIn.symbol].toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}
                )
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400 group-hover:text-white transition-colors">
              <Fuel className="h-3.5 w-3.5" />
              <span className="font-mono text-[10px]">$0.05</span>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </div>
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute inset-x-0 top-full z-[60] mt-2 overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0A] shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl"
              >
                <div className="space-y-2.5 p-5">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span>Fee</span>
                      <Info className="h-2.5 w-2.5" />
                    </div>
                    <span className="font-bold text-pink-500">Free</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span>Order routing</span>
                      <Info className="h-2.5 w-2.5" />
                    </div>
                    <span className="text-zinc-300 font-medium">
                      Uniswap API
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-zinc-500">
                      <span>Max slippage</span>
                      <Info className="h-2.5 w-2.5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase">
                        {Number(slippage) <= 5 ? "Auto" : "Custom"}
                      </span>
                      <span className="text-zinc-300 font-medium">
                        {slippage}%
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification Pop-up */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-5 bottom-5 z-50 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 shadow-2xl backdrop-blur-xl"
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
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <XCircle className="h-4 w-4" opacity={0.5} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
