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

/** The starter themes, one per template in `components/profile/templates`. */
export type ThemeId =
  "kiln" | "tidepool" | "halfpipe" | "encore" | "ledger" | "hem" | "rep";

/** `template` keeps the theme's own corner radius or font. */
export type ButtonShape = "template" | "square" | "soft" | "pill";
export type ProfileFont = "template" | "dm-sans" | "bricolage" | "mono";

/** What the owner picked on Appearance; resolved to a `ProfileTheme` for rendering. */
export type Appearance = {
  themeId: ThemeId;
  buttonShape: ButtonShape;
  font: ProfileFont;
};

/** The owner's profile as the dashboard edits it. Defaults when none is saved. */
export type ProfileSettings = Appearance & {
  displayName: string | null;
  bio: string | null;
};

/** A link as the public page shows it: no visibility, no counts. */
export type PublicLink = {
  id: string;
  title: string;
  url: string;
};

/** Everything `/user/[handle]` renders, and nothing else (database.md §5). */
export type PublicPage = ProfileSettings & {
  username: string;
  links: PublicLink[];
};

/** A starter profile: a theme plus the sample content shown in previews. */
export type ProfileTemplate = ProfileTheme & {
  id: ThemeId;
  name: string;
  category: TemplateCategory;
  title: string;
  bio: string;
  links: string[];
};

/** One of the signed-in user's links, as the dashboard renders it. */
export type DashboardLink = {
  id: string;
  title: string;
  url: string;
  /** Shown on the public page. Hidden links stay editable. */
  visible: boolean;
  clicks: number;
};

/** The windows the analytics page offers. */
export type AnalyticsRange = "7d" | "30d" | "90d";

/** One bar on the clicks chart: a UTC day, or a week for the 90-day range. */
export type ClickBucket = {
  /** ISO date (YYYY-MM-DD) the bucket starts on, in UTC. */
  start: string;
  /** Axis label; empty for buckets that don't get a tick. */
  label: string;
  /** The bucket's full name, for the tooltip and table: "Mon 12 Oct". */
  fullLabel: string;
  count: number;
};

/** A link's clicks within the selected range. */
export type LinkClicks = {
  id: string;
  title: string;
  visible: boolean;
  count: number;
};

/** Everything `/dashboard/analytics` renders for one range. */
export type ClickAnalytics = {
  range: AnalyticsRange;
  total: number;
  buckets: ClickBucket[];
  /** The busiest bucket, or null when the range has no clicks. */
  peak: ClickBucket | null;
  /** Busiest first. */
  links: LinkClicks[];
};

/** The signed-in account as the app sees it — never the password hash. */
export type AuthUser = {
  id: string;
  email: string;
  name: string | null;
  /** Null until chosen during onboarding. */
  username: string | null;
};
