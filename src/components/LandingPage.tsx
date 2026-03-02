"use client";

import { motion } from "framer-motion";
import { GetStartedButton } from "./ui/GetStartedButton";
import { Navbar } from "./ui/Navbar";
import { GlassSphere, BackgroundGradients } from "./ui/GlassEffects";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";

const FEATURES = [
  { label: "Gasless UX", desc: "Zero ETH needed for gas" },
  { label: "Gold-Backed Loans", desc: "XAUt collateral → USDT" },
  { label: "Autonomous Agents", desc: "24/7 position management" },
];

export function LandingPage() {
  const { authenticated, ready } = usePrivy();
  const { isDelegated, isLoading } = useDelegationStatus();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated && !isLoading) {
      router.push(isDelegated ? "/dashboard" : "/policy");
    }
  }, [ready, authenticated, isLoading, isDelegated, router]);

  if (authenticated) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white">
      <BackgroundGradients />

      {/* Decorative spheres — rendered once */}
      <GlassSphere className="top-20 left-10 h-32 w-32 md:h-48 md:w-48" delay={0.2} />
      <GlassSphere className="top-40 right-20 h-24 w-24 md:h-32 md:w-32" delay={0.4} />
      <GlassSphere className="bottom-20 left-[20%] h-40 w-40 md:h-56 md:w-56" delay={0.6} />
      <GlassSphere className="bottom-10 right-10 h-64 w-64 opacity-50" delay={0.8} />

      <Navbar />

      {/* Hero */}
      <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 text-center z-0">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative z-10 max-w-5xl w-full"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Powered by Account Abstraction · EIP-7702
          </motion.div>

          {/* Headline */}
          <h1 className="text-5xl font-extrabold tracking-tight md:text-8xl lg:text-9xl">
            <span className="block text-emerald-400 drop-shadow-[0_0_40px_rgba(52,211,153,0.25)]">
              Borrow Smart,
            </span>
            <span className="block text-white">Swap Secure.</span>
          </h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-8 max-w-2xl text-base text-zinc-400 md:text-xl leading-relaxed"
          >
            VaultX is a DeFi lending and swap platform where you can borrow
            USDT against your gold, swap tokens instantly — and never touch ETH
            for gas.
          </motion.p>

          {/* Feature Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            {FEATURES.map((f) => (
              <div
                key={f.label}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm"
              >
                <span className="font-semibold text-white">{f.label}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">{f.desc}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-12 flex justify-center"
          >
            <GetStartedButton />
          </motion.div>
        </motion.div>

        {/* Side label */}
        <div
          className="absolute left-8 top-1/2 hidden -translate-y-1/2 rotate-180 text-[10px] tracking-widest text-zinc-700 md:block select-none"
          style={{ writingMode: "vertical-rl" }}
          aria-hidden="true"
        >
          Gasless · Permissionless · Autonomous
        </div>
      </section>
    </div>
  );
}
