"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { ArrowDown } from "lucide-react";
import {
  parseUnits,
  formatUnits,
  Address,
} from "viem";
import {
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth";
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

const TOKEN_USDT: TokenInfo = {
  symbol: "USDT",
  address: USDT,
  decimals: 6,
};

const TOKEN_XAUT: TokenInfo = {
  symbol: "XAUt",
  address: XAUT,
  decimals: 6,
};

export function SwapCard() {
  const { wallets } = useWallets();
  const { signMessage } = useSignMessage();
  const wallet = wallets[0];
  const address = wallet?.address;

  // Token state
  const [tokenIn, setTokenIn] = useState<TokenInfo>(TOKEN_USDT);
  const [tokenOut, setTokenOut] = useState<TokenInfo>(TOKEN_XAUT);

  // Amount state
  const [sellAmount, setSellAmount] = useState("");

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Settings state
  const [slippage, setSlippage] = useState("5.0");
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");

  // Custom hooks
  const { prices: pythPrices } = usePrices();
  const { saveTransaction } = useTransactionHistory(address);
  const { notification, showSuccess, showError, dismiss } = useNotification();

  // Token balances query
  const { data: balances, refetch: refetchBalances } = useTokenBalances(
    address as Address | undefined
  );

  // Get balances for current tokens
  const getBalance = useCallback(
    (token: TokenInfo) => {
      if (!balances) return { raw: BigInt(0), formatted: "0.00" };
      return token.symbol === "USDT" ? balances.usdt : balances.xaut;
    },
    [balances]
  );

  const balanceIn = getBalance(tokenIn);
  const balanceOut = getBalance(tokenOut);

  // Format balance for display
  const formatBalanceDisplay = useCallback(
    (token: TokenInfo, balance: { raw: bigint; formatted: string }) => {
      const value = Number(balance.formatted);
      if (token.symbol === "XAUt") {
        return value < 0.0001 && value > 0
          ? "< 0.0001"
          : value.toFixed(4);
      }
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    },
    []
  );

  // Quote hook
  const { buyAmount, isQuoting, error, fetchQuote } = useSwapQuote(
    tokenIn,
    tokenOut
  );

  // Check insufficient balance
  const isInsufficientBalance =
    !!sellAmount &&
    Number(sellAmount) > 0 &&
    parseUnits(sellAmount, tokenIn.decimals) > balanceIn.raw;

  // Transaction execution via backend
  const { isExecuting, executeSwap } = useTransactionExecution({
    address: address as Address | undefined,
    signMessage,
  });

  // Handle sell amount change with debounced quote fetch
  const handleSellAmountChange = useCallback(
    (amount: string) => {
      setSellAmount(amount);
      fetchQuote(amount);
    },
    [fetchQuote]
  );

  // Handle max balance click
  const handleMaxClick = useCallback(() => {
    const formatted = formatUnits(balanceIn.raw, tokenIn.decimals);
    handleSellAmountChange(formatted);
  }, [balanceIn.raw, tokenIn.decimals, handleSellAmountChange]);

  // Handle swap execution via backend prepare + sign + execute
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
  }, [
    executeSwap,
    sellAmount,
    buyAmount,
    slippage,
    deadlineMinutes,
    tokenIn,
    tokenOut,
    showSuccess,
    showError,
    saveTransaction,
    refetchBalances,
    address,
  ]);

  // Handle token switch
  const switchTokens = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setSellAmount("");
  }, [tokenIn, tokenOut]);

  return (
    <div className="w-full max-w-[480px] group relative">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 rounded-[2.5rem] bg-gradient-to-r from-emerald-500/20 to-blue-500/20 opacity-0 blur transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative rounded-[2rem] border border-white/10 bg-black/40 p-5 backdrop-blur-3xl md:p-7 shadow-2xl">
        {/* Header with Settings */}
        <div className="relative">
          <SwapHeader
            showSettings={showSettings}
            onToggleSettings={() => setShowSettings(!showSettings)}
          />
          <SwapSettings
            isOpen={showSettings}
            slippage={slippage}
            deadlineMinutes={deadlineMinutes}
            onSlippageChange={setSlippage}
            onDeadlineChange={setDeadlineMinutes}
          />
        </div>

        {/* Sell Input */}
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

        {/* Switch Button */}
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

        {/* Buy Input */}
        <div className="mt-2">
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

        {/* Action Button */}
        <SwapButton
          sellAmount={sellAmount}
          isInsufficientBalance={isInsufficientBalance}
          isQuoting={isQuoting}
          isExecuting={isExecuting}
          error={error}
          tokenIn={tokenIn}
          onClick={handleSwap}
        />

        {/* Swap Details */}
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
  );
}
