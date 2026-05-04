"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Commit } from "./types";

export type GitGraphDetailProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commit: Commit | undefined;
  renderContent: (commit: Commit | undefined) => ReactNode;
  className?: string;
};

export default function GitGraphDetail(props: GitGraphDetailProps) {
  const { open, onOpenChange, commit, renderContent, className } = props;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={className}
        data-testid="git-graph-detail"
      >
        <SheetTitle className="sr-only">Commit detail</SheetTitle>
        {renderContent(commit)}
      </SheetContent>
    </Sheet>
  );
}
