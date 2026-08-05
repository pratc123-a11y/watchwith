import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WatchWith",
  description: "Stop arguing about what to watch. Everyone rates a few films — we find what works for the whole group.",
  openGraph: {
    title: "WatchWith",
    description: "Stop arguing about what to watch. Everyone rates a few films — we find what works for the whole group.",
    url: "https://watchwith-one.vercel.app",
    siteName: "WatchWith",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "WatchWith",
    description: "Stop arguing about what to watch. Everyone rates a few films — we find what works for the whole group.",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎬</text></svg>",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <Navbar />
        <div className="pt-16">
          {children}
        </div>
      </body>
    </html>
  );
}