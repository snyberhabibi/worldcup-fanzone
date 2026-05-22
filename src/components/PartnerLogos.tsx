"use client";

import { motion } from "framer-motion";

const partners = ["DAR Coffee", "Haus of Design", "Yalla Bites"];

export default function PartnerLogos() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="text-center py-4"
    >
      <div className="flex items-center justify-center gap-0 flex-wrap">
        {partners.map((name, i) => (
          <span key={name} className="flex items-center">
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ color: "rgba(15,27,58,0.4)" }}
            >
              {name}
            </span>
            {i < partners.length - 1 && (
              <span
                className="inline-block w-1 h-1 rounded-full mx-3"
                style={{ backgroundColor: "#C9A24B" }}
              />
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
