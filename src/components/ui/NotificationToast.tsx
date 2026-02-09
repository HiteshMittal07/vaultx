"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Notification } from "@/types";

interface NotificationToastProps {
  notification: Notification | null;
  onDismiss: () => void;
  position?: "bottom-center" | "bottom-right" | "top-center" | "top-right";
  className?: string;
}

const positionClasses = {
  "bottom-center": "fixed bottom-8 left-1/2 -translate-x-1/2",
  "bottom-right": "fixed bottom-8 right-8",
  "top-center": "fixed top-8 left-1/2 -translate-x-1/2",
  "top-right": "fixed top-8 right-8",
};

/**
 * Reusable notification toast component.
 * Extracted from SwapCard and BorrowDashboard.
 */
export function NotificationToast({
  notification,
  onDismiss,
  position = "bottom-center",
  className = "",
}: NotificationToastProps) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`${positionClasses[position]} z-[100] w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-2xl backdrop-blur-xl ${className}`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ) : (
              <div className="mt-0.5 rounded-full bg-red-500/10 p-1">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {notification.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                {notification.message}
              </p>

              {notification.txHash && (
                <a
                  href={`https://etherscan.io/tx/${notification.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
                >
                  View on Etherscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <button
              onClick={onDismiss}
              className="rounded-lg p-1.5 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <XCircle className="h-4 w-4 opacity-50" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Inline notification toast (positioned within a container).
 * Used for SwapCard where the notification appears inside the card.
 */
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
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`absolute inset-x-5 bottom-5 z-50 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 shadow-2xl backdrop-blur-xl ${className}`}
        >
          <div className="flex items-start gap-3">
            {notification.type === "success" ? (
              <div className="mt-0.5 rounded-full bg-emerald-500/10 p-1">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
            ) : (
              <div className="mt-0.5 rounded-full bg-red-500/10 p-1">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {notification.type === "success" ? "Success" : "Error"}
              </p>
              <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">
                {notification.message}
              </p>

              {notification.txHash && (
                <a
                  href={`https://etherscan.io/tx/${notification.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-wider"
                >
                  View on Etherscan
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <button
              onClick={onDismiss}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <XCircle className="h-4 w-4" opacity={0.5} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
