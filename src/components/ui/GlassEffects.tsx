"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassSphere({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.5, delay, ease: "easeOut" }}
      className={cn(
        "absolute rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-3xl",
        className
      )}
      style={{
        boxShadow: "inset -20px -20px 50px rgba(0,0,0,0.5), inset 20px 20px 50px rgba(255,255,255,0.5), 0 0 50px rgba(16, 185, 129, 0.3)",
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
