import { AnalysisPageClient } from "@/components/analysis/analysis-page-client";

export default async function AnalysisPage({
  params,
}: Readonly<{
  params: Promise<{ gameId: string }>;
}>): Promise<React.ReactElement> {
  const { gameId } = await params;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-royal-ivory">Analyse</h1>
        <p className="mt-1 font-mono text-xs text-royal-muted">{gameId}</p>
      </div>
      <AnalysisPageClient gameId={gameId} />
    </div>
  );
}
