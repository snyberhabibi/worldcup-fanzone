"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Vote, Gift, Shield } from "lucide-react";
import { motion } from "framer-motion";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/vote", label: "Vote", icon: Vote },
  { href: "/raffle", label: "Raffle", icon: Gift },
  { href: "/admin", label: "Admin", icon: Shield },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {/* White frosted glass background with top shadow */}
      <div
        className="absolute inset-0 bg-white/80 backdrop-blur-2xl"
        style={{
          boxShadow: "0 -1px 12px rgba(15,27,58,0.06)",
          borderTop: "1px solid rgba(15,27,58,0.05)",
        }}
      />

      <div className="relative flex items-center justify-around px-2 h-[68px] max-w-lg mx-auto">
        {tabs.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 relative"
            >
              <div className="relative flex flex-col items-center">
                {/* Active pill background */}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -inset-x-3 -inset-y-1.5 rounded-2xl"
                    style={{ backgroundColor: "rgba(201,162,75,0.12)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? "text-[#C9A24B]" : "text-[#0F1B3A]/35"
                  }`}
                />

                {/* Gold dot indicator */}
                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#C9A24B] z-10"
                  />
                )}
              </div>

              <span
                className={`text-[10px] font-medium leading-tight transition-colors duration-200 relative z-10 ${
                  isActive
                    ? "font-semibold text-[#C9A24B]"
                    : "text-[#0F1B3A]/35"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
