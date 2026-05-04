"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
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
        <SheetDescription className="sr-only">
          Details for the selected commit.
        </SheetDescription>
        {renderContent(commit)}
      </SheetContent>
    </Sheet>
  );
}
