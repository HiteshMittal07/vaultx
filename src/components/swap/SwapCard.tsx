"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpDown, Settings2 } from "lucide-react";
import { parseUnits, formatUnits, Address } from "viem";
import { useSignMessage, useWallets } from "@privy-io/react-auth";
import { USDT, XAUT } from "@/constants/addresses";
import { TokenInfo } from "@/types";
import {
  usePrices,
  useNotification,
  useTokenBalances,
  useTransactionExecution,
  useTransactionHistory,
} from "@/hooks";

import { SwapHeader } from "./SwapHeader";
import { SwapTokenInput } from "./SwapTokenInput";
import { SwapSettings } from "./SwapSettings";
import { SwapDetails } from "./SwapDetails";
import { SwapButton } from "./SwapButton";
import { useSwapQuote } from "./hooks/useSwapQuote";
import { InlineNotificationToast } from "@/components/ui/NotificationToast";

const TOKEN_USDT: TokenInfo = { symbol: "USDT", address: USDT, decimals: 6 };
const TOKEN_XAUT: TokenInfo = { symbol: "XAUt", address: XAUT, decimals: 6 };

export function SwapCard() {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0];
  const address = wallet?.address;

  const [tokenIn, setTokenIn] = useState<TokenInfo>(TOKEN_USDT);
  const [tokenOut, setTokenOut] = useState<TokenInfo>(TOKEN_XAUT);
  const [sellAmount, setSellAmount] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [slippage, setSlippage] = useState("5.0");
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");

  const { prices: pythPrices } = usePrices();
  const { saveTransaction } = useTransactionHistory(address);
  const { notification, showSuccess, showError, dismiss } = useNotification();
  const { data: balances, refetch: refetchBalances } = useTokenBalances(address as Address | undefined);

  const getBalance = useCallback(
    (token: TokenInfo) => {
      if (!balances) return { raw: BigInt(0), formatted: "0.00" };
      return token.symbol === "USDT" ? balances.usdt : balances.xaut;
    },
    [balances]
  );

  const balanceIn = getBalance(tokenIn);
  const balanceOut = getBalance(tokenOut);

  const formatBalanceDisplay = useCallback(
    (token: TokenInfo, balance: { raw: bigint; formatted: string }) => {
      const value = Number(balance.formatted);
      if (token.symbol === "XAUt") {
        return value < 0.0001 && value > 0 ? "< 0.0001" : value.toFixed(4);
      }
      return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    []
  );

  const { buyAmount, isQuoting, error, fetchQuote } = useSwapQuote(tokenIn, tokenOut);

  const isInsufficientBalance =
    !!sellAmount &&
    Number(sellAmount) > 0 &&
    parseUnits(sellAmount, tokenIn.decimals) > balanceIn.raw;

  const { isExecuting, executeSwap } = useTransactionExecution({
    address: address as Address | undefined,
    signMessage,
  });

  const handleSellAmountChange = useCallback(
    (amount: string) => {
      setSellAmount(amount);
      fetchQuote(amount);
    },
    [fetchQuote]
  );

  const handleMaxClick = useCallback(() => {
    const formatted = formatUnits(balanceIn.raw, tokenIn.decimals);
    handleSellAmountChange(formatted);
  }, [balanceIn.raw, tokenIn.decimals, handleSellAmountChange]);

  const handleSwap = useCallback(async () => {
    showSuccess("Transaction sent! Waiting for confirmation...");

    const result = await executeSwap({
      tokenIn: tokenIn.address,
      tokenOut: tokenOut.address,
      amountIn: sellAmount,
      decimalsIn: tokenIn.decimals,
      decimalsOut: tokenOut.decimals,
      slippage,
      deadline: deadlineMinutes,
    });

    if (result.success && result.txHash) {
      showSuccess("Swap confirmed!", result.txHash);
      saveTransaction({
        walletAddress: address!,
        action: "swap",
        txHash: result.txHash,
        executedBy: "user",
        tokenIn: tokenIn.address,
        tokenOut: tokenOut.address,
        amountIn: sellAmount,
        amountOut: buyAmount,
      });
      refetchBalances();
      setSellAmount("");
    } else if (result.error) {
      showError(result.error);
    }
  }, [executeSwap, sellAmount, buyAmount, slippage, deadlineMinutes, tokenIn, tokenOut, showSuccess, showError, saveTransaction, refetchBalances, address]);

  const switchTokens = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setSellAmount("");
  }, [tokenIn, tokenOut]);

  // Rate display
  const rate =
    sellAmount && buyAmount && Number(sellAmount) > 0
      ? (Number(buyAmount) / Number(sellAmount)).toFixed(6)
      : null;

  return (
    <div className="w-full max-w-[480px]">
      {/* Outer glow container */}
      <div className="relative group">
        {/* Animated border glow */}
        <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] opacity-100" />
        <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-br from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 opacity-0 blur-xl transition-all duration-700 group-hover:from-emerald-500/10 group-hover:via-teal-500/5 group-hover:to-blue-500/10 group-hover:opacity-100" />

        <div className="relative rounded-3xl border border-white/[0.08] bg-[#0A0A0A] p-5 md:p-6 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Swap</h2>
              <p className="text-xs text-zinc-600 mt-0.5">Instant · Gasless · Uniswap V3</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl border transition-all ${
                showSettings
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-white/[0.06] bg-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.06]"
              }`}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </div>

          {/* Settings panel */}
          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <SwapSettings
                  isOpen={showSettings}
                  slippage={slippage}
                  deadlineMinutes={deadlineMinutes}
                  onSlippageChange={setSlippage}
                  onDeadlineChange={setDeadlineMinutes}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sell input */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <SwapTokenInput
              label="Sell"
              token={tokenIn}
              amount={sellAmount}
              balance={formatBalanceDisplay(tokenIn, balanceIn)}
              isInsufficientBalance={isInsufficientBalance}
              pythPrices={pythPrices}
              onAmountChange={handleSellAmountChange}
              onMaxClick={handleMaxClick}
            />
          </div>

          {/* Switch button */}
          <div className="relative flex justify-center -my-3 z-10">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              transition={{ duration: 0.3 }}
              onClick={switchTokens}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0A0A0A] text-zinc-400 shadow-lg hover:text-emerald-400 hover:border-emerald-500/30 transition-colors"
            >
              <ArrowUpDown className="h-4 w-4" />
            </motion.button>
          </div>

          {/* Buy input */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden mt-1">
            <SwapTokenInput
              label="Buy"
              token={tokenOut}
              amount={buyAmount}
              balance={formatBalanceDisplay(tokenOut, balanceOut)}
              isQuoting={isQuoting}
              pythPrices={pythPrices}
              error={error}
              readOnly
            />
          </div>

          {/* Rate display */}
          <AnimatePresence>
            {rate && !isQuoting && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5"
              >
                <span className="text-xs text-zinc-500">Rate</span>
                <span className="text-xs font-medium text-zinc-300">
                  1 {tokenIn.symbol} = {rate} {tokenOut.symbol}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action button */}
          <div className="mt-4">
            <SwapButton
              sellAmount={sellAmount}
              isInsufficientBalance={isInsufficientBalance}
              isQuoting={isQuoting}
              isExecuting={isExecuting}
              error={error}
              tokenIn={tokenIn}
              onClick={handleSwap}
            />
          </div>

          {/* Swap details */}
          <SwapDetails
            isOpen={showDetails}
            sellAmount={sellAmount}
            buyAmount={buyAmount}
            slippage={slippage}
            tokenIn={tokenIn}
            tokenOut={tokenOut}
            pythPrices={pythPrices}
            onToggle={() => setShowDetails(!showDetails)}
          />

          {/* Notification */}
          <InlineNotificationToast notification={notification} onDismiss={dismiss} />
        </div>
      </div>

      {/* Info footer */}
      <div className="mt-4 flex items-center justify-center gap-6 text-[11px] text-zinc-700">
        {[
          { label: "Protocol", value: "Uniswap V3" },
          { label: "Slippage", value: `${slippage}%` },
          { label: "Network", value: "Ethereum" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span>{item.label}</span>
            <span className="text-zinc-500">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
