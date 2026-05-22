"use client";

export default function PartnerLogos() {
  const partners = [
    { name: "DAR Coffee", role: "Host Venue" },
    { name: "Haus of Design", role: "Decor Partner" },
    { name: "Yalla Bites", role: "Food Partner" },
  ];

  return (
    <div className="text-center">
      <p className="text-cream/30 text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">
        Presented By
      </p>
      <div className="flex items-center justify-center gap-6">
        {partners.map((p) => (
          <div key={p.name} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-cream/10 flex items-center justify-center">
              <span className="text-gold font-extrabold text-lg">
                {p.name.charAt(0)}
              </span>
            </div>
            <span className="text-cream/50 text-[10px] font-medium">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
