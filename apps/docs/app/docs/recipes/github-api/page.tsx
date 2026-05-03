import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";

const SNIPPET = `import type { Commit } from "@/components/git-graph/types";

type GitHubCommit = {
  sha: string;
  parents: { sha: string }[];
  commit: {
    author: { name: string; email: string; date: string };
    message: string;
  };
  author: { avatar_url: string } | null;
};

export async function fetchCommits(owner: string, repo: string): Promise<Commit[]> {
  const res = await fetch(
    \`https://api.github.com/repos/\${owner}/\${repo}/commits?per_page=100\`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!res.ok) throw new Error(\`GitHub API: \${res.status}\`);
  const data = (await res.json()) as GitHubCommit[];

  return data.map((c) => ({
    sha: c.sha,
    parents: c.parents.map((p) => p.sha),
    author: {
      name: c.commit.author.name,
      email: c.commit.author.email,
      ...(c.author?.avatar_url ? { avatarUrl: c.author.avatar_url } : {}),
    },
    // Headline only — <GitGraph> renders one line per commit.
    message: c.commit.message.split("\\n", 1)[0] ?? "",
    timestamp: c.commit.author.date,
  }));
}`;

export default function GitHubApiRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: GitHub API</h1>
      <p>
        Map <code>GET /repos/&#123;owner&#125;/&#123;repo&#125;/commits</code> directly into{" "}
        <code>Commit[]</code>. No live demo here — production usage needs auth (rate limits) and the
        REST endpoint paginates at 100 per page.
      </p>
      <CodeBlock code={SNIPPET} />
      <h2>Caveats</h2>
      <ul>
        <li>
          GitHub returns commits in chronological pages. To render the full history you need to
          follow the <code>Link: rel=&quot;next&quot;</code> header until exhausted (or accept a
          partial graph and call <code>validate(commits, &#123; allowMissingParents: true &#125;)</code>).
        </li>
        <li>
          The REST <code>/commits</code> endpoint only returns commits reachable from the default
          branch unless you pass <code>?sha=&lt;ref&gt;</code> per branch.
        </li>
      </ul>
    </DocsShell>
  );
}
