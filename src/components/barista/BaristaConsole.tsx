"use client";

import { useRouter } from "next/navigation";
import { usePoll } from "@/lib/use-poll";
import { useSound } from "@/lib/use-sound";
import { useHydrated } from "@/lib/use-hydrated";
import { pickDefaultMatchId } from "@/lib/games";
import { BaristaPanel } from "@/components/kiosk/BaristaPanel";
import { Splash } from "@/components/Splash";
import type { SessionState } from "@/types";

// Standalone barista console — works in any orientation, so the owner can run
// the raffle, pause/advance voting, and jump between games straight from a
// phone held vertically (no landscape required, unlike the customer kiosk).
export function BaristaConsole() {
  const mounted = useHydrated();
  const sound = useSound();
  const router = useRouter();

  const { data: session, refresh } = usePoll<SessionState>(
    () => fetch("/api/session").then((r) => r.json()),
    4000
  );

  if (!mounted) return <Splash />;

  const matchId = session?.matchIds?.[0] ?? pickDefaultMatchId(new Date());
  const status = session?.status ?? "open";

  return (
    <main className="screen arcade-bg safe" style={{ alignItems: "center", justifyContent: "center" }}>
      <BaristaPanel
        matchId={matchId}
        status={status}
        pinned={session?.pinned ?? false}
        onChanged={refresh}
        onClose={() => router.push("/")}
        sound={sound}
      />
    </main>
  );
}
