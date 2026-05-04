"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Zap,
  Database,
  Sparkles,
  Palette,
  Component,
  FileText,
  Gauge,
  Wrench,
  PlayCircle,
} from "lucide-react";
import type { ReactNode } from "react";

type NavItem = { href: string; label: string; icon: ReactNode };
type SubNavItem = { href: string; label: string };

const NAV: NavItem[] = [
  { href: "/docs/installation", label: "Installation", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/docs/quickstart", label: "Quickstart", icon: <Zap className="h-4 w-4" /> },
  { href: "/docs/data-shape", label: "Data shape", icon: <Database className="h-4 w-4" /> },
  { href: "/docs/recipes", label: "Recipes", icon: <Sparkles className="h-4 w-4" /> },
  { href: "/docs/theming", label: "Theming", icon: <Palette className="h-4 w-4" /> },
  { href: "/docs/primitive", label: "Primitive", icon: <Component className="h-4 w-4" /> },
  { href: "/docs/api", label: "API", icon: <FileText className="h-4 w-4" /> },
  { href: "/docs/performance", label: "Performance", icon: <Gauge className="h-4 w-4" /> },
  { href: "/docs/troubleshooting", label: "Troubleshooting", icon: <Wrench className="h-4 w-4" /> },
  { href: "/playground", label: "Playground", icon: <PlayCircle className="h-4 w-4" /> },
];

const RECIPE_SUBNAV: SubNavItem[] = [
  { href: "/docs/recipes/git-log", label: "git log" },
  { href: "/docs/recipes/github-api", label: "GitHub API" },
  { href: "/docs/recipes/isomorphic-git", label: "isomorphic-git" },
  { href: "/docs/recipes/working-tree", label: "Working tree" },
  { href: "/docs/recipes/custom-columns", label: "Custom columns" },
  { href: "/docs/recipes/detail-drawer", label: "Detail drawer" },
];

export default function DocsShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const recipesActive = pathname?.startsWith("/docs/recipes") ?? false;

  return (
    <div className="mx-auto flex w-full max-w-6xl gap-8 px-6 py-10">
      <aside className="sticky top-10 hidden h-[calc(100vh-5rem)] w-56 shrink-0 overflow-y-auto md:block">
        <Link href="/" className="mb-6 block text-lg font-semibold tracking-tight">
          GitGraph
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={
                    "flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors " +
                    (active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  {item.icon}
                  {item.label}
                </Link>
                {item.href === "/docs/recipes" && recipesActive && (
                  <div className="ml-6 mt-1 flex flex-col gap-1 border-l border-border pl-3">
                    {RECIPE_SUBNAV.map((sub) => {
                      const subActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={
                            "rounded-md px-2 py-1 text-xs transition-colors " +
                            (subActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground hover:text-foreground")
                          }
                        >
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="prose prose-neutral min-w-0 flex-1 dark:prose-invert">{children}</main>
    </div>
  );
}
