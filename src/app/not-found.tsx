import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="relative w-40 h-40 mb-6">
        <Image
          src="/mascot/fan.png"
          alt="Fan mascot looking confused"
          fill
          className="object-contain drop-shadow-lg"
        />
      </div>
      <h1 className="text-2xl font-extrabold text-[#0F1B3A] mb-2">
        Page Not Found
      </h1>
      <p className="text-[#0F1B3A]/50 text-sm max-w-xs mb-8">
        Looks like this page took a wrong turn. Let&apos;s get you back to the fanzone.
      </p>
      <Link
        href="/"
        className="bg-[#9A7A30] text-white font-bold text-sm px-6 py-3 rounded-xl active:scale-[0.97] transition-transform"
      >
        Go Home
      </Link>
    </div>
  );
}
