import type { ProfileTemplate } from "@/lib/types";
import { ProfilePhone } from "@/components/profile/profile-phone";
import { ButtonLink } from "@/components/ui/button";

type TemplateCardProps = {
  template: ProfileTemplate;
  /** Where "Use" goes. Omit to hide the button. */
  useHref?: string;
};

export function TemplateCard({ template, useHref }: TemplateCardProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* The meta row names the template; the preview is illustration. */}
      <div aria-hidden="true">
        <ProfilePhone
          theme={template}
          name={template.title}
          bio={template.bio}
          links={template.links}
        />
      </div>
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="flex flex-col">
          <span className="font-display text-card-title font-bold">
            {template.name}
          </span>
          <span className="text-xs text-muted">{template.category}</span>
        </span>
        {useHref && (
          <ButtonLink
            href={useHref}
            variant="dark"
            size="sm"
            aria-label={`Use the ${template.name} template`}
          >
            Use
          </ButtonLink>
        )}
      </div>
    </div>
  );
}
