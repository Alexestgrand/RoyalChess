import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Mono, DM_Sans } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { ToasterMount } from "@/components/providers/toaster-mount";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
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
    <html
      lang="fr"
      className={`${dmSans.variable} ${cormorant.variable} ${dmMono.variable}`}
      data-board-theme="royal-classic"
      data-analysis-arrow="gold"
    >
      <body>
        <AppProviders>{children}</AppProviders>
        <ToasterMount />
      </body>
    </html>
  );
}
