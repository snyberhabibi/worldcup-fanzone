"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, Vote, Gift, Shield } from "lucide-react";

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
      {/* Glass background */}
      <div className="absolute inset-0 bg-navy/85 backdrop-blur-xl border-t border-gold/15" />

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
              className={`
                flex flex-col items-center justify-center gap-0.5 flex-1 py-2
                transition-all duration-200 rounded-xl
                ${isActive
                  ? "text-gold scale-105"
                  : "text-cream/40 active:text-cream/60 active:scale-95"
                }
              `}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className="transition-all duration-200"
                />
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                )}
              </div>
              <span
                className={`text-[10px] font-medium leading-tight transition-all duration-200 ${
                  isActive ? "font-semibold" : ""
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
