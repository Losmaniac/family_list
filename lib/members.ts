import type { Member } from "./types";

function normalizedName(name: string): string {
  return name.trim().toLowerCase();
}

export interface MemberConflict {
  type: "name" | "avatar";
  member: Pick<Member, "id" | "name" | "avatarUrl">;
}

/**
 * Whether `candidate` collides with an existing family member — same name
 * (case/whitespace-insensitive), or the same chosen avatar. Two members
 * can't share either, so a family always stays visually and by-name
 * distinguishable. `excludeId` skips the member being edited, so saving
 * without changing anything doesn't flag a conflict with themselves.
 *
 * This is a soft, client-side check (same spirit as the investment
 * principal check in lib/investments.ts) — nothing security-sensitive
 * hinges on it, it just keeps the family from accidentally ending up with
 * two indistinguishable members.
 */
export function findMemberConflict(
  members: Pick<Member, "id" | "name" | "avatarUrl">[],
  candidate: { name: string; avatarUrl?: string },
  excludeId?: string
): MemberConflict | null {
  const candidateName = normalizedName(candidate.name);
  for (const existing of members) {
    if (existing.id === excludeId) continue;
    if (normalizedName(existing.name) === candidateName) {
      return { type: "name", member: existing };
    }
    if (candidate.avatarUrl && existing.avatarUrl && existing.avatarUrl === candidate.avatarUrl) {
      return { type: "avatar", member: existing };
    }
  }
  return null;
}
