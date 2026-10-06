/** Colours, corner radius and font a public profile page is rendered with. */
export type ProfileTheme = {
  bg: string;
  fg: string;
  btnBg: string;
  btnFg: string;
  btnBorder?: string;
  avatar: string;
  avatar2?: string;
  radius: string;
  font: string;
};

export type TemplateCategory =
  | "Creators"
  | "Fashion"
  | "Fitness"
  | "Music"
  | "Small business"
  | "Sports"
  | "Travel";

/** A starter profile: a theme plus the sample content shown in previews. */
export type ProfileTemplate = ProfileTheme & {
  id: string;
  name: string;
  category: TemplateCategory;
  title: string;
  bio: string;
  links: string[];
};
