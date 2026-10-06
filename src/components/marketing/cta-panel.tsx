type CtaPanelProps = {
  title: string;
  children: React.ReactNode;
};

/** The closing ink panel; normally holds `<ClaimInput inverse />`. */
export function CtaPanel({ title, children }: CtaPanelProps) {
  return (
    <section className="px-6 pb-24">
      <div className="mx-auto flex max-w-container flex-col items-center gap-7 rounded-panel bg-surface-inverse px-8 py-20 text-center text-on-inverse">
        <h2 className="m-0 max-w-[900px] font-display text-cta font-extrabold text-balance">
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}
