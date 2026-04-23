import type { Metadata } from "next";
import {
  DM_Sans,
  DM_Mono,
  Red_Hat_Display,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Keep existing fonts for backward compat
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const redHat = Red_Hat_Display({
  variable: "--font-red-hat",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "GridCast — Smart Grid Intelligence Platform",
  description:
    "AI-powered electricity load forecasting at 15-minute resolution, 24 hours ahead. Purpose-built for India's smart grid operators and industrial energy consumers.",
  keywords: [
    "smart grid",
    "load forecasting",
    "electricity",
    "NRLDC",
    "XGBoost",
    "carbon footprint",
    "energy optimisation",
    "India grid",
  ],
  openGraph: {
    title: "GridCast — Smart Grid Intelligence Platform",
    description:
      "Predict the grid. Before it breaks. AI-powered electricity load forecasting for India's smart grid operators.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`
        ${spaceGrotesk.variable}
        ${jetbrainsMono.variable}
        ${dmSans.variable}
        ${dmMono.variable}
        ${redHat.variable}
        h-full antialiased
      `}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
