"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export default function CodeBlock({ code, language = "tsx" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Insecure context, no permission, or denied — nothing useful to do.
      });
  }

  return (
    <div className="relative my-4 overflow-hidden rounded-md border border-border bg-muted">
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copy code"
        className="absolute right-2 top-2 rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={"language-" + language}>{code}</code>
      </pre>
    </div>
  );
}
