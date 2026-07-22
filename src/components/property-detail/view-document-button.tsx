"use client";

import { useTransition } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDocumentViewUrl } from "@/app/actions/property-detail";

export function ViewDocumentButton({ documentId }: { documentId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="subtle"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const url = await getDocumentViewUrl(documentId);
          window.open(url, "_blank", "noopener,noreferrer");
        })
      }
    >
      {pending ? "Opening…" : "Open"}
      {!pending ? <ExternalLink className="size-3.5" strokeWidth={2} /> : null}
    </Button>
  );
}
