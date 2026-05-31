"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Share, Gift, Download, ChevronRight, Smartphone } from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "fanzone-install-dismissed";
const DISMISS_DURATION = 4 * 60 * 60 * 1000; // 4 hours — shows again every session basically

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
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      // Defer the state update out of the effect body to avoid a synchronous
      // setState cascade flagged by react-hooks/set-state-in-effect.
      queueMicrotask(() => setShowIOS(true));
      // Show after 2 seconds on iOS
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
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

  if (!visible) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 200, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 200, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed inset-x-0 bottom-[calc(80px+env(safe-area-inset-bottom,0px))] z-50 px-3"
        >
          <div
            className="bg-white rounded-2xl overflow-hidden"
            style={{ boxShadow: "0 -4px 30px rgba(15,27,58,0.15), 0 2px 8px rgba(15,27,58,0.08)" }}
          >
            {/* Header — always visible */}
            <div className="px-4 pt-4 pb-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shrink-0 bg-[#F5F0E8] flex items-center justify-center">
                <Image
                  src="/icons/icon-192.png"
                  alt="Fanzone"
                  width={40}
                  height={40}
                  className="rounded-xl"
                  unoptimized
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Gift size={14} className="text-red shrink-0" />
                  <p className="text-sm font-extrabold text-navy leading-tight">
                    Get the App — Free Raffle Entry!
                  </p>
                </div>
                <p className="text-[12px] text-navy/60 leading-snug">
                  Download now and enter to win prizes at the fanzone
                </p>
              </div>

              <button
                onClick={handleDismiss}
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-navy/5"
                aria-label="Dismiss"
              >
                <X size={16} className="text-navy/40" />
              </button>
            </div>

            {/* Android — direct install button */}
            {!showIOS && deferredPrompt && (
              <div className="px-4 pb-4">
                <button
                  onClick={handleInstall}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                  style={{
                    background: "linear-gradient(135deg, #1A6B3C 0%, #2D8A52 100%)",
                    boxShadow: "0 4px 12px rgba(26,107,60,0.3)",
                  }}
                >
                  <Download size={18} />
                  Install App Now
                </button>
              </div>
            )}

            {/* iOS — step by step instructions */}
            {showIOS && (
              <div className="px-4 pb-4">
                {!expanded ? (
                  <button
                    onClick={() => setExpanded(true)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 active:scale-[0.97] transition-transform"
                    style={{
                      background: "linear-gradient(135deg, #1A6B3C 0%, #2D8A52 100%)",
                      boxShadow: "0 4px 12px rgba(26,107,60,0.3)",
                    }}
                  >
                    <Smartphone size={18} />
                    Add to Home Screen
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-navy/70 uppercase tracking-wider">
                      Follow these steps:
                    </p>

                    {/* Step 1 */}
                    <div className="flex items-start gap-3 bg-[#F5F0E8] rounded-xl p-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                        1
                      </span>
                      <div>
                        <p className="text-sm font-bold text-navy">
                          Tap the Share button
                          <Share size={16} className="inline ml-1.5 text-[#007AFF]" />
                        </p>
                        <p className="text-[12px] text-navy/50 mt-0.5">
                          It&apos;s at the bottom of your Safari browser
                        </p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-3 bg-[#F5F0E8] rounded-xl p-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                        2
                      </span>
                      <div>
                        <p className="text-sm font-bold text-navy">
                          Scroll down and tap &quot;Add to Home Screen&quot;
                        </p>
                        <p className="text-[12px] text-navy/50 mt-0.5">
                          Look for the + icon in the share menu
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-3 bg-[#F5F0E8] rounded-xl p-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center">
                        3
                      </span>
                      <div>
                        <p className="text-sm font-bold text-navy">
                          Tap &quot;Add&quot; to confirm
                        </p>
                        <p className="text-[12px] text-navy/50 mt-0.5">
                          The app will appear on your home screen!
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDismiss}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-navy/40 active:text-navy/60"
                    >
                      I&apos;ll do it later
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* No prompt available (desktop or unsupported) */}
            {!showIOS && !deferredPrompt && (
              <div className="px-4 pb-4">
                <p className="text-[12px] text-navy/50 text-center">
                  Open this site on your phone and tap &quot;Add to Home Screen&quot; for the full experience
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
