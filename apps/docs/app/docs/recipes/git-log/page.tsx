import CodeBlock from "../../../../components/code-block";
import DocsShell from "../../../../components/docs-shell";
import LiveDemo from "../../../../components/live-demo";
import { SAMPLE_COMMITS } from "../../../../components/sample-commits";

const SHELL_SNIPPET = `git log --all --pretty="%H%x09%P%x09%ct%x09%an%x09%ae%x09%s"`;

const TS_SNIPPET = `import { fromGitLog, GIT_LOG_FORMAT } from "@/components/git-graph/lib/from-git-log";
import { execSync } from "node:child_process";

const text = execSync(\`git log --all --pretty="\${GIT_LOG_FORMAT}"\`, { encoding: "utf8" });
const commits = fromGitLog(text);`;

export default function GitLogRecipe() {
  return (
    <DocsShell>
      <h1>Recipe: git log</h1>
      <p>
        The <code>fromGitLog</code> helper parses a tab-delimited <code>git log</code> stream into{" "}
        <code>Commit[]</code>. Use the exported <code>GIT_LOG_FORMAT</code> constant to keep the
        format string aligned with the parser.
      </p>
      <h2>1. Shell command</h2>
      <CodeBlock language="bash" code={SHELL_SNIPPET} />
      <h2>2. Parse + render</h2>
      <CodeBlock code={TS_SNIPPET} />
      <h2>Live (with the sample fixture)</h2>
      <LiveDemo commits={SAMPLE_COMMITS} />
      <h2>Format reference</h2>
      <p>
        The format string maps to:{" "}
        <code>%H</code> (sha), <code>%P</code> (parents, space-separated), <code>%ct</code> (commit
        time, unix seconds), <code>%an</code>/<code>%ae</code> (author name/email),{" "}
        <code>%s</code> (subject). Tabs separate fields; newlines separate commits.
      </p>
    </DocsShell>
  );
}
