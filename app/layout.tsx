import type { Metadata, Viewport } from "next";
import { Geist_Mono, Oswald } from "next/font/google";
import "./globals.css";

const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const condensed = Oswald({
  variable: "--font-condensed",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Ledger",
  description: "Evidence of the things they said.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${mono.variable} ${condensed.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
