import { auth } from "@/auth";
import { HomeLanding } from "@/components/landing/home-landing";
import { LobbyDashboard } from "@/components/lobby/lobby-dashboard";
import type { ReactElement } from "react";

export default async function HomePage(): Promise<ReactElement> {
  const session = await auth();
  if (!session?.user) {
    return <HomeLanding />;
  }
  return <LobbyDashboard />;
}
