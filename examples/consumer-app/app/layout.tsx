import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitGraph Consumer App",
  description: "Phase 1 smoke target for Playwright.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
