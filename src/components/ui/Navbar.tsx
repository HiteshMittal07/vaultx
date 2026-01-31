"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Copy, Check, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const publicLinks = [
  { name: "Market", href: "#" },
  { name: "Docs", href: "#" },
  { name: "Governance", href: "#" },
  { name: "FAQ", href: "#" },
];

export function Navbar() {
  const { authenticated, ready, logout } = usePrivy();
  const { wallets } = useWallets();
  const [copied, setCopied] = useState(false);

  const isAuth = ready && authenticated;
  // Fallback to first wallet if privy type not found
  const wallet = wallets.find((w) => w.walletClientType === 'privy') || wallets[0];
  const address = wallet?.address;

  const truncateAddress = (addr: string) => {
    if (!addr) return "";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center py-6"
    >
      <div className={cn(
        "flex items-center rounded-xl border border-white/10 bg-black/20 backdrop-blur-md transition-all duration-500",
        isAuth ? "w-full mx-6 px-6 py-4 justify-between" : "px-8 py-3 gap-8 rounded-full"
      )}>
        
        {isAuth ? (
          <>
            {/* Authenticated Layout */}
            
            <div className="flex items-center gap-12">
              {/* Logo */}
              <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
                <span className="text-xl font-bold tracking-tight text-white">
                  Vault<span className="text-emerald-400">X</span>
                </span>
              </Link>

              {/* Navigation */}
              <div className="flex items-center gap-8">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-white transition-colors hover:text-emerald-400"
                >
                  Dashboard
                </Link>
                <Link
                  href="/swap"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
                >
                  Swap
                </Link>
                <Link
                  href="/borrow"
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-emerald-400"
                >
                  Borrow
                </Link>
              </div>
            </div>

            {/* Right: Wallet & Logout */}
            <div className="flex items-center gap-4 shrink-0">
              {address && (
                <div 
                  className="group flex items-center gap-2 rounded-full bg-white/5 py-2 px-4 ring-1 ring-white/10 transition-all hover:bg-white/10 cursor-pointer"
                  onClick={handleCopy}
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-mono text-zinc-300">
                    {truncateAddress(address)}
                  </span>
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <Copy className="h-3 w-3 text-zinc-500 transition-colors group-hover:text-white" />
                  )}
                </div>
              )}

              <button
                onClick={logout}
                className="flex items-center justify-center h-9 w-9 rounded-full text-zinc-400 transition-colors hover:bg-white/10 hover:text-red-400"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Unauthenticated Layout */}
            
            {/* Left Side Links */}
            <div className="flex items-center gap-6">
              {publicLinks.slice(0, 2).map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* Center Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Vault<span className="text-emerald-400">X</span>
              </span>
            </Link>

            {/* Right Side Links */}
            <div className="flex items-center gap-6">
              {publicLinks.slice(2).map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </motion.nav>
  );
}
