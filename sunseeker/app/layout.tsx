import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Fraunces solo per i numeri grandi: è un serif ad alto contrasto, bello in
// display e faticoso nei testi piccoli, dove lavora Inter.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sun Seeker — quanto sole c'è davvero",
  description:
    "Ore di sole effettive, oggi e nei prossimi sette giorni, dove sei o in qualsiasi città. Dati misurati, non stimati dalla nuvolosità.",
  applicationName: "Sun Seeker",
  openGraph: {
    title: "Sun Seeker",
    description: "Quanto sole c'è davvero, oggi e nei prossimi sette giorni.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#03060d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="it"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
