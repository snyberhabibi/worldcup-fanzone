"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  verifyPin,
  isAdminAuthenticated,
  setAdminAuthenticated,
  logoutAdmin,
  getVotes,
  incrementVote,
  decrementVote,
  getRaffles,
  createRaffle,
  closeRaffle,
  drawRaffleWinner,
  deleteRaffle,
  getRaffleEntries,
  getEvents,
  addEvent,
  updateEvent,
  deleteEvent,
} from "@/lib/store";
import { MATCHES, TEAMS, type Match } from "@/data/schedule";
import { Raffle, RaffleEntry, FanzoneEvent } from "@/types";
import {
  Shield,
  LogOut,
  Trophy,
  Gift,
  MapPin,
  Bell,
  Plus,
  Trash2,
  ChevronDown,
  Minus,
  Send,
  Users,
  Crown,
  X,
  Check,
  Lock,
} from "lucide-react";

type AdminTab = "votes" | "raffles" | "events" | "push";

// ── PIN Entry ──────────────────────────────────────

function PinEntry({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (verifyPin(newPin)) {
        setAdminAuthenticated();
        onSuccess();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => {
          setPin("");
          setShake(false);
        }, 500);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5">
      <div className="card p-8 w-full max-w-xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-gold" />
        </div>
        <h1 className="text-xl font-extrabold text-navy mb-1">Admin Access</h1>
        <p className="text-navy/40 text-xs mb-8">Enter the 4-digit PIN</p>

        {/* PIN dots */}
        <div
          className={`flex items-center justify-center gap-4 mb-8 ${
            shake ? "animate-[shake_0.3s_ease-in-out]" : ""
          }`}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < pin.length
                  ? error
                    ? "bg-red scale-110"
                    : "bg-gold scale-110"
                  : "bg-navy/10"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-red text-xs font-semibold mb-4">Incorrect PIN</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map(
            (key, idx) => {
              if (key === "") return <div key={`spacer-${idx}`} />;
              if (key === "del") {
                return (
                  <button
                    key="del"
                    onClick={handleDelete}
                    aria-label="Delete digit"
                    className="h-14 rounded-xl bg-navy/5 flex items-center justify-center text-navy/40 active:bg-navy/10 active:scale-95 transition-all"
                  >
                    <X size={20} />
                  </button>
                );
              }
              return (
                <motion.button
                  key={key}
                  onClick={() => handleDigit(key)}
                  whileTap={{ scale: 0.9 }}
                  className="h-14 rounded-xl bg-navy/5 text-navy text-lg font-bold active:bg-gold/20 active:text-gold transition-all"
                >
                  {key}
                </motion.button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vote Management ────────────────────────────────

function VoteManagement() {
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [votes, setVotes] = useState({ matchId: 0, homeVotes: 0, awayVotes: 0 });

  const groupMatches = MATCHES.filter((m) => m.stage === "group").sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const refreshVotes = useCallback(() => {
    if (selectedMatchId !== null) {
      setVotes(getVotes(selectedMatchId));
    }
  }, [selectedMatchId]);

  useEffect(() => {
    refreshVotes();
  }, [refreshVotes]);

  const selectedMatch = selectedMatchId !== null ? MATCHES.find((m) => m.id === selectedMatchId) : undefined;

  const getTeamLabel = (code: string) => {
    const team = TEAMS[code];
    return team ? `${team.flag_emoji} ${team.name}` : code;
  };

  return (
    <div className="space-y-4">
      {/* Match selector */}
      <div>
        <label className="text-xs font-semibold text-navy/60 uppercase tracking-wider block mb-1.5">
          Select Match
        </label>
        <div className="relative">
          <select
            value={selectedMatchId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedMatchId(val ? Number(val) : null);
            }}
            className="w-full appearance-none bg-white border border-navy/10 rounded-xl px-4 py-3 pr-10 text-sm text-navy focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 shadow-sm"
          >
            <option value="">Choose a match...</option>
            {groupMatches.map((m) => (
              <option key={m.id} value={m.id}>
                {TEAMS[m.homeTeam]?.name || m.homeTeam} vs{" "}
                {TEAMS[m.awayTeam]?.name || m.awayTeam} (Group {m.group})
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/30 pointer-events-none"
          />
        </div>
      </div>

      {/* Vote controls */}
      {selectedMatch && (
        <div className="card p-5">
          <h3 className="text-sm font-bold text-navy text-center mb-4">
            {getTeamLabel(selectedMatch.homeTeam)} vs {getTeamLabel(selectedMatch.awayTeam)}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Home votes */}
            <div className="text-center">
              <p className="text-xs text-navy/40 mb-2">{TEAMS[selectedMatch.homeTeam]?.name || selectedMatch.homeTeam}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    decrementVote(selectedMatchId!, "home");
                    refreshVotes();
                  }}
                  aria-label="Decrease home votes"
                  className="w-10 h-10 rounded-xl bg-red/10 text-red flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Minus size={18} />
                </button>
                <span className="text-2xl font-extrabold text-gold w-12 text-center tabular-nums">
                  {votes.homeVotes}
                </span>
                <button
                  onClick={() => {
                    incrementVote(selectedMatchId!, "home");
                    refreshVotes();
                  }}
                  aria-label="Increase home votes"
                  className="w-10 h-10 rounded-xl bg-green/10 text-green flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {/* Away votes */}
            <div className="text-center">
              <p className="text-xs text-navy/40 mb-2">{TEAMS[selectedMatch.awayTeam]?.name || selectedMatch.awayTeam}</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => {
                    decrementVote(selectedMatchId!, "away");
                    refreshVotes();
                  }}
                  aria-label="Decrease away votes"
                  className="w-10 h-10 rounded-xl bg-red/10 text-red flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Minus size={18} />
                </button>
                <span className="text-2xl font-extrabold text-gold w-12 text-center tabular-nums">
                  {votes.awayVotes}
                </span>
                <button
                  onClick={() => {
                    incrementVote(selectedMatchId!, "away");
                    refreshVotes();
                  }}
                  aria-label="Increase away votes"
                  className="w-10 h-10 rounded-xl bg-green/10 text-green flex items-center justify-center active:scale-90 transition-transform"
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-navy/30 text-xs mt-4">
            Total: {votes.homeVotes + votes.awayVotes} votes
          </p>
        </div>
      )}
    </div>
  );
}

// ── Raffle Management ──────────────────────────────

function RaffleManagement() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedRaffle, setExpandedRaffle] = useState<string | null>(null);
  const [entries, setEntries] = useState<RaffleEntry[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRaffles(getRaffles());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (expandedRaffle) {
      setEntries(getRaffleEntries(expandedRaffle));
    }
  }, [expandedRaffle]);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createRaffle(newName.trim(), newDesc.trim());
    setNewName("");
    setNewDesc("");
    setShowCreate(false);
    refresh();
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleDraw = (raffleId: string) => {
    const winner = drawRaffleWinner(raffleId);
    if (winner) {
      showToast(`Winner: ${winner.name} (${winner.phone})`);
    } else {
      showToast("No entries to draw from.");
    }
    refresh();
  };

  const handleClose = (raffleId: string) => {
    closeRaffle(raffleId);
    refresh();
  };

  const handleDelete = (raffleId: string) => {
    if (confirmingDeleteId === raffleId) {
      deleteRaffle(raffleId);
      if (expandedRaffle === raffleId) setExpandedRaffle(null);
      setConfirmingDeleteId(null);
      refresh();
    } else {
      setConfirmingDeleteId(raffleId);
      setTimeout(() => setConfirmingDeleteId(null), 3000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-navy text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg text-center animate-[fade-in_0.2s_ease]">
          {toast}
        </div>
      )}

      {/* Create new */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="w-full card-light p-4 flex items-center justify-center gap-2 text-gold font-bold text-sm active:scale-[0.97] transition-transform"
        >
          <Plus size={18} />
          Create New Raffle
        </button>
      ) : (
        <div className="card p-4 space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Raffle name"
            className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              className="flex-1 bg-gold text-white font-bold py-3 rounded-xl text-sm active:scale-[0.97] transition-transform"
            >
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-3 bg-navy/5 rounded-xl text-sm text-navy/50 active:scale-[0.97] transition-transform"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Raffle list */}
      {raffles.length === 0 && (
        <p className="text-center text-navy/30 text-sm py-8">No raffles yet.</p>
      )}

      {raffles.map((raffle) => (
        <div key={raffle.id} className="card overflow-hidden">
          {/* Header */}
          <button
            onClick={() =>
              setExpandedRaffle(expandedRaffle === raffle.id ? null : raffle.id)
            }
            className="w-full p-4 flex items-center gap-3 text-left"
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                raffle.status === "active"
                  ? "bg-green/10"
                  : raffle.status === "drawn"
                  ? "bg-gold/10"
                  : "bg-navy/5"
              }`}
            >
              {raffle.status === "drawn" ? (
                <Crown size={16} className="text-gold" />
              ) : (
                <Gift size={16} className={raffle.status === "active" ? "text-green" : "text-navy/30"} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-navy truncate">{raffle.name}</p>
              <p className="text-[11px] text-navy/40">
                {raffle.status === "active" && "Active"}
                {raffle.status === "closed" && "Closed"}
                {raffle.status === "drawn" && `Winner: ${raffle.winnerName}`}
              </p>
            </div>
            <ChevronDown
              size={16}
              className={`text-navy/30 transition-transform ${
                expandedRaffle === raffle.id ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Expanded content */}
          {expandedRaffle === raffle.id && (
            <div className="px-4 pb-4 border-t border-navy/5 pt-3 space-y-3">
              {/* Actions */}
              {raffle.status === "active" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDraw(raffle.id)}
                    className="flex-1 bg-gold/10 text-gold font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-[0.97] transition-transform"
                  >
                    <Crown size={14} />
                    Draw Winner
                  </button>
                  <button
                    onClick={() => handleClose(raffle.id)}
                    className="flex-1 bg-navy/5 text-navy/50 font-bold py-2.5 rounded-xl text-xs active:scale-[0.97] transition-transform"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Entries */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users size={14} className="text-navy/40" />
                  <span className="text-xs font-semibold text-navy/50">
                    {entries.length} Entries
                  </span>
                </div>
                {entries.length > 0 ? (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between bg-cream rounded-lg px-3 py-2"
                      >
                        <div>
                          <p className="text-xs font-semibold text-navy">{entry.name}</p>
                          <p className="text-[11px] text-navy/30">{entry.phone}</p>
                        </div>
                        <span className="text-[11px] text-navy/20">
                          {new Date(entry.enteredAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-navy/20 text-center py-4">No entries yet.</p>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => handleDelete(raffle.id)}
                className={`w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 transition-colors ${
                  confirmingDeleteId === raffle.id
                    ? "text-red bg-red/10 rounded-lg"
                    : "text-red/60 active:text-red"
                }`}
              >
                <Trash2 size={12} />
                {confirmingDeleteId === raffle.id ? "Tap again to confirm" : "Delete Raffle"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Event Management ───────────────────────────────

function EventManagement() {
  const [events, setEvents] = useState<FanzoneEvent[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    location: "",
    address: "",
    date: "",
    time: "",
    active: true,
  });

  const refresh = useCallback(() => {
    setEvents(getEvents());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resetForm = () => {
    setForm({ name: "", location: "", address: "", date: "", time: "", active: true });
    setShowAdd(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.address.trim()) return;

    if (editingId) {
      updateEvent({ id: editingId, ...form });
    } else {
      addEvent(form);
    }
    resetForm();
    refresh();
  };

  const handleEdit = (event: FanzoneEvent) => {
    setEditingId(event.id);
    setForm({
      name: event.name,
      location: event.location,
      address: event.address,
      date: event.date,
      time: event.time,
      active: event.active,
    });
    setShowAdd(true);
  };

  const handleDelete = (eventId: string) => {
    if (confirmingDeleteId === eventId) {
      deleteEvent(eventId);
      setConfirmingDeleteId(null);
      refresh();
    } else {
      setConfirmingDeleteId(eventId);
      setTimeout(() => setConfirmingDeleteId(null), 3000);
    }
  };

  const toggleActive = (event: FanzoneEvent) => {
    updateEvent({ ...event, active: !event.active });
    refresh();
  };

  return (
    <div className="space-y-4">
      {/* Add/Edit form */}
      {!showAdd ? (
        <button
          onClick={() => {
            resetForm();
            setShowAdd(true);
          }}
          className="w-full card-light p-4 flex items-center justify-center gap-2 text-gold font-bold text-sm active:scale-[0.97] transition-transform"
        >
          <Plus size={18} />
          Add Watch Location
        </button>
      ) : (
        <div className="card p-4 space-y-3">
          <h3 className="text-sm font-bold text-navy">
            {editingId ? "Edit Location" : "New Location"}
          </h3>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Event name"
            className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
          <input
            type="text"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Location name"
            className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
          <input
            type="text"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Address / City"
            className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
            <input
              type="text"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              placeholder="Time info"
              className="bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                form.active ? "bg-green" : "bg-navy/10"
              }`}
              onClick={() => setForm({ ...form, active: !form.active })}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${
                  form.active ? "left-5" : "left-1"
                }`}
              />
            </div>
            <span className="text-sm text-navy/60">Active</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 bg-gold text-white font-bold py-3 rounded-xl text-sm active:scale-[0.97] transition-transform"
            >
              {editingId ? "Update" : "Add"}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-3 bg-navy/5 rounded-xl text-sm text-navy/50 active:scale-[0.97] transition-transform"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Event list */}
      {events.length === 0 && (
        <p className="text-center text-navy/30 text-sm py-8">No events yet.</p>
      )}

      {events.map((event) => (
        <div key={event.id} className="card p-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                event.active ? "bg-green/10" : "bg-navy/5"
              }`}
            >
              <MapPin size={16} className={event.active ? "text-green" : "text-navy/30"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-navy truncate">{event.name}</p>
                {event.active && (
                  <span className="text-[11px] font-bold text-green bg-green/10 px-1.5 py-0.5 rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-navy/40 mt-0.5">
                {event.address} &middot; {event.time}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 ml-11">
            <button
              onClick={() => toggleActive(event)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                event.active
                  ? "bg-navy/5 text-navy/40"
                  : "bg-green/10 text-green"
              }`}
            >
              {event.active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => handleEdit(event)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-navy/5 text-navy/40"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(event.id)}
              aria-label={confirmingDeleteId === event.id ? "Confirm delete event" : "Delete event"}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                confirmingDeleteId === event.id
                  ? "text-red bg-red/10"
                  : "text-red/50"
              }`}
            >
              {confirmingDeleteId === event.id ? "Sure?" : <Trash2 size={12} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Push Notifications ─────────────────────────────

function PushNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    if (!title.trim() || !message.trim()) return;
    console.log("Push Notification:", { title: title.trim(), message: message.trim() });
    setSent(true);
    setTimeout(() => {
      setTitle("");
      setMessage("");
      setSent(false);
    }, 2000);
  };

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title"
          className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20"
        />
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Notification message..."
          rows={3}
          className="w-full bg-cream border border-navy/10 rounded-xl px-4 py-3 text-sm text-navy placeholder:text-navy/25 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/20 resize-none"
        />
        <button
          onClick={handleSend}
          disabled={sent}
          className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 active:scale-[0.97] transition-all ${
            sent
              ? "bg-green text-white"
              : "bg-gold text-white"
          }`}
        >
          {sent ? (
            <>
              <Check size={18} />
              Sent!
            </>
          ) : (
            <>
              <Send size={16} />
              Send Push Notification
            </>
          )}
        </button>
      </div>

      <div className="card-light p-4 text-center">
        <Bell size={20} className="text-navy/20 mx-auto mb-2" />
        <p className="text-navy/30 text-xs">
          Push notifications are logged to console for now. Full web push integration coming soon.
        </p>
      </div>
    </div>
  );
}

// ── Main Admin Page ────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>("votes");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuthed(isAdminAuthenticated());
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return <PinEntry onSuccess={() => setAuthed(true)} />;
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "votes", label: "Votes", icon: <Trophy size={16} /> },
    { id: "raffles", label: "Raffles", icon: <Gift size={16} /> },
    { id: "events", label: "Events", icon: <MapPin size={16} /> },
    { id: "push", label: "Push", icon: <Bell size={16} /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-cream/95 backdrop-blur-xl border-b border-navy/5">
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={20} className="text-gold" />
              <h1 className="text-xl font-extrabold text-navy">Admin</h1>
            </div>
            <button
              onClick={() => {
                logoutAdmin();
                setAuthed(false);
              }}
              className="flex items-center gap-1.5 text-red text-xs font-semibold bg-red/10 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm relative">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-colors duration-200 relative z-10 ${
                  activeTab === tab.id
                    ? "text-white"
                    : "text-navy/40 active:text-navy/60"
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="admin-tab"
                    className="absolute inset-0 bg-gold rounded-lg"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {activeTab === "votes" && <VoteManagement />}
            {activeTab === "raffles" && <RaffleManagement />}
            {activeTab === "events" && <EventManagement />}
            {activeTab === "push" && <PushNotifications />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
