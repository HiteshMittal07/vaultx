"use client";

import { useState, useEffect, useCallback } from "react";
import { Settings, ArrowDown, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { createPublicClient, http, parseUnits, formatUnits } from "viem";
import { arbitrum } from "viem/chains";
import { useWallets } from "@privy-io/react-auth";

/**
 * CONTRACT ADDRESSES & CONFIG
 */
const V3_QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const USDT0 = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const XAUT0 = "0x40461291347e1eCbb09499F3371D3f17f10d7159";
const DEFAULT_FEE = 500; 

const LOGOS = {
  USDT0: "https://cdn.morpho.org/assets/logos/usdt0.svg",
  XAUT0: "https://cdn.morpho.org/assets/logos/xaut0.svg",
} as const;

const ERC20_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

const QUOTER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "tokenIn", type: "address" },
      { internalType: "address", name: "tokenOut", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
      { internalType: "uint256", name: "amountIn", type: "uint256" },
      { internalType: "uint160", name: "sqrtPriceLimitX96", type: "uint160" },
    ],
    name: "quoteExactInputSingle",
    outputs: [{ internalType: "uint256", name: "amountOut", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

type TokenInfo = {
  symbol: "USDT0" | "XAUT0";
  address: `0x${string}`;
  decimals: number;
};

export function SwapCard() {
  const { wallets } = useWallets();
  const address = wallets[0]?.address;

  // Swap setup
  const [tokenIn, setTokenIn] = useState<TokenInfo>({ symbol: "USDT0", address: USDT0, decimals: 6 });
  const [tokenOut, setTokenOut] = useState<TokenInfo>({ symbol: "XAUT0", address: XAUT0, decimals: 6 });
  
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches user balances for both tokens
   */
  const fetchBalances = useCallback(async () => {
    if (!address) return;
    try {
      const [bIn, bOut] = await Promise.all([
        publicClient.readContract({
          address: tokenIn.address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
        publicClient.readContract({
          address: tokenOut.address,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        }),
      ]);
      
      setRawBalanceIn(bIn as bigint);
      setRawBalanceOut(bOut as bigint);
      
      setBalanceIn(Number(formatUnits(bIn as bigint, tokenIn.decimals)).toLocaleString(undefined, { minimumFractionDigits: 2 }));
      setBalanceOut(Number(formatUnits(bOut as bigint, tokenOut.decimals)).toLocaleString(undefined, { minimumFractionDigits: 2 }));
    } catch (err) {
      console.error("Balance fetch error:", err);
    }
  }, [address, tokenIn, tokenOut]);

  /**
   * Checks if input exceeds balance
   */
  const isInsufficientBalance = !!(sellAmount && Number(sellAmount) > 0 && parseUnits(sellAmount, tokenIn.decimals) > rawBalanceIn);

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
  const fetchQuote = useCallback(async (amount: string) => {
    const inputVal = Number(amount);
    if (!amount || isNaN(inputVal) || inputVal <= 0) {
      setBuyAmount("");
      setError(null);
      return;
    }

    setIsLoading(true);
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
      setIsLoading(false);
    }
  }, [tokenIn, tokenOut]);

  /**
   * Switches tokenIn and tokenOut
   */
  const switchTokens = () => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setSellAmount(""); 
    setBuyAmount(""); 
  };

  /**
   * Refresh effects
   */
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
      
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 p-5 backdrop-blur-3xl md:p-7 shadow-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <RefreshCw className="h-3.5 w-3.5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight">Swap</h2>
          </div>
          <button className="rounded-xl p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white">
            <Settings className="h-5 w-5" />
          </button>
        </div>

        {/* Sell Section */}
        <div className="relative transition-all duration-300">
          <div className={`rounded-3xl bg-white/[0.03] p-5 border transition-colors ${isInsufficientBalance ? 'border-red-500/50' : 'border-white/5 hover:border-white/10'}`}>
            <div className="mb-3 flex justify-between text-sm font-medium">
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Sell</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[11px] transition-colors ${isInsufficientBalance ? 'text-red-400' : 'text-zinc-600'}`}>
                  Balance: {balanceIn}
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
                type="text"
                placeholder="0"
                value={sellAmount}
                onChange={(e) => setSellAmount(e.target.value)}
                className={`w-full bg-transparent text-4xl font-semibold placeholder-zinc-800 outline-none transition-colors ${isInsufficientBalance ? 'text-red-400' : 'text-white'}`}
              />
              <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10 transition-all border border-white/5 group/asset cursor-pointer">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xl">
                  <Image src={LOGOS[tokenIn.symbol]} alt={tokenIn.symbol} width={24} height={24} className="h-full w-full object-contain" />
                </div>
                <span className="font-bold text-white tracking-tight">{tokenIn.symbol}</span>
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
              <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Buy</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-600 font-mono text-[11px]">Balance: {balanceOut}</span>
                <AnimatePresence>
                  {isLoading && (
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
              <div className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-4xl font-semibold text-white/90">
                {buyAmount || (isLoading ? "..." : "0")}
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-2xl bg-white/5 px-4 py-2 hover:bg-white/10 transition-all border border-white/5 group/asset cursor-pointer">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white p-0.5 shadow-xl">
                  <Image src={LOGOS[tokenOut.symbol]} alt={tokenOut.symbol} width={24} height={24} className="h-full w-full object-contain" />
                </div>
                <span className="font-bold text-white tracking-tight">{tokenOut.symbol}</span>
              </div>
            </div>
            
            <div className="mt-3 flex justify-between items-center h-4">
              <span className="text-[11px] text-zinc-600 font-medium">~$0.00</span>
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
          whileHover={{ scale: 1.01, backgroundColor: isInsufficientBalance ? "#ef4444" : "#10b981" }}
          whileTap={{ scale: 0.98 }}
          disabled={!sellAmount || Number(sellAmount) <= 0 || !!error || isLoading || isInsufficientBalance}
          className={`mt-8 w-full rounded-2xl py-4 text-lg font-black transition-all disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed ${
            isInsufficientBalance 
              ? 'bg-red-500 text-white shadow-[0_20px_40px_-15px_rgba(239,68,68,0.3)]' 
              : 'bg-emerald-500 text-black shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)]'
          }`}
        >
          {isInsufficientBalance 
            ? `Insufficient ${tokenIn.symbol} balance` 
            : error 
              ? "No Route" 
                : Number(sellAmount) > 0 
                ? "Swap" 
                : "Enter amount"}
        </motion.button>
      </div>
    </div>
  );
}
