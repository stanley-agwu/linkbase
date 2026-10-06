import { Portrait } from "@/components/profile/portrait";

type QuoteCardProps = {
  quote: string;
  name: string;
  role: string;
  handle: string;
  tone?: "ember" | "iris" | "ink" | "cream";
};

export function QuoteCard({
  quote,
  name,
  role,
  handle,
  tone = "ember",
}: QuoteCardProps) {
  return (
    <figure className="m-0 flex flex-col gap-7 rounded-md border border-subtle bg-surface-card p-7">
      <Portrait name={name} tone={tone} shape="rect" ratio="4/3" />
      <blockquote className="m-0 text-lg leading-body">“{quote}”</blockquote>
      <figcaption className="mt-auto flex flex-wrap items-end justify-between gap-2">
        <span className="flex flex-col text-sm">
          <span className="font-semibold">{name}</span>
          <span className="text-muted">{role}</span>
        </span>
        <span className="font-mono text-2xs text-muted">
          linkbase.me/{handle}
        </span>
      </figcaption>
    </figure>
  );
}
