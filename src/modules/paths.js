import { getSelectedBrowser, getSzuHome } from './browser.js';

export { getSzuHome } from './browser.js';

export function getProfilePath(options = {}) {
  return getSelectedBrowser(options).profilePath;
}
