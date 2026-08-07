import Avatar from "@/components/Avatar";
import type { Investment, Member } from "@/lib/types";

function daysRemaining(maturesAt: number): number {
  return Math.max(0, Math.ceil((maturesAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

interface FamilyInvestmentsOverviewProps {
  members: Member[];
  investments: Investment[];
}

export default function FamilyInvestmentsOverview({ members, investments }: FamilyInvestmentsOverviewProps) {
  const active = investments.filter((i) => i.status === "active");
  if (active.length === 0) return null;

  const byMember = members
    .map((member) => {
      const memberActive = active.filter((i) => i.userId === member.id);
      const totalLocked = memberActive.reduce((sum, i) => sum + i.principal, 0);
      return { member, memberActive, totalLocked };
    })
    .filter((entry) => entry.memberActive.length > 0)
    .sort((a, b) => b.totalLocked - a.totalLocked);

  if (byMember.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium">Přehled rodiny</h2>
      <div className="flex flex-col gap-2">
        {byMember.map(({ member, memberActive, totalLocked }) => (
          <div key={member.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={member.name} avatarUrl={member.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{member.name}</p>
                <p className="text-sm text-zinc-500">{member.role === "parent" ? "Rodič" : "Dítě"}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-accent">{totalLocked} XP</span>
            </div>
            <div className="flex flex-col gap-1 border-t border-border pt-2">
              {memberActive.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-sm">
                  <span>{inv.principal} XP</span>
                  <span className="text-zinc-500">ještě {daysRemaining(inv.maturesAt)} dní</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
