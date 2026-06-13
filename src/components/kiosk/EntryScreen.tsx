"use client";

import { useEffect, useRef, useState } from "react";
import { NumberPad } from "./NumberPad";
import { isValidUSPhone, formatPhone, normalizePhone } from "@/lib/format";
import { useSound } from "@/lib/use-sound";

const activeRing: React.CSSProperties = {
  borderColor: "var(--yb-gold)",
  boxShadow: "0 0 0 2px var(--yb-gold), 0 0 26px var(--yb-gold-glow)",
};

export function EntryScreen({
  firstName,
  phone,
  setFirstName,
  setPhone,
  onContinue,
  onCancel,
  onActivity,
}: {
  firstName: string;
  phone: string;
  setFirstName: (v: string) => void;
  setPhone: (v: string) => void;
  onContinue: () => void;
  onCancel: () => void;
  onActivity: () => void;
}) {
  const sound = useSound();
  const nameRef = useRef<HTMLInputElement>(null);
  const [activeField, setActiveField] = useState<"name" | "phone">("name");

  // Name first: focus + highlight it on open.
  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const valid = firstName.trim().length > 0 && isValidUSPhone(phone);

  const goToPhone = () => setActiveField("phone");

  const addDigit = (d: string) => {
    onActivity();
    goToPhone();
    if (normalizePhone(phone).length >= 10) return;
    sound.play("tap");
    sound.vibrate(8);
    nameRef.current?.blur(); // dismiss iOS keyboard so the pad is usable
    setPhone(normalizePhone(phone + d));
  };
  const backspace = () => {
    onActivity();
    goToPhone();
    sound.play("tap");
    setPhone(normalizePhone(phone).slice(0, -1));
  };
  const clear = () => {
    onActivity();
    goToPhone();
    sound.play("tap");
    setPhone("");
  };
  const cont = () => {
    if (!valid) {
      sound.play("error");
      return;
    }
    sound.play("select");
    sound.vibrate(12);
    onContinue();
  };

  const nameActive = activeField === "name";
  const phoneActive = activeField === "phone";

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "clamp(1rem, 3vw, 2rem)", gap: "1rem", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingLeft: "clamp(2.4rem, 5vw, 3.2rem)" }}>
        <div>
          <p className="eyebrow">Step 1 of 2</p>
          <h1 className="display" style={{ fontSize: "clamp(1.6rem, 4vw, 2.6rem)" }}>
            🎟️ Enter to win <span className="text-red">free Yalla Bites</span>
          </h1>
        </div>
        <button className="btn btn--ghost" onClick={onCancel} aria-label="Cancel">✕</button>
      </div>

      <div style={{ flex: 1, display: "flex", gap: "clamp(1rem, 2.5vw, 2rem)", flexWrap: "wrap", alignItems: "stretch", minHeight: 0 }}>
        {/* Name + consent */}
        <div
          className="panel"
          style={{
            flex: "1 1 320px",
            padding: "clamp(1rem, 2.5vw, 1.75rem)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            transition: "box-shadow 0.2s, border-color 0.2s",
            ...(nameActive ? activeRing : {}),
          }}
        >
          <label className="eyebrow" htmlFor="firstName">
            1 · Your first name
          </label>
          <input
            id="firstName"
            ref={nameRef}
            className="nameInput"
            value={firstName}
            onFocus={() => setActiveField("name")}
            onBlur={() => {
              if (firstName.trim().length > 0) goToPhone();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                nameRef.current?.blur();
                goToPhone();
              }
            }}
            onChange={(e) => {
              onActivity();
              setFirstName(e.target.value.slice(0, 24));
            }}
            placeholder="e.g. Sara"
            autoComplete="given-name"
            enterKeyHint="next"
            maxLength={24}
          />
          <div style={{ height: 2, background: nameActive ? "var(--yb-gold)" : "var(--line)", transition: "background 0.2s" }} />
          <p className="text-dim" style={{ fontSize: "0.8rem", lineHeight: 1.4, marginTop: "auto" }}>
            By entering, you agree to receive texts from Yalla Bites about your pick &amp; offers.
            Msg &amp; data rates may apply. Reply <b style={{ color: "var(--cream-soft)" }}>STOP</b> to opt out.
          </p>
        </div>

        {/* Phone + keypad */}
        <div
          className="panel"
          onClick={goToPhone}
          style={{
            flex: "1 1 360px",
            padding: "clamp(1rem, 2.5vw, 1.75rem)",
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
            alignItems: "center",
            transition: "box-shadow 0.2s, border-color 0.2s",
            ...(phoneActive ? activeRing : {}),
          }}
        >
          <label className="eyebrow" style={{ alignSelf: "flex-start" }}>
            2 · Mobile number
          </label>
          <div className={`field ${phoneActive ? "is-active" : ""}`} style={{ justifyContent: "center" }}>
            <span className={`field__value ${normalizePhone(phone).length === 0 ? "field__placeholder" : ""}`}>
              {normalizePhone(phone).length === 0 ? "(•••) •••-••••" : formatPhone(phone)}
            </span>
          </div>
          <NumberPad onDigit={addDigit} onBackspace={backspace} onClear={clear} />
        </div>
      </div>

      <button className="btn btn--gold btn--block btn--lg" onClick={cont} disabled={!valid}>
        Continue → pick your team
      </button>
    </div>
  );
}
