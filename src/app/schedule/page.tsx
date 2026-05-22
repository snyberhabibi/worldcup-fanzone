"use client";

import { useState, useMemo, useRef } from "react";
import { MATCHES, GROUPS, TEAMS, type Match } from "@/data/schedule";
import MatchCard from "@/components/MatchCard";
import GroupTable from "@/components/GroupTable";
import { Search, X } from "lucide-react";

type Tab = "groups" | "schedule" | "knockout";

function etToCt(etTime: string): string {
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

function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/Chicago",
  });
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

export default function SchedulePage() {
  const [activeTab, setActiveTab] = useState<Tab>("groups");
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Group stage matches sorted by date
  const groupMatches = useMemo(() => {
    return [...MATCHES]
      .filter((m) => m.stage === "group")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, []);

  // Knockout matches by stage
  const knockoutStages = useMemo(() => {
    const stages: { label: string; stage: Match["stage"]; matches: Match[] }[] = [
      { label: "Round of 32", stage: "round-of-32", matches: [] },
      { label: "Round of 16", stage: "round-of-16", matches: [] },
      { label: "Quarterfinals", stage: "quarterfinal", matches: [] },
      { label: "Semifinals", stage: "semifinal", matches: [] },
      { label: "Third Place", stage: "third-place", matches: [] },
      { label: "Final", stage: "final", matches: [] },
    ];

    MATCHES.filter((m) => m.stage !== "group")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .forEach((match) => {
        const group = stages.find((s) => s.stage === match.stage);
        if (group) group.matches.push(match);
      });

    return stages;
  }, []);

  // Group matches by date
  const matchesByDate = useMemo(() => {
    const map = new Map<string, { label: string; matches: Match[] }>();
    groupMatches.forEach((match) => {
      const key = getDateKey(match.date);
      if (!map.has(key)) {
        map.set(key, { label: formatDateHeader(match.date), matches: [] });
      }
      map.get(key)!.matches.push(match);
    });
    return Array.from(map.entries());
  }, [groupMatches]);

  // Search filter
  const filteredGroups = useMemo(() => {
    if (!search.trim()) return GROUPS;
    const q = search.toLowerCase();
    return GROUPS.filter(
      (g) =>
        g.teams.some(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.code.toLowerCase().includes(q)
        ) || `group ${g.groupName}`.toLowerCase().includes(q)
    );
  }, [search]);

  const filteredMatchesByDate = useMemo(() => {
    if (!search.trim()) return matchesByDate;
    const q = search.toLowerCase();
    return matchesByDate
      .map(([key, { label, matches }]) => {
        const filtered = matches.filter((m) => {
          const home = TEAMS[m.homeTeam];
          const away = TEAMS[m.awayTeam];
          return (
            home?.name.toLowerCase().includes(q) ||
            away?.name.toLowerCase().includes(q) ||
            m.homeTeam.toLowerCase().includes(q) ||
            m.awayTeam.toLowerCase().includes(q) ||
            m.venue.toLowerCase().includes(q) ||
            m.city.toLowerCase().includes(q)
          );
        });
        return [key, { label, matches: filtered }] as [string, { label: string; matches: Match[] }];
      })
      .filter(([, { matches }]) => matches.length > 0);
  }, [search, matchesByDate]);

  const filteredKnockout = useMemo(() => {
    if (!search.trim()) return knockoutStages;
    const q = search.toLowerCase();
    return knockoutStages.map((stage) => ({
      ...stage,
      matches: stage.matches.filter((m) => {
        const home = TEAMS[m.homeTeam];
        const away = TEAMS[m.awayTeam];
        return (
          home?.name.toLowerCase().includes(q) ||
          away?.name.toLowerCase().includes(q) ||
          m.homeTeam.toLowerCase().includes(q) ||
          m.awayTeam.toLowerCase().includes(q) ||
          m.venue.toLowerCase().includes(q)
        );
      }),
    }));
  }, [search, knockoutStages]);

  const tabs: { id: Tab; label: string }[] = [
    { id: "groups", label: "Groups" },
    { id: "schedule", label: "Matches" },
    { id: "knockout", label: "Knockout" },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-xl border-b border-navy/5">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-extrabold text-navy">Schedule</h1>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-9 h-9 rounded-xl bg-white flex items-center justify-center active:scale-90 transition-transform shadow-sm"
            >
              {showSearch ? <X size={18} className="text-navy/60" /> : <Search size={18} className="text-navy/60" />}
            </button>
          </div>

          {/* Search bar */}
          {showSearch && (
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search teams, venues..."
                autoFocus
                className="w-full bg-white border border-navy/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 shadow-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X size={14} className="text-navy/30" />
                </button>
              )}
            </div>
          )}

          {/* Tab bar */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gold text-white"
                    : "text-navy/40 active:text-navy/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div ref={scrollRef} className="px-5 py-5">
        {/* Groups Tab */}
        {activeTab === "groups" && (
          <div id="groups" className="grid grid-cols-2 gap-3">
            {filteredGroups.map((group) => (
              <GroupTable
                key={group.groupName}
                groupName={group.groupName}
                teams={group.teams}
              />
            ))}
            {filteredGroups.length === 0 && (
              <div className="col-span-2 text-center py-16">
                <p className="text-navy/30 text-sm">No groups match your search.</p>
              </div>
            )}
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === "schedule" && (
          <div className="space-y-5">
            {filteredMatchesByDate.map(([dateKey, { label, matches }]) => (
              <div key={dateKey}>
                {/* Date header */}
                <div className="sticky top-[140px] z-30 bg-cream/90 backdrop-blur-md -mx-5 px-5 py-2 border-b border-gold/10 mb-3">
                  <h3 className="text-xs font-bold text-gold uppercase tracking-wider">
                    {label}
                  </h3>
                  <span className="text-[10px] text-navy/30">
                    {matches.length} match{matches.length !== 1 ? "es" : ""}
                  </span>
                </div>
                <div className="space-y-2">
                  {matches.map((match) => (
                    <MatchCard key={match.id} match={match} compact />
                  ))}
                </div>
              </div>
            ))}
            {filteredMatchesByDate.length === 0 && (
              <div className="text-center py-16">
                <p className="text-navy/30 text-sm">No matches found.</p>
              </div>
            )}
          </div>
        )}

        {/* Knockout Tab */}
        {activeTab === "knockout" && (
          <div className="space-y-6">
            {filteredKnockout.map((stage) => (
              <div key={stage.stage}>
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-extrabold text-gold">{stage.label}</h3>
                  <div className="flex-1 h-px bg-gold/15" />
                  <span className="text-[10px] text-navy/30 font-medium">
                    {stage.matches.length} match{stage.matches.length !== 1 ? "es" : ""}
                  </span>
                </div>
                {stage.matches.length > 0 ? (
                  <div className="space-y-2">
                    {stage.matches.map((match) => (
                      <MatchCard key={match.id} match={match} compact />
                    ))}
                  </div>
                ) : (
                  <div className="card-light p-4 text-center">
                    <p className="text-navy/30 text-xs">TBD - Determined by group stage results</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
