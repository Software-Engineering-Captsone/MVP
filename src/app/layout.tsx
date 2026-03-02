import type { Metadata } from "next";
import { Sora, Instrument_Serif } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "NILHub — The NIL Marketplace for College Athletes",
  description:
    "NILHub is the marketplace that connects student athletes with the right brand partnerships. Real social data, simple deal management, and profiles that actually showcase who you are.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sora.variable} ${instrumentSerif.variable}`}>
        {children}
      </body>
    </html>
  );
}
