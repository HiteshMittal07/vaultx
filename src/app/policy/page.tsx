"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useSigners } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Navbar } from "@/components/ui/Navbar";
import { BackgroundGradients, GlassSphere } from "@/components/ui/GlassEffects";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";

const AUTHORIZATION_KEY_QUORUM_ID =
  process.env.NEXT_PUBLIC_AUTHORIZATION_KEY_ID!;

const POLICIES = [
  {
    title: "Position Rebalancing",
    description:
      "VaultX can move your lending positions between protocols (e.g. Morpho, Aave, Compound) to optimize for better interest rates, lower risk, or improved capital efficiency.",
    icon: (
      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: "APR Optimization",
    description:
      "Automatically chase the best supply and borrow rates across DeFi lending markets on Ethereum, ensuring your capital is always working at peak efficiency.",
    icon: (
      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    title: "Risk-Adjusted Migration",
    description:
      "If a protocol's utilization spikes or liquidation risk increases, VaultX can proactively migrate your position to a safer market before conditions worsen.",
    icon: (
      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: "Gasless Execution",
    description:
      "All rebalancing transactions are executed gaslessly through Account Abstraction (ERC-4337). You never pay gas fees for automated position management.",
    icon: (
      <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    ),
  },
];

const SECURITY_GUARANTEES = [
  {
    label: "No withdrawal access",
    detail:
      "VaultX cannot withdraw, transfer, or move your funds to any external wallet. Your assets always remain in your own embedded wallet.",
  },
  {
    label: "No token approvals",
    detail:
      "VaultX cannot approve spending of your tokens to arbitrary contracts. Only whitelisted DeFi protocol interactions are permitted.",
  },
  {
    label: "Application-enforced constraints",
    detail:
      "Every transaction the VaultX agent submits is validated against hardcoded contract allowlists, per-transaction spend limits, and on-chain UserOp verification by the EntryPoint smart contract.",
  },
  {
    label: "Revocable at any time",
    detail:
      "You can revoke VaultX's signer access at any point from your wallet settings. Once revoked, VaultX can no longer execute any transactions on your behalf.",
  },
  {
    label: "Full owner control",
    detail:
      "You remain the sole owner of your wallet. VaultX is added as a signer, not an owner. You retain full control to override, cancel, or manually manage your positions.",
  },
];

function PolicyPageInner() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { addSigners } = useSigners();
  const { isDelegated, isLoading } = useDelegationStatus();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isManageMode = searchParams.get("manage") === "true";

  const [isApproving, setIsApproving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { removeSigners } = useSigners();

  // Redirect unauthenticated users
  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Auto-redirect delegated users to dashboard unless they
  // navigated here intentionally via navbar (?manage=true)
  useEffect(() => {
    if (!isLoading && isDelegated && !isManageMode) {
      router.push("/dashboard");
    }
  }, [isLoading, isDelegated, isManageMode, router]);

  const handleApprove = async () => {
    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy"
    );
    if (!embeddedWallet) {
      setError("No embedded wallet found. Please refresh and try again.");
      return;
    }

    setIsApproving(true);
    setError(null);

    try {
      await addSigners({
        address: embeddedWallet.address,
        signers: [
          {
            signerId: AUTHORIZATION_KEY_QUORUM_ID,
            policyIds: [],
          },
        ],
      });
      router.push("/dashboard");
    } catch (err) {
      console.error("[PolicyPage] Failed to add signer:", err);
      setError("Failed to approve policy. Please try again.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleRevoke = async () => {
    const embeddedWallet = wallets.find(
      (w) => w.walletClientType === "privy"
    );
    if (!embeddedWallet) {
      setError("No embedded wallet found. Please refresh and try again.");
      return;
    }

    setIsRevoking(true);
    setError(null);

    try {
      await removeSigners({ address: embeddedWallet.address });
      router.push("/dashboard");
    } catch (err) {
      console.error("[PolicyPage] Failed to revoke signer:", err);
      setError("Failed to revoke agent access. Please try again.");
    } finally {
      setIsRevoking(false);
    }
  };

  if (!ready || !authenticated || isLoading) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white selection:bg-emerald-500/30">
      <div className="fixed inset-0 pointer-events-none z-0">
        <BackgroundGradients />
        <GlassSphere
          className="top-[-10%] right-[-5%] h-[600px] w-[600px] blur-3xl"
          opacity={0.12}
          delay={0}
        />
        <GlassSphere
          className="bottom-[-10%] left-[-5%] h-[700px] w-[700px] blur-3xl"
          opacity={0.1}
          delay={0.2}
        />
      </div>

      <Navbar />

      <main className="relative z-10 min-h-screen pt-28 pb-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto max-w-3xl"
        >
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Authorize{" "}
              <span className="text-emerald-400">VaultX Agent</span>
            </h1>
            <p className="mt-3 text-zinc-400 text-base max-w-xl mx-auto">
              VaultX uses an intelligent DeFi agent that manages your lending
              positions across protocols. To enable this, we need your
              permission to sign and execute transactions on your behalf.
            </p>
          </div>

          {/* What VaultX Agent Can Do */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-zinc-200 mb-4">
              What VaultX Agent can do
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {POLICIES.map((policy) => (
                <div
                  key={policy.title}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {policy.icon}
                    <h3 className="font-medium text-white text-sm">
                      {policy.title}
                    </h3>
                  </div>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    {policy.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Security - Cannot Do */}
          <section className="mb-8">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20">
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    VaultX cannot withdraw your funds
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Your assets are always under your control
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {SECURITY_GUARANTEES.map((item) => (
                  <div key={item.label} className="flex gap-3">
                    <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {item.label}
                      </p>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-zinc-200 mb-3">
              How it works
            </h2>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 space-y-3 text-sm text-zinc-400 leading-relaxed">
              <p>
                By approving, you add VaultX as a{" "}
                <span className="text-white font-medium">signer</span> (not an
                owner) on your embedded wallet through Privy&apos;s secure
                delegation system.
              </p>
              <p>
                All transactions are built server-side against a{" "}
                <span className="text-white font-medium">hardcoded allowlist</span>{" "}
                of smart contracts (Morpho, Uniswap, token contracts) with
                per-transaction spend limits. Every UserOp is cryptographically
                verified on-chain by the EntryPoint contract before execution.
              </p>
              <p>
                You remain the <span className="text-white font-medium">sole owner</span> of
                your wallet and can revoke this access at any time from your
                settings.
              </p>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col items-center gap-3">
            {isDelegated ? (
              <>
                <div className="mb-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 text-center w-full max-w-md">
                  VaultX Agent is currently authorized on your wallet.
                </div>
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full max-w-md rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  Go to Dashboard
                </button>
                <button
                  onClick={handleRevoke}
                  disabled={isRevoking}
                  className="w-full max-w-md rounded-xl border border-red-500/30 bg-red-500/10 px-8 py-3.5 text-base font-semibold text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRevoking ? "Revoking..." : "Revoke Agent Access"}
                </button>
                <p className="text-xs text-zinc-500 max-w-md text-center">
                  Revoking will prevent VaultX from executing any transactions
                  on your behalf until you re-approve.
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="w-full max-w-md rounded-xl bg-emerald-500 px-8 py-3.5 text-base font-semibold text-white transition-all hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30"
                >
                  {isApproving ? "Approving..." : "Approve & Continue"}
                </button>
                <p className="text-xs text-zinc-500 max-w-md text-center">
                  By approving, you authorize VaultX to sign and execute
                  transactions on your behalf. You can revoke access at any time.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default function PolicyPage() {
  return (
    <Suspense>
      <PolicyPageInner />
    </Suspense>
  );
}
