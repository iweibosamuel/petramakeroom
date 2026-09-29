import type { DonorProfile } from "./types";

const REMEMBERED_EMAIL_KEY = "petra_donor_email_v1";
const REMEMBERED_DETAILS_KEY = "petra_donor_details_v1";

// A returning giver's details, saved on this device so their next pledge
// can skip the details form.
export interface RememberedDonor {
  name: string;
  email: string;
  phone: string;
  profile: DonorProfile;
}

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function getRememberedEmail(): string | null {
  return storage()?.getItem(REMEMBERED_EMAIL_KEY) ?? null;
}

export function rememberEmail(email: string): void {
  storage()?.setItem(REMEMBERED_EMAIL_KEY, email.trim().toLowerCase());
}

export function forgetRememberedEmail(): void {
  storage()?.removeItem(REMEMBERED_EMAIL_KEY);
  forgetDonorDetails();
}

function isComplete(d: Partial<RememberedDonor> | null | undefined): d is RememberedDonor {
  return Boolean(
    d &&
      d.name?.trim() &&
      d.email?.trim() &&
      d.phone?.trim() &&
      d.profile?.location?.trim() &&
      typeof d.profile.isPetraMember === "boolean" &&
      (!d.profile.isPetraMember || d.profile.campus?.trim()),
  );
}

// Only complete details are kept, so a pledge made from them never skips a
// required field.
export function rememberDonorDetails(details: RememberedDonor): void {
  if (!isComplete(details)) return;
  storage()?.setItem(REMEMBERED_DETAILS_KEY, JSON.stringify(details));
  rememberEmail(details.email);
}

export function getRememberedDonorDetails(): RememberedDonor | null {
  try {
    const parsed = JSON.parse(storage()?.getItem(REMEMBERED_DETAILS_KEY) ?? "null");
    return isComplete(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function forgetDonorDetails(): void {
  storage()?.removeItem(REMEMBERED_DETAILS_KEY);
}
