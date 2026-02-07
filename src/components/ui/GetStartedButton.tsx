"use client";

import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useSigners } from "@privy-io/react-auth";

export function GetStartedButton() {
  const { login, ready, authenticated } = usePrivy();

  const handleLogin = () => {
    if (ready && !authenticated) {
      login();
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleLogin}
      disabled={!ready}
      className="group relative flex items-center gap-2 rounded-full bg-emerald-400 px-8 py-4 text-lg font-bold text-black transition-all hover:bg-emerald-300 disabled:opacity-50"
    >
      <span>Get Started</span>
      <ArrowUpRight className="h-5 w-5 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />

      <div className="absolute inset-0 -z-10 rounded-full bg-emerald-400 opacity-50 blur-lg transition-opacity group-hover:opacity-75" />
    </motion.button>
  );
}
