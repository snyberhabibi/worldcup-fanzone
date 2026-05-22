import { NextRequest, NextResponse } from "next/server";
import { getVotesFromSheet, updateVotesInSheet } from "@/lib/google-sheets";
import { MATCHES, TEAMS } from "@/data/schedule";

// GET /api/votes?matchId=1
export async function GET(request: NextRequest) {
  const matchId = request.nextUrl.searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  try {
    const votes = await getVotesFromSheet(Number(matchId));
    if (votes) {
      return NextResponse.json(votes);
    }
    // Return zeros if no votes yet
    return NextResponse.json({
      matchId: Number(matchId),
      homeVotes: 0,
      awayVotes: 0,
    });
  } catch (error) {
    console.error("Failed to get votes:", error);
    return NextResponse.json(
      { error: "Failed to fetch votes" },
      { status: 500 }
    );
  }
}

// POST /api/votes
// body: { matchId: number, side: "home" | "away", action: "cast" | "increment" | "decrement" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, side, action } = body;

    if (!matchId || !side || !action) {
      return NextResponse.json(
        { error: "matchId, side, and action required" },
        { status: 400 }
      );
    }

    // Get current votes
    let votes = await getVotesFromSheet(Number(matchId));
    const match = MATCHES.find((m) => m.id === Number(matchId));

    const homeTeam = match ? TEAMS[match.homeTeam]?.name || match.homeTeam : "";
    const awayTeam = match ? TEAMS[match.awayTeam]?.name || match.awayTeam : "";

    if (!votes) {
      votes = {
        matchId: Number(matchId),
        homeTeam,
        awayTeam,
        homeVotes: 0,
        awayVotes: 0,
      };
    }

    // Apply action
    if (action === "cast" || action === "increment") {
      if (side === "home") votes.homeVotes++;
      else votes.awayVotes++;
    } else if (action === "decrement") {
      if (side === "home") votes.homeVotes = Math.max(0, votes.homeVotes - 1);
      else votes.awayVotes = Math.max(0, votes.awayVotes - 1);
    } else if (action === "change") {
      // User is changing their vote: decrement old side, increment new side
      // The old side is passed as body.oldSide
      const oldSide = body.oldSide;
      if (oldSide === "home") votes.homeVotes = Math.max(0, votes.homeVotes - 1);
      else if (oldSide === "away") votes.awayVotes = Math.max(0, votes.awayVotes - 1);
      if (side === "home") votes.homeVotes++;
      else votes.awayVotes++;
    }

    // Write back to sheet
    await updateVotesInSheet(
      votes.matchId,
      homeTeam,
      awayTeam,
      votes.homeVotes,
      votes.awayVotes
    );

    return NextResponse.json({
      matchId: votes.matchId,
      homeVotes: votes.homeVotes,
      awayVotes: votes.awayVotes,
    });
  } catch (error) {
    console.error("Failed to update votes:", error);
    return NextResponse.json(
      { error: "Failed to update votes" },
      { status: 500 }
    );
  }
}
