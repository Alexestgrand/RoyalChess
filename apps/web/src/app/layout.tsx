import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { ToasterMount } from "@/components/providers/toaster-mount";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RoyalChess",
  description: "Plateforme d'échecs en ligne",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="fr" className={`${inter.variable} ${cormorant.variable}`} data-board-theme="royal-classic" data-analysis-arrow="gold">
      <body>
        <AppProviders>{children}</AppProviders>
        <ToasterMount />
      </body>
    </html>
  );
}
