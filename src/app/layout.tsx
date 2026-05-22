"use client";

import "./globals.css";
import { Poppins } from "next/font/google";
import Script from "next/script";
import BottomNav from "@/components/BottomNav";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <title>World Cup Fanzone 2026 | DAR x Yalla x Haus</title>
        <meta name="description" content="Dallas's first World Cup fan zone. Vote, win raffles, and watch every match at DAR Coffee." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#F5F0E8" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Fanzone 2026" />
        <meta property="og:title" content="World Cup Fanzone 2026" />
        <meta property="og:description" content="Dallas's first World Cup fan zone. Vote, win raffles, and watch every match." />
        <meta property="og:type" content="website" />
      </head>
      <body className={`${poppins.className} antialiased`}>
        <main className="pb-nav min-h-screen bg-cream">
          {children}
        </main>
        <BottomNav />
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }`}
        </Script>
      </body>
    </html>
  );
}
