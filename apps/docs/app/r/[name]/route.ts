import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ name: "git-graph.json" }];
}

const PLACEHOLDER = {
  $schema: "https://ui.shadcn.com/schema/registry-item.json",
  name: "git-graph",
  type: "registry:component",
  dependencies: ["@tanstack/react-virtual", "lucide-react", "clsx"],
  registryDependencies: [],
  files: [],
};

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (name !== "git-graph.json") return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(PLACEHOLDER);
}
