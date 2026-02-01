"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ArrowRight, Wallet, HandCoins, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { DepositSection } from "./DepositSection";
import { cn } from "@/lib/utils";
import { formatUnits, Address } from "viem";
import { publicClient } from "@/lib/blockchain/client";
import { USDT0 } from "@/constants/addresses";
import { LOGOS, APP_CONFIG } from "@/constants/config";
import {
  getTokenBalance,
  getMorphoMarketData,
  getOraclePrice,
  calculateBorrowAssets,
  getLatestPythPrice,
} from "@/lib/blockchain/utils";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"positions" | "history">(
    "positions",
  );
  const [balance, setBalance] = useState<string>("0.00");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSmartAccount, setIsSmartAccount] = useState(false);
  const { wallets } = useWallets();
  const wallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address = wallet?.address;

  const [history, setHistory] = useState<any[]>([]);
  const [positionData, setPositionData] = useState<{
    collateral: number;
    borrow: number;
    oraclePrice: number;
    lltv: number;
  } | null>(null);
  const [pythPrices, setPythPrices] = useState<{
    XAUt0: number;
    USDT0: number;
  }>({ XAUt0: 0, USDT0: 1 });

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

  const fetchData = useCallback(async () => {
    if (!address) return;

    setIsRefreshing(true);
    try {
      // 1. Fetch USDT Balance
      const data = await getTokenBalance(USDT0, address as Address);
      setBalance(
        Number(formatUnits(data, 6)).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      );

      // 2. Fetch Morpho Position
      const { params, state, position } = await getMorphoMarketData(
        address as Address,
      );

      // 3. Fetch Oracle Price
      const oPrice = params ? await getOraclePrice(params) : 0;

      const collateral = position
        ? Number(formatUnits((position as any)[2], 6))
        : 0;

      // Calculate borrow assets from shares
      const borrowAssets =
        position && state && (state as any)[3] > 0
          ? calculateBorrowAssets(
              (position as any)[1],
              (state as any)[2],
              (state as any)[3],
            )
          : 0;

      const lltv =
        params && params.length >= 5
          ? Number(formatUnits((params as any)[4] as bigint, 18)) * 100
          : 0;

      if (collateral > 0 || borrowAssets > 0) {
        setPositionData({
          collateral,
          borrow: borrowAssets,
          oraclePrice: oPrice,
          lltv,
        });
      } else {
        setPositionData(null);
      }

      // 4. Fetch Pyth Prices
      const [pXAUT, pUSDT] = await Promise.all([
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.XAUt0),
        getLatestPythPrice(APP_CONFIG.pythPriceFeedIds.USDT0),
      ]);
      if (pXAUT > 0 && pUSDT > 0) {
        setPythPrices({ XAUt0: pXAUT, USDT0: pUSDT });
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
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
    fetchData();
    checkSmartAccount();
  }, [fetchData, checkSmartAccount]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-end justify-between"
          >
            <div className="px-4 sm:px-0">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                Overview
              </h1>
              <p className="text-sm sm:text-base text-zinc-400">
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
                  onClick={fetchData}
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
              <div className="flex items-baseline flex-wrap gap-2">
                <span className="text-3xl sm:text-5xl font-bold text-white">
                  $
                  {(
                    Number(balance.replace(/,/g, "")) * pythPrices.USDT0
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">USDT0 Balance</p>
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
                      Instant decentralized token swaps. Trade XAUt0/USDT.
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
        {activeTab === "positions" ? (
          positionData ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-white/5 bg-white/5 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-white">
                      <Image
                        src={LOGOS.USDT0}
                        alt="USDT"
                        width={32}
                        height={32}
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        XAUt0 / USDT0 Market
                      </h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        Morpho Blue Position
                      </p>
                    </div>
                  </div>
                  <Link href="/borrow?tab=position">
                    <button className="text-xs text-emerald-500 font-bold hover:underline">
                      Manage
                    </button>
                  </Link>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">
                      Collateral
                    </p>
                    <p className="text-xl font-bold text-white">
                      {positionData.collateral < 0.0001
                        ? "< 0.0001"
                        : positionData.collateral.toFixed(4)}{" "}
                      XAUt0
                    </p>
                    <p className="text-xs text-zinc-500">
                      ${(positionData.collateral * pythPrices.XAUt0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">
                      Borrowed
                    </p>
                    <p className="text-xl font-bold text-white">
                      {positionData.borrow.toFixed(2)} USDT
                    </p>
                    <p
                      className={cn(
                        "text-xl font-bold transition-colors",
                        (() => {
                          const ltv =
                            (positionData.borrow /
                              (positionData.collateral *
                                positionData.oraclePrice)) *
                            100;
                          if (ltv >= positionData.lltv * 0.95)
                            return "text-red-400";
                          if (ltv >= positionData.lltv * 0.9)
                            return "text-amber-400";
                          return "text-white";
                        })(),
                      )}
                    >
                      {(
                        (positionData.borrow /
                          (positionData.collateral *
                            positionData.oraclePrice)) *
                        100
                      ).toFixed(2)}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Wallet className="h-8 w-8 text-zinc-600" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                No active positions
              </h3>
              <p className="text-zinc-400 max-w-sm mb-6">
                You don't have any active positions yet. Start by depositing
                funds or taking a loan.
              </p>
              <Link
                href="/borrow"
                className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-medium text-black transition-transform hover:scale-105 hover:bg-emerald-400"
              >
                Start Borrowing
              </Link>
            </div>
          )
        ) : (
          <div className="w-full">
            {history.length > 0 ? (
              <div className="divide-y divide-white/5">
                {history.map((tx, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <RefreshCw className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white capitalize">
                          {tx.type} Successful
                        </p>
                        <p className="text-[10px] text-zinc-500 font-mono">
                          {tx.timestamp}
                        </p>
                      </div>
                    </div>
                    <a
                      href={`https://arbiscan.io/tx/${tx.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-zinc-500 hover:text-emerald-400 uppercase tracking-widest flex items-center gap-1"
                    >
                      Arbiscan
                      <ArrowRight className="h-3 w-3 -rotate-45" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-medium text-white mb-2">
                  No history
                </h3>
                <p className="text-zinc-400">
                  Your recent transactions will appear here.
                </p>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
