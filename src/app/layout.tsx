import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Outfit, Inter } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-outfit",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DAR × Yalla Bites — World Cup Vote",
  description:
    "Vote your team head-to-head and enter to win free Yalla Bites — live at DAR Coffee.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DAR Vote",
    statusBarStyle: "black-translucent",
  },
  icons: { apple: "/icons/icon-192.png" },
  // Kiosk + projector screens — keep them out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#160f0d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
