export interface VoteCount {
  matchId: number;
  homeVotes: number;
  awayVotes: number;
}

export interface RaffleEntry {
  id: string;
  raffleId: string;
  name: string;
  phone: string;
  email: string;
  enteredAt: string;
}

export interface Raffle {
  id: string;
  name: string;
  description: string;
  status: "active" | "closed" | "drawn";
  winnerId?: string;
  winnerName?: string;
  createdAt: string;
  closedAt?: string;
}

export interface FanzoneEvent {
  id: string;
  name: string;
  location: string;
  address: string;
  date: string;
  time: string;
  active: boolean;
}
