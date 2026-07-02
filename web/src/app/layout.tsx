import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Don't Mess With Narmata",
  description:
    "Penny, the finance & controls agent for McContext — fronted by the incorruptible Narmata Tai. Team t32, Atlan AI Hackathon 2026.",
  // Dark Reader repaints dynamically-injected elements (emotes, tooltips)
  // with flash artifacts on a page that is already dark. This meta opts out.
  other: { "darkreader-lock": "" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: extensions (Dark Reader et al.) stamp
    // attributes onto <html> before React hydrates; the mismatch is theirs,
    // not ours, and suppression is scoped to this one element.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
