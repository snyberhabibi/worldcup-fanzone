import { TEAMS } from "@/data/schedule";

/**
 * Convert Eastern Time (ET) string to Central Time (CT).
 * Input format: "3:00 PM", "12:30 AM", etc.
 */
export function etToCt(etTime: string): string {
  const m = etTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return etTime;
  let hours = parseInt(m[1], 10);
  const minutes = m[2];
  const period = m[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  hours = (hours - 1 + 24) % 24;
  const newPeriod = hours >= 12 ? "PM" : "AM";
  let displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;
  return `${displayHours}:${minutes} ${newPeriod}`;
}

/**
 * Get display info (flag, name, code) for a team by FIFA code.
 */
export function getTeamDisplay(code: string) {
  const team = TEAMS[code];
  if (team) return { flag: team.flag_emoji, name: team.name, code: team.code };
  return { flag: "", name: code, code };
}
