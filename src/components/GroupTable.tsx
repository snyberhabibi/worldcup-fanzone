"use client";

import { type Team } from "@/data/schedule";

interface GroupTableProps {
  groupName: string;
  teams: Team[];
}

export default function GroupTable({ groupName, teams }: GroupTableProps) {
  return (
    <div className="glass-card overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-gold/10">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-gold/15 text-gold text-sm font-extrabold">
          {groupName}
        </span>
        <span className="text-cream/70 text-sm font-semibold">
          Group {groupName}
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-cream/30 text-[10px] uppercase tracking-wider">
            <th className="text-left py-2 pl-4 pr-2 font-medium">Team</th>
            <th className="w-9 text-center py-2 font-medium">W</th>
            <th className="w-9 text-center py-2 font-medium">D</th>
            <th className="w-9 text-center py-2 font-medium">L</th>
            <th className="w-10 text-center py-2 pr-4 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => (
            <tr
              key={team.code}
              className={`
                border-t border-cream/5 transition-colors
                ${idx < 2 ? "bg-gold/[0.03]" : ""}
              `}
            >
              <td className="py-2.5 pl-4 pr-2">
                <div className="flex items-center gap-2">
                  <span className="text-cream/30 text-[10px] font-bold w-3 text-center">
                    {idx + 1}
                  </span>
                  <span className="text-lg leading-none">{team.flag_emoji}</span>
                  <span className="font-medium text-cream/90 text-sm truncate">
                    {team.name}
                  </span>
                </div>
              </td>
              <td className="text-center text-cream/40 tabular-nums">0</td>
              <td className="text-center text-cream/40 tabular-nums">0</td>
              <td className="text-center text-cream/40 tabular-nums">0</td>
              <td className="text-center text-gold font-bold tabular-nums pr-4">0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
