"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Wallet,
  TrendingUp,
  HandCoins,
  RefreshCw,
  CheckCircle2,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import {
  usePrivy,
  useSign7702Authorization,
  useSignMessage,
  useWallets,
} from "@privy-io/react-auth";
import { DepositSection } from "./DepositSection";
import {
  createPublicClient,
  http,
  formatUnits,
  encodeFunctionData,
  Address,
  Hex,
} from "viem";
import { arbitrum } from "viem/chains";
import { AAService, bigIntReplacer } from "@/services/account-abstraction";
import {
  entryPoint07Address,
  getUserOperationHash,
} from "viem/account-abstraction";

const USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";
const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: arbitrum,
  transport: http(),
});

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"positions" | "history">(
    "positions",
  );
  const [balance, setBalance] = useState<string>("0.00");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const { wallets } = useWallets();
  const { signAuthorization } = useSign7702Authorization();
  const { signMessage } = useSignMessage();
  // Get primary wallet (Privy embedded or connected)
  const wallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address = wallet?.address;

  const fetchBalance = useCallback(async () => {
    if (!address) return;

    setIsRefreshing(true);
    try {
      const data = await publicClient.readContract({
        address: USDT_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [address as `0x${string}`],
      });

      // USDT has 6 decimals
      const formatted = formatUnits(data, 6);
      setBalance(
        Number(formatted).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );
    } catch (error) {
      console.error("Error fetching balance:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [address]);

  const checkSmartAccount = useCallback(async () => {
    if (!address) return;
    try {
      const bytecode = await publicClient.getBytecode({
        address: address as Address,
      });
      setIsSmartAccount(!!bytecode && bytecode !== "0x");
    } catch (error) {
      console.error("Error checking smart account:", error);
    }
  }, [address]);

  useEffect(() => {
    fetchBalance();
    checkSmartAccount();
  }, [fetchBalance, checkSmartAccount]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Overview, Net Worth, Actions */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between"
          >
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Overview</h1>
              <p className="text-zinc-400">
                Manage your positions and track your performance.
              </p>
            </div>
          </motion.div>

          {/* Net Worth Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-white/5 bg-[#0A0A0A] p-8"
          >
            <div className="absolute top-0 right-0 p-32 bg-emerald-500/5 blur-[100px] rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-zinc-400">Net Worth</p>
                <button
                  onClick={fetchBalance}
                  disabled={isRefreshing}
                  className="p-2 rounded-full h-8 w-8 hover:bg-white/5 flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={
                      isRefreshing
                        ? "h-4 w-4 text-emerald-400 animate-spin"
                        : "h-4 w-4 text-zinc-500"
                    }
                  />
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">
                  ${balance}
                </span>
                <span className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> +0.00%
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Combined balance of USDT0 and XAUT0 positions
              </p>
            </div>
          </motion.div>

          {/* Actions Grid: Swap & Borrow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Swap Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Link href="/swap" className="group block h-full">
                <div className="relative h-full rounded-2xl border border-white/5 bg-[#0A0A0A] p-6 transition-colors hover:border-emerald-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                        <RefreshCw className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-zinc-500 transition-transform group-hover:-rotate-45 group-hover:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Swap Tokens
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Instant decentralized token swaps. Trade XAUT0/USDT.
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>

            {/* Borrow Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Link href="/borrow" className="group block h-full">
                <div className="relative h-full rounded-2xl border border-white/5 bg-[#0A0A0A] p-6 transition-colors hover:border-yellow-500/20 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                        <HandCoins className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-zinc-500 transition-transform group-hover:-rotate-45 group-hover:text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Borrow Assets
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Borrow USDT against your Gold collateral.
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Right Column: Deposit */}
        <div className="lg:col-span-1">
          <DepositSection address={address} />
        </div>
      </div>

      {/* Positions Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/5 bg-[#0A0A0A] min-h-[300px]"
      >
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-white/5 px-6">
          <button
            onClick={() => setActiveTab("positions")}
            className={`py-4 text-sm font-medium transition-colors ${
              activeTab === "positions"
                ? "text-white border-b-2 border-emerald-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Positions
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`py-4 text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "text-white border-b-2 border-emerald-500"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            History
          </button>
        </div>

        {/* Content */}
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Wallet className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            No active positions
          </h3>
          <p className="text-zinc-400 max-w-sm mb-6">
            You don't have any active positions yet. Start by depositing funds.
          </p>
          <Link
            href="/swap"
            className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-medium text-black transition-transform hover:scale-105 hover:bg-emerald-400"
          >
            Explore Markets
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
