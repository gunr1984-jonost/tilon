import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tilon",
  description: "Real-time Pikud HaOref (Home Front Command) alert dashboard — Tel Aviv, Rishon LeZion, Rehovot, Ra'anana, and more Israeli cities.",
  openGraph: {
    title: "Tilon — Pikud HaOref Alert Monitor",
    description: "Real-time Pikud HaOref (Home Front Command) alert dashboard — Tel Aviv, Rishon LeZion, Rehovot, Ra'anana, and more Israeli cities.",
    url: "https://homefront.protocol22.com",
    type: "website",
  },
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍦</text></svg>" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
