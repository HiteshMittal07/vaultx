"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { cn } from "@/lib/utils";

const publicLinks = [
  { name: "Market", href: "#" },
  { name: "Docs", href: "#" },
  { name: "Governance", href: "#" },
  { name: "FAQ", href: "#" },
];

export function Navbar() {
  const { authenticated, ready, logout } = usePrivy();

  const isAuth = ready && authenticated;

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex justify-center py-6"
    >
      <div className={cn(
        "flex items-center rounded-full border border-white/10 bg-black/20 backdrop-blur-md transition-all",
        isAuth ? "px-6 py-3 gap-12" : "px-8 py-3 gap-8"
      )}>
        
        {isAuth ? (
          <>
            {/* Authenticated Layout */}
            
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">
                Vault<span className="text-emerald-400">X</span>
              </span>
            </Link>

            {/* Center: Navigation */}
            <div className="flex items-center gap-6">
              <Link
                href="/swap"
                className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Swap
              </Link>
              <Link
                href="/borrow"
                className="text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300"
              >
                Borrow
              </Link>
            </div>

            {/* Right: Logout */}
            <button
              onClick={logout}
              className="text-sm font-medium text-zinc-400 transition-colors hover:text-red-400"
            >
              Logout
            </button>
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
