"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";

const PUSH_STATUS_KEY = "fanzone-push-status";
const PUSH_DISMISS_KEY = "fanzone-push-dismissed";

function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export default function PushOptIn() {
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;

    // Already subscribed or granted
    if (Notification.permission === "granted") return;
    // Already denied — no point asking
    if (Notification.permission === "denied") return;

    // Already dismissed
    const dismissed = localStorage.getItem(PUSH_DISMISS_KEY);
    if (dismissed) return;

    // Already opted in previously
    const status = localStorage.getItem(PUSH_STATUS_KEY);
    if (status === "subscribed") return;

    // Show after 10 seconds on site
    const timer = setTimeout(() => {
      setVisible(true);
    }, 10_000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        // Try to register push subscription via the service worker
        const registration = await navigator.serviceWorker.ready;
        try {
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
          });
          // Send subscription to the server (if API exists)
          try {
            await fetch("/api/push/subscribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(subscription),
            });
          } catch {
            // Server endpoint may not exist yet, that is fine
          }
        } catch {
          // Push subscription may fail without VAPID key, but permission is granted
        }
        localStorage.setItem(PUSH_STATUS_KEY, "subscribed");
      }
    } catch {
      // Permission request failed
    }
    setSubscribing(false);
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(PUSH_DISMISS_KEY, "1");
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-[39]"
        >
          <div
            className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ boxShadow: "0 4px 24px rgba(15,27,58,0.12), 0 1px 4px rgba(15,27,58,0.06)" }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #9A7A30 0%, #D4A843 100%)" }}
            >
              <Bell size={20} className="text-white" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#0F1B3A] leading-tight">Match updates</p>
              <p className="text-[11px] text-[#0F1B3A]/50 leading-snug mt-0.5">
                Get notified for kickoffs and results
              </p>
            </div>

            {/* Actions */}
            <button
              onClick={handleEnable}
              disabled={subscribing}
              className="shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #1A6B3C 0%, #2D8A52 100%)",
                boxShadow: "0 2px 8px rgba(26,107,60,0.3)",
              }}
            >
              {subscribing ? "..." : "Enable"}
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#0F1B3A]/5 transition-colors"
              aria-label="Not now"
            >
              <X size={14} className="text-[#0F1B3A]/40" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
