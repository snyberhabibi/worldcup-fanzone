"use client";

export function NumberPad({
  onDigit,
  onBackspace,
  onClear,
}: {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="keypad" role="group" aria-label="Number pad">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((k) => (
        <button key={k} type="button" className="key" onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button
        type="button"
        className="key key--action"
        onClick={() => onClear?.()}
        aria-label="Clear"
      >
        Clear
      </button>
      <button type="button" className="key" onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        className="key key--action"
        onClick={onBackspace}
        aria-label="Delete"
      >
        ⌫
      </button>
    </div>
  );
}
