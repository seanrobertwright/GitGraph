import type { Metadata } from "next";
import "./globals.css";
import "../components/git-graph/git-graph.css";

export const metadata: Metadata = {
  title: "GitGraph",
  description: "React component for rendering Git commit history as a visual DAG.",
};

// Sets data-theme="dark" on <html> before paint, based on the OS preference.
// See globals.css for why this can't be done in a CSS @media block under
// Tailwind v4. dangerouslySetInnerHTML is the standard Next pattern for
// pre-hydration DOM mutations that need to land before first paint to avoid
// a light-mode flash on dark systems.
const themeInitScript = `
  try {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
