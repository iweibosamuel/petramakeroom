const REMEMBERED_EMAIL_KEY = "petra_donor_email_v1";

export function getRememberedEmail(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
}

export function rememberEmail(email: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
}

export function forgetRememberedEmail(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
}
