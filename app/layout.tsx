import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import Navbar from "./components/navbar";

export const metadata: Metadata = {
  title: "Jarvis SMB Arbitrum",
  description: "SMB Stablecoin Payment MVP with Reclaim Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ isolation: "isolate" }}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
