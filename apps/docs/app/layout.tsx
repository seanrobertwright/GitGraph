import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GitGraph",
  description: "React component for rendering Git commit history as a visual DAG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
