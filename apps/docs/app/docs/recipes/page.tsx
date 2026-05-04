import Link from "next/link";
import DocsShell from "../../../components/docs-shell";

const RECIPES = [
  { href: "/docs/recipes/git-log", title: "git log", blurb: "Shell out to git and parse the output." },
  { href: "/docs/recipes/github-api", title: "GitHub API", blurb: "Map REST /repos/{owner}/{repo}/commits to Commit[]." },
  { href: "/docs/recipes/isomorphic-git", title: "isomorphic-git", blurb: "Read commits in-browser from a cloned repo." },
  { href: "/docs/recipes/working-tree", title: "Working tree row", blurb: "Show uncommitted work as a synthetic top row." },
  { href: "/docs/recipes/custom-columns", title: "Custom columns", blurb: "Pair the gutter with your own table layout." },
  { href: "/docs/recipes/detail-drawer", title: "Commit detail drawer", blurb: "Render a right-side drawer with a render-prop; minimal and decoupled-controlled examples." },
];

export default function RecipesPage() {
  return (
    <DocsShell>
      <h1>Recipes</h1>
      <p>Worked examples for the most common data sources and layout tweaks.</p>
      <ul className="not-prose mt-6 grid gap-3">
        {RECIPES.map((r) => (
          <li key={r.href} className="rounded-md border p-4 hover:bg-muted">
            <Link href={r.href} className="block">
              <div className="font-medium">{r.title}</div>
              <div className="text-sm text-muted-foreground">{r.blurb}</div>
            </Link>
          </li>
        ))}
      </ul>
    </DocsShell>
  );
}
