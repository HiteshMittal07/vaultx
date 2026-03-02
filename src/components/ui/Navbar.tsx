"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  Copy, Check, LogOut, Menu, X, ShieldCheck, Shield,
  LayoutDashboard, ArrowLeftRight, Landmark, ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";

const AUTH_LINKS = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
  { name: "Swap", href: "/swap", icon: <ArrowLeftRight className="h-4 w-4" /> },
  { name: "Borrow", href: "/borrow", icon: <Landmark className="h-4 w-4" /> },
];

export function Navbar() {
  const { authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const pathname = usePathname();
  const [copied, setCopied] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isDelegated } = useDelegationStatus();

  const isAuth = ready && authenticated;
  const wallet = wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address = wallet?.address;

  const truncateAddress = (addr: string) =>
    addr ? `${addr.slice(0, 6)}···${addr.slice(-4)}` : "";

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center py-4 px-4"
    >
      <div
        className={cn(
          "flex items-center rounded-2xl border border-white/[0.08] bg-black/60 backdrop-blur-2xl transition-all duration-300 relative shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          isAuth
            ? "w-full max-w-7xl px-5 py-3 justify-between"
            : "px-6 py-3 gap-8 rounded-full"
        )}
      >
        {isAuth ? (
          <>
            {/* ── Authenticated layout ── */}

            {/* Left: Logo + Nav */}
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                  <span className="text-sm font-black text-emerald-400">V</span>
                </div>
                <span className="text-base font-black tracking-tight text-white">
                  Vault<span className="text-emerald-400">X</span>
                </span>
              </Link>

              {/* Desktop nav */}
              <div className="hidden md:flex items-center gap-1">
                {AUTH_LINKS.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.name}
                      href={link.href}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                        isActive
                          ? "text-white bg-white/8"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-white/8 border border-white/[0.06]"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <span className="relative z-10 text-inherit">{link.icon}</span>
                      <span className="relative z-10">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right: Wallet + Agent + Logout */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Wallet address chip */}
              {address && (
                <button
                  onClick={handleCopy}
                  className="group hidden sm:flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-mono text-zinc-300 transition-all hover:bg-white/[0.07] hover:border-white/15"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                  {truncateAddress(address)}
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  )}
                </button>
              )}

              {/* Agent policy indicator */}
              <Link
                href="/policy?manage=true"
                className={cn(
                  "hidden md:flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all",
                  isDelegated
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                    : "border-amber-500/25 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15"
                )}
                title={isDelegated ? "Agent active" : "Enable agent"}
              >
                {isDelegated ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                <span>{isDelegated ? "Agent active" : "Enable agent"}</span>
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="hidden md:flex items-center justify-center h-9 w-9 rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-500 transition-all hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex md:hidden items-center justify-center h-9 w-9 rounded-xl border border-white/[0.06] bg-white/[0.03] text-zinc-400 transition-all hover:bg-white/[0.06]"
              >
                {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>

            {/* Mobile dropdown */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl border border-white/[0.08] bg-black/90 backdrop-blur-2xl shadow-2xl md:hidden z-50 overflow-hidden"
                >
                  <div className="p-3 space-y-1">
                    {AUTH_LINKS.map((link) => {
                      const isActive = pathname === link.href;
                      return (
                        <Link
                          key={link.name}
                          href={link.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                            isActive
                              ? "bg-white/8 text-white"
                              : "text-zinc-400 hover:bg-white/5 hover:text-white"
                          )}
                        >
                          {link.icon}
                          {link.name}
                        </Link>
                      );
                    })}

                    <div className="h-px bg-white/[0.05] my-2" />

                    {/* Agent status */}
                    <Link
                      href="/policy?manage=true"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        isDelegated ? "text-emerald-400 hover:bg-emerald-500/10" : "text-amber-400 hover:bg-amber-500/10"
                      )}
                    >
                      {isDelegated ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                      {isDelegated ? "Agent Active — Manage Policy" : "Enable VaultX Agent"}
                    </Link>

                    {address && (
                      <button
                        onClick={() => { handleCopy(); setIsMobileMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-mono text-zinc-400 hover:bg-white/5 transition-colors"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        {truncateAddress(address)}
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400 ml-auto" /> : <Copy className="h-3.5 w-3.5 text-zinc-600 ml-auto" />}
                      </button>
                    )}

                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/[0.04] mt-1"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <>
            {/* ── Unauthenticated layout ── */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                <span className="text-sm font-black text-emerald-400">V</span>
              </div>
              <span className="text-base font-black tracking-tight text-white">
                Vault<span className="text-emerald-400">X</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-8 text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
              <a href="https://github.com/HiteshMittal07/vaultx" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Docs</a>
              <a href="https://etherscan.io/address/0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Contract</a>
              <a href="https://github.com/HiteshMittal07/vaultx" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>

            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Mainnet
            </div>
          </>
        )}
      </div>
    </motion.nav>
  );
}
