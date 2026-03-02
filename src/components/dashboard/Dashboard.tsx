"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import {
  ArrowUpRight, Wallet, HandCoins, RefreshCw, Bot, User,
  TrendingUp, TrendingDown, ExternalLink, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { DepositSection } from "./DepositSection";
import { cn } from "@/lib/utils";
import { Address } from "viem";
import { LOGOS } from "@/constants/config";
import {
  usePosition,
  usePrices,
  useTokenBalances,
  useTransactionHistory,
} from "@/hooks";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_ICON_MAP: Record<string, string> = {
  swap: "🔄",
  supply: "📥",
  borrow: "💸",
  repay: "✅",
  withdraw: "📤",
  migrate: "⚡",
};

function ltvColor(ltv: number, lltv: number) {
  const ratio = ltv / lltv;
  if (ratio >= 0.95) return "text-red-400";
  if (ratio >= 0.85) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Components ───────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, trend, delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-6"
    >
      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      {sub && (
        <div className="flex items-center gap-1.5">
          {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-400" />}
          {trend === "down" && <TrendingDown className="h-3 w-3 text-red-400" />}
          <p className="text-xs text-zinc-500">{sub}</p>
        </div>
      )}
    </motion.div>
  );
}

function ActionCard({
  href, icon, title, desc, accent, delay = 0,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
    >
      <Link href={href} className="group block">
        <div className={`relative h-full rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-6 transition-all duration-300 hover:border-${accent}-500/20 hover:bg-[#0D0D0D]`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`h-10 w-10 rounded-xl bg-${accent}-500/10 flex items-center justify-center text-${accent}-400`}>
              {icon}
            </div>
            <ArrowUpRight className={`h-4 w-4 text-zinc-600 transition-all duration-300 group-hover:text-${accent}-400 group-hover:-translate-y-0.5 group-hover:translate-x-0.5`} />
          </div>
          <h3 className="text-base font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"positions" | "history">("positions");
  const { wallets } = useWallets();
  const wallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address = wallet?.address;

  const { history } = useTransactionHistory(address);
  const { data: position, refetch: refetchPosition } = usePosition(address);
  const { prices: pythPrices } = usePrices();
  const { data: balances, isFetching: isRefreshing, refetch: refetchBalances } = useTokenBalances(
    address as Address | undefined
  );

  const usdtBalance = Number(balances?.usdt.formatted ?? "0");
  const xautBalance = Number(balances?.xaut.formatted ?? "0");

  const netWorth =
    usdtBalance * pythPrices.USDT +
    xautBalance * pythPrices.XAUt +
    (position?.hasPosition ? position.userCollateral * pythPrices.XAUt : 0);

  const handleRefresh = () => {
    refetchPosition();
    refetchBalances();
  };

  const positionData = position?.hasPosition
    ? {
        collateral: position.userCollateral,
        borrow: position.userBorrow,
        oraclePrice: position.oraclePrice,
        lltv: position.lltv,
        currentLTV: position.currentLTV,
        liquidationPrice: position.liquidationPrice,
        percentDropToLiquidation: position.percentDropToLiquidation,
      }
    : null;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 px-0">
      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Portfolio</h1>
          <p className="text-sm text-zinc-500 mt-1">Your complete DeFi overview</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs font-medium text-zinc-400 transition-all hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-emerald-400" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* ── Top row: Net worth + deposit ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Net worth card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0A0A0A] p-8"
          >
            {/* Background glow */}
            <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-emerald-500/5 blur-[60px]" />
            <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-teal-500/5 blur-[60px]" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-1">Total Portfolio Value</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white tabular-nums">
                      ${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400">Live</span>
                </div>
              </div>

              {/* Balance breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-white shrink-0">
                    <Image src={LOGOS.USDT} alt="USDT" width={32} height={32} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">USDT Balance</p>
                    <p className="text-sm font-bold text-white">
                      {usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3">
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-white shrink-0">
                    <Image src={LOGOS.XAUt} alt="XAUt" width={32} height={32} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 mb-0.5">XAUt Balance</p>
                    <p className="text-sm font-bold text-white">
                      {xautBalance < 0.0001 && xautBalance > 0 ? "< 0.0001" : xautBalance.toFixed(4)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action cards */}
          <div className="grid grid-cols-2 gap-4">
            <ActionCard
              href="/swap"
              icon={<RefreshCw className="h-5 w-5" />}
              title="Swap Tokens"
              desc="Instant XAUt ↔ USDT swaps via Uniswap V3."
              accent="emerald"
              delay={0.1}
            />
            <ActionCard
              href="/borrow"
              icon={<HandCoins className="h-5 w-5" />}
              title="Borrow USDT"
              desc="Use XAUt as collateral on Morpho Blue."
              accent="yellow"
              delay={0.15}
            />
          </div>
        </div>

        {/* Deposit section */}
        <div className="lg:col-span-1">
          <DepositSection address={address} />
        </div>
      </div>

      {/* ── Positions / History ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/[0.06] bg-[#0A0A0A] overflow-hidden"
      >
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-white/[0.05] px-6 py-1">
          {(["positions", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2",
                activeTab === tab
                  ? "text-white border-emerald-500"
                  : "text-zinc-500 border-transparent hover:text-zinc-300"
              )}
            >
              {tab}
              {tab === "history" && history.length > 0 && (
                <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                  {history.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Positions tab */}
        {activeTab === "positions" && (
          positionData ? (
            <div className="p-6">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
                {/* Position header */}
                <div className="flex items-center justify-between p-5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-white ring-2 ring-[#0A0A0A] z-10">
                        <Image src={LOGOS.XAUt} alt="XAUt" width={32} height={32} />
                      </div>
                      <div className="h-8 w-8 rounded-full overflow-hidden bg-white ring-2 ring-[#0A0A0A]">
                        <Image src={LOGOS.USDT} alt="USDT" width={32} height={32} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">XAUt / USDT</p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Morpho Blue · Ethereum</p>
                    </div>
                  </div>
                  <Link href="/borrow?tab=position">
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
                      Manage <ArrowUpRight className="h-3 w-3" />
                    </span>
                  </Link>
                </div>

                {/* Position metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/[0.04]">
                  {[
                    {
                      label: "Collateral",
                      value: `${positionData.collateral < 0.0001 ? "< 0.0001" : positionData.collateral.toFixed(4)} XAUt`,
                      sub: `$${(positionData.collateral * pythPrices.XAUt).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    },
                    {
                      label: "Borrowed",
                      value: `${positionData.borrow.toFixed(2)} USDT`,
                      sub: `$${(positionData.borrow * pythPrices.USDT).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    },
                    {
                      label: "Current LTV",
                      value: `${positionData.currentLTV.toFixed(2)}%`,
                      sub: `Max ${(positionData.lltv * 100).toFixed(0)}%`,
                      special: ltvColor(positionData.currentLTV, positionData.lltv * 100),
                    },
                    {
                      label: "Liq. Price",
                      value: positionData.liquidationPrice > 0
                        ? `$${positionData.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : "—",
                      sub: positionData.percentDropToLiquidation > 0
                        ? `${positionData.percentDropToLiquidation.toFixed(1)}% drop`
                        : "",
                    },
                  ].map((m) => (
                    <div key={m.label} className="p-5">
                      <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">{m.label}</p>
                      <p className={cn("text-lg font-bold", m.special ?? "text-white")}>{m.value}</p>
                      {m.sub && <p className="text-xs text-zinc-600 mt-0.5">{m.sub}</p>}
                    </div>
                  ))}
                </div>

                {/* LTV progress bar */}
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between text-xs text-zinc-600 mb-1.5">
                    <span>Health</span>
                    <span>{positionData.currentLTV.toFixed(2)}% / {(positionData.lltv * 100).toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        positionData.currentLTV / (positionData.lltv * 100) >= 0.95
                          ? "bg-red-500"
                          : positionData.currentLTV / (positionData.lltv * 100) >= 0.85
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      )}
                      style={{ width: `${Math.min((positionData.currentLTV / (positionData.lltv * 100)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="h-16 w-16 rounded-full border border-white/[0.06] bg-white/[0.03] flex items-center justify-center mb-5">
                <Wallet className="h-7 w-7 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">No active positions</h3>
              <p className="text-sm text-zinc-500 max-w-sm mb-8">
                Deposit XAUt as collateral and start borrowing USDT at competitive rates.
              </p>
              <Link
                href="/borrow"
                className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(52,211,153,0.3)]"
              >
                Open a position
              </Link>
            </div>
          )
        )}

        {/* History tab */}
        {activeTab === "history" && (
          history.length > 0 ? (
            <div className="divide-y divide-white/[0.04]">
              {history.slice(0, 20).map((tx, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-lg shrink-0">
                      {ACTION_ICON_MAP[tx.type] ?? "📋"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white capitalize">{tx.type}</p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                            tx.executedBy === "vaultx-agent"
                              ? "bg-purple-500/10 text-purple-400"
                              : "bg-emerald-500/10 text-emerald-400"
                          )}
                        >
                          {tx.executedBy === "vaultx-agent" ? (
                            <Bot className="h-2.5 w-2.5" />
                          ) : (
                            <User className="h-2.5 w-2.5" />
                          )}
                          {tx.executedBy === "vaultx-agent" ? "Agent" : "You"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                        {new Date(tx.timestamp).toLocaleString(undefined, {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://etherscan.io/tx/${tx.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:text-white hover:border-white/10 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Explorer
                  </a>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-zinc-600">No transactions yet.</p>
            </div>
          )
        )}
      </motion.div>
    </div>
  );
}
