"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>
        <p className="text-zinc-400 text-sm mb-8">
          An unexpected error occurred. Your funds are safe — this is a display
          issue only.
        </p>

        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono mb-6">
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          className="rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95"
        >
          Try again
        </button>
      </motion.div>
    </div>
  );
}
