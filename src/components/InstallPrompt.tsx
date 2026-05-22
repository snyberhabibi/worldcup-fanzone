"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Plus } from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fanzone-install-dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  );
}

function isDismissed(): boolean {
  if (typeof localStorage === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Date.now() - ts < DISMISS_DURATION) return true;
  localStorage.removeItem(DISMISS_KEY);
  return false;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      setShowIOS(true);
      setVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-40"
        >
          <div
            className="bg-white rounded-2xl px-4 py-3.5 flex items-center gap-3"
            style={{ boxShadow: "0 4px 24px rgba(15,27,58,0.12), 0 1px 4px rgba(15,27,58,0.06)" }}
          >
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 bg-[#F5F0E8] flex items-center justify-center">
              <Image
                src="/icons/icon-192.png"
                alt="Fanzone"
                width={32}
                height={32}
                className="rounded-lg"
              />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              {showIOS ? (
                <>
                  <p className="text-sm font-bold text-[#0F1B3A] leading-tight">Add to Home Screen</p>
                  <p className="text-[11px] text-[#0F1B3A]/50 leading-snug mt-0.5 flex items-center gap-1">
                    Tap <Share size={11} className="inline text-[#007AFF]" /> then <Plus size={11} className="inline" /> Add to Home Screen
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-bold text-[#0F1B3A] leading-tight">Add to Home Screen</p>
                  <p className="text-[11px] text-[#0F1B3A]/50 leading-snug mt-0.5">
                    Quick access to matches and votes
                  </p>
                </>
              )}
            </div>

            {/* Actions */}
            {!showIOS && (
              <button
                onClick={handleInstall}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #9A7A30 0%, #D4A843 100%)",
                  boxShadow: "0 2px 8px rgba(201,162,75,0.3)",
                }}
              >
                Install
              </button>
            )}

            {/* Close */}
            <button
              onClick={handleDismiss}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#0F1B3A]/5 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} className="text-[#0F1B3A]/40" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
