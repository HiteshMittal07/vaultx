"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { GetStartedButton } from "./ui/GetStartedButton";
import { Navbar } from "./ui/Navbar";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";
import {
  Zap, Shield, TrendingUp, ArrowRight, Bot, Lock,
  ChevronRight, CircleDot, RefreshCw, Coins
} from "lucide-react";

// ─── Static data ─────────────────────────────────────────────────────────────

const STATS = [
  { label: "Protocol", value: "Morpho Blue" },
  { label: "Collateral", value: "XAUt (Gold)" },
  { label: "Borrow Asset", value: "USDT" },
  { label: "Max LTV", value: "77%" },
];

const FEATURES = [
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Gasless Transactions",
    desc: "Never hold ETH for gas. Account Abstraction (EIP-7702) sponsors every transaction — borrow, repay, swap, all free.",
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    glow: "group-hover:shadow-yellow-500/10",
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: "Non-Custodial Security",
    desc: "Your keys, your funds. VaultX can never withdraw your assets. Every action is validated against a hardcoded contract allowlist.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    glow: "group-hover:shadow-blue-500/10",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: "Autonomous Agent",
    desc: "A 24/7 DeFi agent monitors your positions, migrates to better rates, and protects you from liquidation — all without your manual input.",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    glow: "group-hover:shadow-purple-500/10",
  },
  {
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Rate Optimization",
    desc: "Automatically migrates your positions between Morpho and Fluid when better borrow rates appear — flash-loan powered, fully atomic.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "group-hover:shadow-emerald-500/10",
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: "Privy Authentication",
    desc: "Sign in with email — no seed phrases, no browser extensions. Your embedded wallet is secured by Privy's server-side MPC infrastructure.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    glow: "group-hover:shadow-rose-500/10",
  },
  {
    icon: <Coins className="h-5 w-5" />,
    title: "Gold-Backed Loans",
    desc: "Deposit tokenized gold (XAUt) as collateral and borrow USDT at competitive rates. Powered by Morpho Blue's isolated lending markets.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "group-hover:shadow-amber-500/10",
  },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Sign up with email",
    desc: "Create an account using just your email. Privy generates a secure embedded wallet — no seed phrases required.",
    icon: <CircleDot className="h-5 w-5" />,
  },
  {
    step: "02",
    title: "Authorize the agent",
    desc: "Delegate limited signing rights to the VaultX agent. It can only interact with whitelisted DeFi contracts — never your assets directly.",
    icon: <Shield className="h-5 w-5" />,
  },
  {
    step: "03",
    title: "Deposit & borrow",
    desc: "Deposit XAUt as collateral and borrow USDT. Or swap tokens instantly via Uniswap V3 — all gasless.",
    icon: <Coins className="h-5 w-5" />,
  },
  {
    step: "04",
    title: "Agent works for you",
    desc: "The VaultX agent monitors rates 24/7 and migrates your position to better protocols automatically.",
    icon: <RefreshCw className="h-5 w-5" />,
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function NoiseOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-[0.015]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundSize: "128px 128px",
      }}
    />
  );
}

function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }}
    />
  );
}

function GlowOrb({
  className,
  color = "emerald",
}: {
  className?: string;
  color?: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10",
    blue: "bg-blue-500/8",
    purple: "bg-purple-500/8",
    teal: "bg-teal-500/10",
  };
  return (
    <div
      className={`pointer-events-none absolute rounded-full blur-[120px] ${colorMap[color] ?? colorMap.emerald} ${className}`}
    />
  );
}

function StatBar() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="mx-auto mt-16 flex flex-wrap justify-center gap-px rounded-2xl border border-white/[0.06] bg-white/[0.03] p-0.5 backdrop-blur-sm overflow-hidden"
      style={{ maxWidth: 640 }}
    >
      {STATS.map((s, i) => (
        <div
          key={s.label}
          className={`flex flex-1 min-w-[120px] flex-col items-center py-4 px-6 ${i < STATS.length - 1 ? "border-r border-white/[0.06]" : ""}`}
        >
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">
            {s.label}
          </span>
          <span className="text-sm font-bold text-white">{s.value}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage() {
  const { authenticated, ready } = usePrivy();
  const { isDelegated, isLoading } = useDelegationStatus();
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.5], [0, -60]);

  useEffect(() => {
    if (ready && authenticated && !isLoading) {
      router.push(isDelegated ? "/dashboard" : "/policy");
    }
  }, [ready, authenticated, isLoading, isDelegated, router]);

  if (authenticated) return null;

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white overflow-x-hidden">
      {/* Background layers */}
      <NoiseOverlay />
      <GridBackground />
      <GlowOrb className="top-[-20%] right-[-10%] h-[800px] w-[800px]" color="emerald" />
      <GlowOrb className="bottom-[10%] left-[-10%] h-[600px] w-[600px]" color="blue" />
      <GlowOrb className="top-[40%] left-[30%] h-[400px] w-[400px]" color="teal" />

      <Navbar />

      {/* ── Hero ── */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, y: heroY }}
        className="relative flex min-h-screen flex-col items-center justify-center px-4 text-center pt-20 z-10"
      >
        {/* Top badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-400 backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          Live on Ethereum Mainnet · EIP-7702
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-5xl text-6xl font-black tracking-tight md:text-8xl lg:text-[104px] leading-[0.95]"
        >
          <span className="block bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Borrow Smart.
          </span>
          <span className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_60px_rgba(52,211,153,0.4)]">
            Swap Secure.
          </span>
          <span className="block bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Earn More.
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-xl"
        >
          The next-generation DeFi platform with gasless transactions, autonomous
          position management, and gold-backed lending — built on Morpho Blue,
          powered by Account Abstraction.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10"
        >
          <GetStartedButton />
        </motion.div>

        {/* Stats bar */}
        <StatBar />

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-10 flex flex-col items-center gap-2 text-zinc-600"
        >
          <span className="text-[10px] uppercase tracking-widest">Scroll to explore</span>
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronRight className="h-4 w-4 rotate-90" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* ── Features ── */}
      <section className="relative z-10 px-4 py-32">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
              Why VaultX
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              DeFi, reimagined.
            </h2>
            <p className="mt-4 text-zinc-400 max-w-xl mx-auto">
              Every feature is designed for real users — not crypto-native experts.
              No gas, no complexity, no compromises on security.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`group relative rounded-2xl border ${f.border} bg-white/[0.02] p-6 backdrop-blur-sm transition-all duration-500 hover:bg-white/[0.04] hover:shadow-2xl ${f.glow}`}
              >
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl ${f.bg} ${f.color}`}>
                  {f.icon}
                </div>
                <h3 className="mb-2 text-base font-bold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-500">{f.desc}</p>

                <div className={`absolute bottom-0 left-0 right-0 h-px rounded-b-2xl bg-gradient-to-r from-transparent ${f.bg} to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
              How it works
            </p>
            <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
              Up and running in minutes.
            </h2>
          </motion.div>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-4">
            {/* Connecting line */}
            <div className="absolute top-8 left-[12.5%] right-[12.5%] hidden h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent md:block" />

            {HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.15)]">
                  {step.icon}
                </div>
                <p className="text-xs font-bold text-emerald-500/60 mb-2 tracking-wider">
                  STEP {step.step}
                </p>
                <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Architecture callout ── */}
      <section className="relative z-10 px-4 py-24">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent p-8 md:p-16 backdrop-blur-sm"
          >
            {/* Glow inside card */}
            <div className="absolute -top-20 -right-20 h-[400px] w-[400px] rounded-full bg-emerald-500/5 blur-[80px]" />

            <div className="relative grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">
                  Built different
                </p>
                <h2 className="text-3xl font-black text-white md:text-4xl mb-6 leading-tight">
                  Every transaction is verified on-chain before execution.
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-8">
                  VaultX uses EIP-7702 to upgrade your EOA into a smart account
                  on-demand. Every UserOp is cryptographically verified by the
                  EntryPoint contract, validated against a hardcoded allowlist
                  server-side, and rate-limited per user. Nothing slips through.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Morpho Blue", "Uniswap V3", "Biconomy Nexus", "Pyth Oracle", "Privy Auth", "EIP-7702"].map((t) => (
                    <span key={t} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { label: "Request", detail: "UI → /api/borrow/prepare", color: "text-zinc-400" },
                  { label: "Validate", detail: "Zod schema + rate limit + auth", color: "text-blue-400" },
                  { label: "Build", detail: "UserOp construction server-side", color: "text-purple-400" },
                  { label: "Policy check", detail: "Contract allowlist + spend limit", color: "text-yellow-400" },
                  { label: "Sign", detail: "User signs via Privy embedded wallet", color: "text-orange-400" },
                  { label: "Execute", detail: "Bundler → EntryPoint → chain", color: "text-emerald-400" },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[10px] font-bold text-zinc-500">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <span className={`text-sm font-semibold ${item.color}`}>{item.label}</span>
                      <span className="ml-2 text-xs text-zinc-600">{item.detail}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative z-10 px-4 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl"
        >
          <h2 className="text-4xl font-black text-white md:text-5xl mb-6">
            Ready to put your capital to work?
          </h2>
          <p className="text-zinc-400 mb-10">
            Join VaultX — the DeFi platform that works for you, 24/7.
            No gas. No complexity. Just returns.
          </p>
          <GetStartedButton />
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.05] px-4 py-10">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-zinc-600">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">Vault<span className="text-emerald-400">X</span></span>
            <span>· Gasless DeFi on Ethereum</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/HiteshMittal07/vaultx" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            <a href="https://etherscan.io" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Etherscan</a>
            <span>MIT License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
