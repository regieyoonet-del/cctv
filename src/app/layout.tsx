import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "CCTV Viewer — Home Camera Monitoring",
  description: "Connect and monitor your IP cameras from a single dashboard.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
