import { Navbar } from "@/components/shared/navbar";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col gap-6 px-4 py-6">
      <Navbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
