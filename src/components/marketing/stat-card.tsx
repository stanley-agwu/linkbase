type StatCardProps = {
  label: string;
  value: string;
  /** The hero chip: shadow, no border, mono label. */
  floating?: boolean;
};

export function StatCard({ label, value, floating = false }: StatCardProps) {
  if (floating) {
    return (
      <div className="flex flex-col gap-0.5 rounded-stat bg-surface-card px-4.5 py-3.5 shadow-float">
        <span className="font-mono text-micro text-muted uppercase">
          {label}
        </span>
        <span className="font-display text-stat font-extrabold tracking-[-0.03em]">
          {value}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border border-subtle bg-surface-card p-5">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-display text-h3 font-extrabold">{value}</span>
    </div>
  );
}
