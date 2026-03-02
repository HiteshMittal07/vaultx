"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Navbar } from "@/components/ui/Navbar";
import { cn } from "@/lib/utils";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";

interface AuthPageWrapperProps {
  children: ReactNode;
  className?: string;
  /** Centers content vertically (e.g. for the swap page) */
  horizontalCenter?: boolean;
  /** Controls max-width of content area */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "7xl" | "full";
}

const MAX_WIDTH_MAP = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
};

function BackgroundLayer() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute top-[-15%] right-[-5%] h-[700px] w-[700px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-blue-500/[0.04] blur-[100px]" />
      <div className="absolute top-[40%] left-[40%] h-[400px] w-[400px] rounded-full bg-teal-500/[0.03] blur-[100px]" />

      {/* Noise texture */}
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}

export function AuthPageWrapper({
  children,
  className,
  horizontalCenter = false,
  maxWidth = "7xl",
}: AuthPageWrapperProps) {
  const { ready, authenticated } = usePrivy();
  const { isDelegated, isLoading } = useDelegationStatus();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) router.push("/");
  }, [ready, authenticated, router]);

  useEffect(() => {
    if (ready && authenticated && !isLoading && !isDelegated) {
      router.push("/policy");
    }
  }, [ready, authenticated, isLoading, isDelegated, router]);

  if (!ready || !authenticated || isLoading || !isDelegated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
          <p className="text-xs text-zinc-600 animate-pulse">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white overflow-x-hidden">
      <BackgroundLayer />
      <Navbar />

      <main
        className={cn(
          "relative z-10 min-h-screen px-4",
          horizontalCenter
            ? "flex items-center justify-center pt-20 pb-6"
            : "pt-28 pb-16",
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "w-full mx-auto",
            MAX_WIDTH_MAP[maxWidth]
          )}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
