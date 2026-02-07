"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Notification, NotificationType } from "@/types";

interface UseNotificationOptions {
  autoDismiss?: boolean;
  autoDismissTimeout?: number;
}

/**
 * Custom hook for unified notification state management.
 * Extracts the duplicated notification pattern from SwapCard and BorrowDashboard.
 */
export function useNotification(options: UseNotificationOptions = {}) {
  const { autoDismiss = false, autoDismissTimeout = 5000 } = options;

  const [notification, setNotification] = useState<Notification | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /**
   * Shows a notification.
   */
  const showNotification = useCallback(
    (type: NotificationType, message: string, txHash?: string) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      setNotification({ type, message, txHash });

      // Auto-dismiss if enabled and it's a success notification
      if (autoDismiss && type === "success") {
        timeoutRef.current = setTimeout(() => {
          setNotification(null);
        }, autoDismissTimeout);
      }
    },
    [autoDismiss, autoDismissTimeout],
  );

  /**
   * Shows a success notification.
   */
  const showSuccess = useCallback(
    (message: string, txHash?: string) => {
      showNotification("success", message, txHash);
    },
    [showNotification],
  );

  /**
   * Shows an error notification.
   */
  const showError = useCallback(
    (message: string) => {
      showNotification("error", message);
    },
    [showNotification],
  );

  /**
   * Dismisses the current notification.
   */
  const dismiss = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setNotification(null);
  }, []);

  /**
   * Updates the current notification message (useful for status updates).
   */
  const updateMessage = useCallback((message: string) => {
    setNotification((prev) => (prev ? { ...prev, message } : null));
  }, []);

  return {
    notification,
    showNotification,
    showSuccess,
    showError,
    dismiss,
    updateMessage,
  };
}
