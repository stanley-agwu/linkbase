import { Eyebrow } from "./eyebrow";

type FeatureCardProps = {
  tone?: "iris" | "ember" | "ink";
  eyebrow: string;
  title: string;
  body: string;
};

const TONES = {
  iris: "bg-iris-500 text-ink-900",
  ember: "bg-ember-500 text-ink-900",
  ink: "bg-ink-900 text-cream-150",
};

/** Flat colour block, no border or shadow. Use in threes: iris, ember, ink. */
export function FeatureCard({
  tone = "iris",
  eyebrow,
  title,
  body,
}: FeatureCardProps) {
  return (
    <div
      className={`flex min-h-75 flex-col gap-3.5 rounded-card p-9 ${TONES[tone]}`}
    >
      <Eyebrow size="sm" tone="inherit">
        {eyebrow}
      </Eyebrow>
      <h3 className="mt-auto font-display text-h3 font-extrabold">{title}</h3>
      <p className="m-0 text-md leading-body">{body}</p>
    </div>
  );
}
