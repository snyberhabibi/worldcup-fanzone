"use client";

import { type Team } from "@/data/schedule";
import { motion } from "framer-motion";

interface GroupTableProps {
  groupName: string;
  teams: Team[];
}

export default function GroupTable({ groupName, teams }: GroupTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ boxShadow: "0 2px 12px rgba(15,27,58,0.05)" }}
    >
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#0F1B3A]/5">
        <span
          className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-extrabold text-[#C9A24B]"
          style={{ backgroundColor: "rgba(201,162,75,0.1)" }}
        >
          Group {groupName}
        </span>
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider" style={{ color: "rgba(15,27,58,0.3)" }}>
            <th className="text-left py-2.5 pl-4 pr-2 font-semibold">Team</th>
            <th className="w-9 text-center py-2.5 font-semibold">W</th>
            <th className="w-9 text-center py-2.5 font-semibold">D</th>
            <th className="w-9 text-center py-2.5 font-semibold">L</th>
            <th className="w-10 text-center py-2.5 pr-4 font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team, idx) => (
            <tr
              key={team.code}
              style={{
                backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F5F0E8",
              }}
            >
              <td className="py-3 pl-4 pr-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className="text-[11px] font-bold w-4 text-center tabular-nums"
                    style={{ color: "rgba(15,27,58,0.25)" }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-lg leading-none">{team.flag_emoji}</span>
                  <span className="font-medium text-[#0F1B3A] text-sm truncate">
                    {team.name}
                  </span>
                </div>
              </td>
              <td className="text-center tabular-nums" style={{ color: "rgba(15,27,58,0.35)" }}>
                0
              </td>
              <td className="text-center tabular-nums" style={{ color: "rgba(15,27,58,0.35)" }}>
                0
              </td>
              <td className="text-center tabular-nums" style={{ color: "rgba(15,27,58,0.35)" }}>
                0
              </td>
              <td
                className="text-center font-bold tabular-nums pr-4"
                style={{ color: "#C9A24B" }}
              >
                0
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}
