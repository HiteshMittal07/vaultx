"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink, X } from "lucide-react";
import { Notification } from "@/types";

// ─── Floating toast (fixed-positioned) ────────────────────────────────────────

interface NotificationToastProps {
  notification: Notification | null;
  onDismiss: () => void;
  position?: "bottom-center" | "bottom-right" | "top-center" | "top-right";
  className?: string;
}

const positionClasses: Record<string, string> = {
  "bottom-center": "fixed bottom-8 left-1/2 -translate-x-1/2",
  "bottom-right": "fixed bottom-8 right-8",
  "top-center": "fixed top-24 left-1/2 -translate-x-1/2",
  "top-right": "fixed top-24 right-8",
};

export function NotificationToast({
  notification,
  onDismiss,
  position = "bottom-center",
  className = "",
}: NotificationToastProps) {
  const isSuccess = notification?.type === "success";

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
          className={`${positionClasses[position] ?? positionClasses["bottom-center"]} z-[100] w-full max-w-sm ${className}`}
        >
          <div
            className={`rounded-2xl border backdrop-blur-2xl p-4 shadow-2xl ${
              isSuccess
                ? "border-emerald-500/20 bg-[#0a0a0a]/95"
                : "border-red-500/20 bg-[#0a0a0a]/95"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 shrink-0 rounded-xl p-1.5 ${isSuccess ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                {isSuccess ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {isSuccess ? "Transaction confirmed" : "Transaction failed"}
                </p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  {notification.message}
                </p>
                {notification.txHash && (
                  <a
                    href={`https://etherscan.io/tx/${notification.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    View on Etherscan
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              <button
                onClick={onDismiss}
                className="shrink-0 flex h-6 w-6 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Inline toast (positioned inside a parent container) ──────────────────────

interface InlineNotificationToastProps {
  notification: Notification | null;
  onDismiss: () => void;
  className?: string;
}

export function InlineNotificationToast({
  notification,
  onDismiss,
  className = "",
}: InlineNotificationToastProps) {
  const isSuccess = notification?.type === "success";

  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.2 }}
          className={`mt-4 rounded-xl border p-3.5 ${
            isSuccess
              ? "border-emerald-500/20 bg-emerald-500/[0.04]"
              : "border-red-500/20 bg-red-500/[0.04]"
          } ${className}`}
        >
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white">
                {isSuccess ? "Confirmed" : "Failed"}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                {notification.message}
              </p>
              {notification.txHash && (
                <a
                  href={`https://etherscan.io/tx/${notification.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Etherscan <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
            <button onClick={onDismiss} className="text-zinc-600 hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
