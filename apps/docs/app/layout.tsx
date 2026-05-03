import type { Metadata } from "next";
import "./globals.css";
import "../components/git-graph/git-graph.css";
import ThemeToggle from "../components/theme-toggle";

export const metadata: Metadata = {
  title: "GitGraph",
  description: "React component for rendering Git commit history as a visual DAG.",
};

// Sets data-theme="dark" on <html> before paint. Reads localStorage("theme")
// first (values: "light" | "dark" | "system"); falls back to OS preference.
// Pre-hydration via dangerouslySetInnerHTML to avoid a wrong-mode flash.
// See globals.css for why this can't live in a CSS @media block under
// Tailwind v4. The same logic is mirrored in theme-toggle.tsx — keep in sync.
const themeInitScript = `
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || ((stored === null || stored === 'system') && prefersDark);
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
