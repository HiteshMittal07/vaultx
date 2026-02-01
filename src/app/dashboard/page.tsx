"use client";

import { Navbar } from "@/components/ui/Navbar";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { BackgroundGradients, GlassSphere } from "@/components/ui/GlassEffects";
import { motion } from "framer-motion";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
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
        
      {/* Background Gradients */}
      <BackgroundGradients />
      
      {/* Decorative Spheres */}
      <GlassSphere className="top-[-10%] right-[-5%] h-[500px] w-[500px] opacity-[0.15]" delay={0} />
      <GlassSphere className="bottom-[-10%] left-[-5%] h-[600px] w-[600px] opacity-[0.1] blur-3xl" delay={0.2} />

      <Navbar />

      <main className="relative z-10 min-h-screen pt-32 pb-12 px-4">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.5 }}
        >
          <Dashboard />
        </motion.div>
      </main>
    </div>
  );
}
