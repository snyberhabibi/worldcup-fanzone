"use client";

import { type Team } from "@/data/schedule";
import { motion } from "framer-motion";

interface GroupTableProps {
  groupName: string;
  teams: Team[];
}

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0 },
};

const tableStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function GroupTable({ groupName, teams }: GroupTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-white rounded-2xl overflow-hidden min-w-0"
      style={{ boxShadow: "0 2px 12px rgba(15,27,58,0.05)" }}
    >
      {/* Group header */}
      <div className="flex items-center gap-2.5 px-3 py-3 border-b border-[#0F1B3A]/5">
        <span
          className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-extrabold text-[#7a6020]"
          style={{ backgroundColor: "rgba(201,162,75,0.15)" }}
        >
          Group {groupName}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(15,27,58,0.3)" }}>
            <th className="text-left py-2.5 pl-3 pr-1 font-semibold">Team</th>
            <th className="w-7 text-center py-2.5 font-semibold">W</th>
            <th className="w-7 text-center py-2.5 font-semibold">D</th>
            <th className="w-7 text-center py-2.5 font-semibold">L</th>
            <th className="w-8 text-center py-2.5 pr-3 font-semibold">Pts</th>
          </tr>
        </thead>
        <motion.tbody
          initial="hidden"
          animate="visible"
          variants={tableStagger}
        >
          {teams.map((team, idx) => (
            <motion.tr
              key={team.code}
              variants={rowVariants}
              style={{
                backgroundColor: idx % 2 === 0 ? "#FFFFFF" : "#F5F0E8",
              }}
            >
              <td className="py-3 pl-3 pr-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-[10px] font-bold w-3 shrink-0 text-center tabular-nums"
                    style={{ color: "rgba(15,27,58,0.25)" }}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-base leading-none shrink-0">{team.flag_emoji}</span>
                  <span className="font-medium text-[#0F1B3A] text-xs truncate min-w-0">
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
                className="text-center font-bold tabular-nums pr-3"
                style={{ color: "#C9A24B" }}
              >
                0
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
      </div>
    </motion.div>
  );
}
