import type { PledgeKind } from "./types";

interface PaidPledge {
  kind: PledgeKind;
  groupId?: string;
  donorEmail: string;
  amountPaid: number;
}

interface Member {
  groupId: string;
  email: string;
}

// How many people have given: everyone on a pledge with at least one payment
// confirmed ("I've paid"). A group seed counts each person in the group.
// People are counted once by email, however many pledges they're on.
export function countGivers(pledges: PaidPledge[], members: Member[]): number {
  const people = new Set<string>();
  for (const pledge of pledges) {
    if (pledge.amountPaid <= 0) continue;
    const emails =
      pledge.kind === "group"
        ? members.filter((m) => m.groupId === pledge.groupId).map((m) => m.email)
        : [];
    if (emails.length === 0) emails.push(pledge.donorEmail);
    for (const email of emails) people.add(email.trim().toLowerCase());
  }
  return people.size;
}
