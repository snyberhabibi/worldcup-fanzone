export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 border-3 border-[#9A7A30] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#9A7A30] text-sm font-semibold">Loading...</p>
    </div>
  );
}
