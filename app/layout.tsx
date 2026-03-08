import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/navbar";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jarvis",
  description: "SMB Stablecoin Payment MVP with Reclaim Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.className}>
      <body style={{ isolation: "isolate", margin: 0 }}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
