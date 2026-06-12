"use client";

import { useEffect, useRef } from "react";
import { NumberPad } from "./NumberPad";
import { isValidUSPhone, formatPhone, normalizePhone } from "@/lib/format";
import { useSound } from "@/lib/use-sound";

export function EntryScreen({
  firstName,
  phone,
  consent,
  setFirstName,
  setPhone,
  setConsent,
  onContinue,
  onCancel,
  onActivity,
}: {
  firstName: string;
  phone: string;
  consent: boolean;
  setFirstName: (v: string) => void;
  setPhone: (v: string) => void;
  setConsent: (v: boolean) => void;
  onContinue: () => void;
  onCancel: () => void;
  onActivity: () => void;
}) {
  const sound = useSound();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const valid = firstName.trim().length > 0 && isValidUSPhone(phone);

  const addDigit = (d: string) => {
    onActivity();
    if (normalizePhone(phone).length >= 10) return;
    sound.play("tap");
    sound.vibrate(8);
    nameRef.current?.blur(); // dismiss iOS keyboard so the pad is usable
    setPhone(normalizePhone(phone + d));
  };
  const backspace = () => {
    onActivity();
    sound.play("tap");
    setPhone(normalizePhone(phone).slice(0, -1));
  };
  const clear = () => {
    onActivity();
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
        <div className="panel" style={{ flex: "1 1 320px", padding: "clamp(1rem, 2.5vw, 1.75rem)", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <label className="eyebrow" htmlFor="firstName">Your first name</label>
          <input
            id="firstName"
            ref={nameRef}
            className="nameInput"
            value={firstName}
            onChange={(e) => {
              onActivity();
              setFirstName(e.target.value.slice(0, 24));
            }}
            placeholder="e.g. Sara"
            autoComplete="given-name"
            enterKeyHint="next"
            maxLength={24}
          />
          <div style={{ height: 2, background: "var(--line)" }} />
          <button
            type="button"
            onClick={() => {
              onActivity();
              sound.play("tap");
              setConsent(!consent);
            }}
            style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", textAlign: "left", marginTop: "auto" }}
          >
            <span className={`switch ${consent ? "is-on" : ""}`} aria-hidden>
              <span className="switch__knob" />
            </span>
            <span className="text-dim" style={{ fontSize: "0.85rem", lineHeight: 1.35 }}>
              Text me about my prize &amp; the occasional Yalla Bites offer. Msg &amp; data rates may apply.
            </span>
          </button>
        </div>

        {/* Phone + keypad */}
        <div className="panel" style={{ flex: "1 1 360px", padding: "clamp(1rem, 2.5vw, 1.75rem)", display: "flex", flexDirection: "column", gap: "0.9rem", alignItems: "center" }}>
          <label className="eyebrow" style={{ alignSelf: "flex-start" }}>Mobile number</label>
          <div className="field is-active" style={{ justifyContent: "center" }}>
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
