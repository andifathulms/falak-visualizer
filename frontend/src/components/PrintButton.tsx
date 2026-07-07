"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <Button type="button" variant="ghost" className="no-print" onClick={() => window.print()}>
      <Printer className="size-4" />
      {label}
    </Button>
  );
}
