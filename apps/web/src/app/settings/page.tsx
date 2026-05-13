import { auth } from "@/auth";
import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { redirect } from "next/navigation";
import type { ReactElement } from "react";

export default async function SettingsPage(): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return <SettingsPageClient />;
}
