// The only module features import from. The connection helper stays internal:
// query functions (added with the features that need them) call it themselves.
export { Click, type ClickDoc } from "./models/click";
export { Link, type LinkDoc } from "./models/link";
export { Profile, type ProfileDoc } from "./models/profile";
