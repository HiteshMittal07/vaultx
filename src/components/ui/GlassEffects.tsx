"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassSphere({
  className,
  delay = 0,
  opacity = 0.1,
}: {
  className?: string;
  delay?: number;
  opacity?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0, opacity],
        scale: [0.8, 1],
        y: [0, -20, 0],
      }}
      transition={{
        opacity: { duration: 1.5, delay },
        scale: { duration: 1.5, delay },
        y: {
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
      }}
      className={cn(
        "absolute rounded-full bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-3xl border border-white/10",
        className,
      )}
      style={{
        boxShadow:
          "inset -10px -10px 30px rgba(0,0,0,0.3), inset 10px 10px 30px rgba(255,255,255,0.1), 0 0 80px rgba(16, 185, 129, 0.1)",
      }}
    />
  );
}

export function BackgroundGradients() {
  return (
    <>
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-teal-500/10 blur-[100px]" />
    </>
  );
}
