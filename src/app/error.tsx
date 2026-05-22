"use client";

import { useEffect } from "react";
import Image from "next/image";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="relative w-40 h-40 mb-6">
        <Image
          src="/mascot/fan.png"
          alt="Mascot"
          fill
          className="object-contain drop-shadow-lg"
        />
      </div>
      <h2 className="text-2xl font-extrabold text-[#0F1B3A] mb-2">
        Something went wrong
      </h2>
      <p className="text-[#0F1B3A]/50 text-sm max-w-xs mb-6">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="font-bold py-3 px-8 rounded-xl text-base text-white active:scale-[0.97] transition-all"
        style={{
          background: "linear-gradient(135deg, #9A7A30 0%, #C9A24B 50%, #9A7A30 100%)",
          boxShadow: "0 4px 12px rgba(154,122,48,0.3)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
