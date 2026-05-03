import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-static";

export function generateStaticParams() {
  return [{ name: "git-graph.json" }];
}

type ManifestSourceFile = { path: string; target: string; type: string };
type Manifest = {
  $schema: string;
  name: string;
  type: string;
  dependencies: string[];
  registryDependencies: string[];
  files: ManifestSourceFile[];
};

const REGISTRY_ROOT = join(process.cwd(), "..", "..", "registry", "git-graph");

export async function GET(_: Request, ctx: { params: Promise<{ name: string }> }) {
  const { name } = await ctx.params;
  if (name !== "git-graph.json") return NextResponse.json({ error: "not found" }, { status: 404 });
  const manifestRaw = readFileSync(join(REGISTRY_ROOT, "registry.json"), "utf8");
  const manifest = JSON.parse(manifestRaw) as Manifest;
  const filesWithContent = manifest.files.map((f) => ({
    path: f.path,
    target: f.target,
    type: f.type,
    content: readFileSync(join(REGISTRY_ROOT, f.path), "utf8"),
  }));
  return NextResponse.json({
    $schema: manifest.$schema,
    name: manifest.name,
    type: manifest.type,
    dependencies: manifest.dependencies,
    registryDependencies: manifest.registryDependencies,
    files: filesWithContent,
  });
}
