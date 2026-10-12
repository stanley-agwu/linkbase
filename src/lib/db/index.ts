// The only module features import from. The connection helper stays internal:
// query functions call it themselves.
export { Click, type ClickDoc } from "./models/click";
export { Link, type LinkDoc } from "./models/link";
export { Profile, type ProfileDoc } from "./models/profile";
export { User, type UserDoc } from "./models/user";
export { getClickAnalytics, recordClick } from "./queries/click";
export {
  countRecentClicks,
  createLink,
  deleteLink,
  listLinks,
  MAX_LINKS_PER_USER,
  moveLink,
  setLinkVisibility,
  updateLink,
} from "./queries/link";
export {
  getProfileSettings,
  updateAppearance,
  updateProfileDetails,
} from "./queries/profile";
export { getPublicPage } from "./queries/public-page";
export { consumeRateLimit } from "./queries/rate-limit";
export {
  createUser,
  filterAvailableUsernames,
  findUserForSignIn,
  getUsername,
  isUsernameAvailable,
  setUsername,
} from "./queries/user";
