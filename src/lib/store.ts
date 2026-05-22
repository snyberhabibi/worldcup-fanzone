import { VoteCount, RaffleEntry, Raffle, FanzoneEvent } from "@/types";

const STORAGE_PREFIX = "wc26_";

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

// ── VOTES ──────────────────────────────────────────

export function getVotes(matchId: number): VoteCount {
  return getItem<VoteCount>(`votes_${matchId}`, {
    matchId,
    homeVotes: 0,
    awayVotes: 0,
  });
}

export function incrementVote(matchId: number, side: "home" | "away"): VoteCount {
  const votes = getVotes(matchId);
  if (side === "home") votes.homeVotes++;
  else votes.awayVotes++;
  setItem(`votes_${matchId}`, votes);
  return votes;
}

export function decrementVote(matchId: number, side: "home" | "away"): VoteCount {
  const votes = getVotes(matchId);
  if (side === "home") votes.homeVotes = Math.max(0, votes.homeVotes - 1);
  else votes.awayVotes = Math.max(0, votes.awayVotes - 1);
  setItem(`votes_${matchId}`, votes);
  return votes;
}

// ── PUBLIC VOTING (one vote per person, changeable) ─

export function getMyVote(matchId: number): "home" | "away" | null {
  return getItem<"home" | "away" | null>(`myvote_${matchId}`, null);
}

export function castPublicVote(matchId: number, side: "home" | "away"): VoteCount {
  const currentVote = getMyVote(matchId);
  const votes = getVotes(matchId);

  if (currentVote === side) {
    // Already voted this side, no change
    return votes;
  }

  // Remove old vote if changing
  if (currentVote !== null) {
    if (currentVote === "home") votes.homeVotes = Math.max(0, votes.homeVotes - 1);
    else votes.awayVotes = Math.max(0, votes.awayVotes - 1);
  }

  // Add new vote
  if (side === "home") votes.homeVotes++;
  else votes.awayVotes++;

  setItem(`votes_${matchId}`, votes);
  setItem(`myvote_${matchId}`, side);
  return votes;
}

// ── RAFFLES ────────────────────────────────────────

export function getRaffles(): Raffle[] {
  return getItem<Raffle[]>("raffles", []);
}

export function createRaffle(name: string, description: string): Raffle {
  const raffles = getRaffles();
  const raffle: Raffle = {
    id: crypto.randomUUID(),
    name,
    description,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  raffles.push(raffle);
  setItem("raffles", raffles);
  return raffle;
}

export function closeRaffle(raffleId: string): void {
  const raffles = getRaffles();
  const raffle = raffles.find((r) => r.id === raffleId);
  if (raffle) {
    raffle.status = "closed";
    raffle.closedAt = new Date().toISOString();
    setItem("raffles", raffles);
  }
}

export function drawRaffleWinner(raffleId: string): RaffleEntry | null {
  const raffles = getRaffles();
  const raffle = raffles.find((r) => r.id === raffleId);
  if (!raffle) return null;

  const entries = getRaffleEntries(raffleId);
  if (entries.length === 0) return null;

  const winner = entries[Math.floor(Math.random() * entries.length)];
  raffle.status = "drawn";
  raffle.winnerId = winner.id;
  raffle.winnerName = winner.name;
  raffle.closedAt = new Date().toISOString();
  setItem("raffles", raffles);
  return winner;
}

export function deleteRaffle(raffleId: string): void {
  const raffles = getRaffles().filter((r) => r.id !== raffleId);
  setItem("raffles", raffles);
  // Also remove entries
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_PREFIX + `raffle_entries_${raffleId}`);
  }
}

// ── RAFFLE ENTRIES ─────────────────────────────────

export function getRaffleEntries(raffleId: string): RaffleEntry[] {
  return getItem<RaffleEntry[]>(`raffle_entries_${raffleId}`, []);
}

export function addRaffleEntry(
  raffleId: string,
  name: string,
  phone: string,
  email: string
): { success: boolean; error?: string } {
  const entries = getRaffleEntries(raffleId);

  // Check for duplicate phone
  if (entries.some((e) => e.phone === phone)) {
    return { success: false, error: "This phone number has already entered this raffle." };
  }

  const entry: RaffleEntry = {
    id: crypto.randomUUID(),
    raffleId,
    name,
    phone,
    email,
    enteredAt: new Date().toISOString(),
  };
  entries.push(entry);
  setItem(`raffle_entries_${raffleId}`, entries);
  return { success: true };
}

// ── EVENTS ─────────────────────────────────────────

const DEFAULT_EVENTS: FanzoneEvent[] = [
  {
    id: "dar-plano",
    name: "DAR Coffee — Plano",
    location: "DAR Coffee",
    address: "Plano, TX",
    date: "2026-06-11",
    time: "Every match day",
    active: true,
  },
  {
    id: "dar-frisco",
    name: "DAR Coffee — Frisco",
    location: "DAR Coffee",
    address: "Frisco, TX",
    date: "2026-06-11",
    time: "Every match day",
    active: false,
  },
  {
    id: "yb-hq",
    name: "Yalla Bites HQ",
    location: "Yalla Bites",
    address: "Dallas, TX",
    date: "2026-06-11",
    time: "Select match days",
    active: false,
  },
];

export function getEvents(): FanzoneEvent[] {
  const stored = getItem<FanzoneEvent[] | null>("events", null);
  if (!stored) {
    setItem("events", DEFAULT_EVENTS);
    return DEFAULT_EVENTS;
  }
  return stored;
}

export function updateEvent(event: FanzoneEvent): void {
  const events = getEvents();
  const idx = events.findIndex((e) => e.id === event.id);
  if (idx >= 0) events[idx] = event;
  else events.push(event);
  setItem("events", events);
}

export function addEvent(event: Omit<FanzoneEvent, "id">): FanzoneEvent {
  const events = getEvents();
  const newEvent: FanzoneEvent = { ...event, id: crypto.randomUUID() };
  events.push(newEvent);
  setItem("events", events);
  return newEvent;
}

export function deleteEvent(eventId: string): void {
  const events = getEvents().filter((e) => e.id !== eventId);
  setItem("events", events);
}

// ── ADMIN AUTH ──────────────────────────────────────

const ADMIN_PIN = "2026";

export function verifyPin(pin: string): boolean {
  return pin === ADMIN_PIN;
}

export function isAdminAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem("wc26_admin") === "true";
}

export function setAdminAuthenticated(): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("wc26_admin", "true");
}

export function logoutAdmin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem("wc26_admin");
}

// ── PUSH NOTIFICATIONS ─────────────────────────────

export function getPushSubscriptions(): string[] {
  return getItem<string[]>("push_subs", []);
}

export function addPushSubscription(endpoint: string): void {
  const subs = getPushSubscriptions();
  if (!subs.includes(endpoint)) {
    subs.push(endpoint);
    setItem("push_subs", subs);
  }
}
