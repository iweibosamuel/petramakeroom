// Google Analytics (GA4) events. The tag itself is loaded in index.html, only
// on the live site, so calls here do nothing on localhost.
//
// Page views are recorded automatically. These events mark each step of the
// giving flow (which stays on one web address), so GA can show where people
// drop off. Never send names, emails, phone numbers or other personal details.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Params = Record<string, string | number | boolean | undefined>;

export function track(event: string, params: Params = {}): void {
  try {
    window.gtag?.("event", event, params);
  } catch {
    // Analytics must never break the site.
  }
}
