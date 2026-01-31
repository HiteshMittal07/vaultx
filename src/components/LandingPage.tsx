"use client";

import { motion } from "framer-motion";
import { GetStartedButton } from "./ui/GetStartedButton";
import { Navbar } from "./ui/Navbar";

import { GlassSphere, BackgroundGradients } from "./ui/GlassEffects";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LandingPage() {
  const { authenticated, ready } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  if (authenticated) return null;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#050505] text-white selection:bg-emerald-500/30">
      
      <BackgroundGradients />
      
      <GlassSphere className="top-20 left-10 h-32 w-32 md:h-48 md:w-48" delay={0.2} />
      <GlassSphere className="top-40 right-20 h-24 w-24 md:h-32 md:w-32" delay={0.4} />
      <GlassSphere className="bottom-20 left-1/5 h-40 w-40 md:h-56 md:w-56" delay={0.6} />
      <GlassSphere className="bottom-10 right-10 h-64 w-64 opacity-50" delay={0.8} />

      <Navbar />

      <section className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 text-center overflow-hidden z-0">
        
        <GlassSphere className="top-20 left-10 h-32 w-32 md:h-48 md:w-48" delay={0.2} />
        <GlassSphere className="top-40 right-20 h-24 w-24 md:h-32 md:w-32" delay={0.4} />
        <GlassSphere className="bottom-20 left-1/5 h-40 w-40 md:h-56 md:w-56" delay={0.6} />
        <GlassSphere className="bottom-10 right-10 h-64 w-64 opacity-50" delay={0.8} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 max-w-5xl w-full"
        >
          <h1 className="text-6xl font-extrabold tracking-tight md:text-8xl lg:text-9xl">
            <span className="block text-emerald-400 drop-shadow-[0_0_30px_rgba(52,211,153,0.3)]">
              Borrow Smart,
            </span>
            <span className="block text-white">
              Swap Secure.
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl"
          >
            [ Empowering financial freedom: Instant swaps, smart borrowing, and decentralized financial services with our innovative Vault platform ]
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-12 flex justify-center w-full"
          >
            <div className="flex flex-col items-center gap-24 w-full">
              <GetStartedButton />
            </div>
          </motion.div>
        </motion.div>

        <div className="absolute left-8 top-1/2 hidden -translate-y-1/2 rotate-180 text-xs tracking-widest text-zinc-600 md:block" style={{ writingMode: 'vertical-rl' }}>
          [ Your Smooth, Intuitive Experience ]
        </div>

      </section>
    </div>
  );
}

