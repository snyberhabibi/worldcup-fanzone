import { google } from "googleapis";

const SHEET_ID = process.env.GOOGLE_SHEET_ID || "10ch5yHsnDt_YNvf-D7LbFc_ZvaAfJksqFJ5kUo7zw68";

function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error("Missing Google service account credentials");
  }

  return new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

// ── VOTES ──────────────────────────────────────────

export interface SheetVotes {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeVotes: number;
  awayVotes: number;
}

export async function getVotesFromSheet(matchId: number): Promise<SheetVotes | null> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Votes!A:F",
  });

  const rows = res.data.values || [];
  // Skip header row
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(matchId)) {
      return {
        matchId: Number(rows[i][0]),
        homeTeam: rows[i][1] || "",
        awayTeam: rows[i][2] || "",
        homeVotes: Number(rows[i][3]) || 0,
        awayVotes: Number(rows[i][4]) || 0,
      };
    }
  }
  return null;
}

export async function updateVotesInSheet(
  matchId: number,
  homeTeam: string,
  awayTeam: string,
  homeVotes: number,
  awayVotes: number
): Promise<void> {
  const sheets = getSheets();
  const now = new Date().toISOString();

  // Check if row exists
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Votes!A:A",
  });

  const rows = res.data.values || [];
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(matchId)) {
      rowIndex = i;
      break;
    }
  }

  const values = [[String(matchId), homeTeam, awayTeam, String(homeVotes), String(awayVotes), now]];

  if (rowIndex >= 0) {
    // Update existing row
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Votes!A${rowIndex + 1}:F${rowIndex + 1}`,
      valueInputOption: "RAW",
      requestBody: { values },
    });
  } else {
    // Append new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: "Votes!A:F",
      valueInputOption: "RAW",
      requestBody: { values },
    });
  }
}

// ── ALL VOTES (for loading all at once) ────────────

export async function getAllVotesFromSheet(): Promise<SheetVotes[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "Votes!A:F",
  });

  const rows = res.data.values || [];
  const votes: SheetVotes[] = [];
  for (let i = 1; i < rows.length; i++) {
    votes.push({
      matchId: Number(rows[i][0]),
      homeTeam: rows[i][1] || "",
      awayTeam: rows[i][2] || "",
      homeVotes: Number(rows[i][3]) || 0,
      awayVotes: Number(rows[i][4]) || 0,
    });
  }
  return votes;
}
