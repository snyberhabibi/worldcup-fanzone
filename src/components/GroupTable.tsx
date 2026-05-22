"use client";

import { type Team } from "@/data/schedule";

interface GroupTableProps {
  groupName: string;
  teams: Team[];
}

export default function GroupTable({ groupName, teams }: GroupTableProps) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(15,27,58,0.05)" }}
    >
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#0F1B3A]/5">
        <span
          className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold text-[#7a6020]"
          style={{ backgroundColor: "rgba(201,162,75,0.15)" }}
        >
          Group {groupName}
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(15,27,58,0.35)" }}>
            <th className="text-left py-2.5 pl-4 pr-1 font-semibold">Team</th>
            <th className="w-8 text-center py-2.5 font-semibold">W</th>
            <th className="w-8 text-center py-2.5 font-semibold">D</th>
            <th className="w-8 text-center py-2.5 font-semibold">L</th>
            <th className="w-10 text-center py-2.5 pr-4 font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => (
            <tr
              key={team.code}
              style={{ backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#FAF8F3" }}
            >
              <td className="py-3 pl-4 pr-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold w-4 text-center tabular-nums" style={{ color: "rgba(15,27,58,0.3)" }}>
                    {idx + 1}
                  </span>
                  <span className="text-lg leading-none">{team.flag_emoji}</span>
                  <span className="font-semibold text-[#0F1B3A] text-sm">
                    {team.name}
                  </span>
                </div>
              </td>
              <td className="text-center tabular-nums text-sm" style={{ color: "rgba(15,27,58,0.4)" }}>0</td>
              <td className="text-center tabular-nums text-sm" style={{ color: "rgba(15,27,58,0.4)" }}>0</td>
              <td className="text-center tabular-nums text-sm" style={{ color: "rgba(15,27,58,0.4)" }}>0</td>
              <td className="text-center font-bold tabular-nums pr-4 text-sm" style={{ color: "#9A7A30" }}>0</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
