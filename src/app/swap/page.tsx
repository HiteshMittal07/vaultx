"use client";

import { Navbar } from "@/components/ui/Navbar";
import { SwapCard } from "@/components/swap/SwapCard";
import { GlassSphere, BackgroundGradients } from "@/components/ui/GlassEffects";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SwapPage() {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && !authenticated) {
      router.push("/");
    }
  }, [ready, authenticated, router]);

  if (!ready || !authenticated) {
    return null; 
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white selection:bg-emerald-500/30">
        
      <BackgroundGradients />
      
      <GlassSphere className="top-20 left-10 h-32 w-32 opacity-60 md:h-48 md:w-48" delay={0.2} />
      <GlassSphere className="bottom-20 right-10 h-40 w-40 opacity-50 md:h-56 md:w-56" delay={0.4} />

      <Navbar />

      <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {/* Wrap content in motion div for entrance */}
        <motion.div
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.6 }}
           className="w-full flex justify-center"
        >
          <SwapCard />
        </motion.div>
      </main>
    </div>
  );
}
