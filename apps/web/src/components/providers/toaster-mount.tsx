"use client";

import { Toaster } from "@/components/ui/sonner";
import type { ReactElement } from "react";

export function ToasterMount(): ReactElement {
  return <Toaster richColors closeButton position="top-right" />;
}
