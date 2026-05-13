export function EloBadge({ value }: Readonly<{ value: number }>): React.ReactElement {
  return (
    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-200">
      {value}
    </span>
  );
}
