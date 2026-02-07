"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { Navbar } from "@/components/ui/Navbar";
import { GlassSphere, BackgroundGradients } from "@/components/ui/GlassEffects";
import { cn } from "@/lib/utils";
import { useDelegationStatus } from "@/hooks/useDelegationStatus";

interface AuthPageWrapperProps {
  children: ReactNode;
  className?: string;
  horizontalCenter?: boolean;
}

export function AuthPageWrapper({
  children,
  className,
  horizontalCenter = false,
}: AuthPageWrapperProps) {
  const { ready, authenticated } = usePrivy();
  const { isDelegated, isLoading } = useDelegationStatus();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  // Redirect to policy page if wallet is not delegated yet
  useEffect(() => {
    if (ready && authenticated && !isLoading && !isDelegated) {
      router.push("/policy");
    }
  }, [ready, authenticated, isLoading, isDelegated, router]);

  if (!ready || !authenticated || isLoading || !isDelegated) {
    return null;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white selection:bg-emerald-500/30">
      {/* Background Layer */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <BackgroundGradients />

        {/* Soft, professional glass spheres */}
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
        <GlassSphere
          className="top-[30%] left-[-10%] h-[400px] w-[400px] blur-3xl"
          opacity={0.05}
          delay={0.4}
        />
      </div>

      <Navbar />

      <main
        className={cn(
          "relative z-10 min-h-screen pt-32 pb-12 px-4",
          horizontalCenter && "flex items-center justify-center pt-24 pb-4",
          className,
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full h-full"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
