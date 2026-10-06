import { Geist, Instrument_Sans, Manrope } from "next/font/google";

// Fonts only the profile templates use (design-system.md §2.1). They're
// loaded here rather than in the root layout so pages without template
// previews don't download them.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-instrument",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope",
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-geist",
});

/** Put on an ancestor of any template preview so its `font` resolves. */
export const TEMPLATE_FONT_VARIABLES = `${instrumentSans.variable} ${manrope.variable} ${geist.variable}`;
