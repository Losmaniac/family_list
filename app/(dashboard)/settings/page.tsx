"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { LogOut, RefreshCw, Trash2, Zap } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { setupPushNotifications } from "@/lib/push";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { generateInviteCode } from "@/lib/invite-code";
import { xpAdjustmentNeedsApproval } from "@/lib/xp-engine";
import { logAction } from "@/lib/audit-log";
import Avatar from "@/components/Avatar";
import ThemeToggle from "@/components/ThemeToggle";
import AuditLogPanel from "@/components/AuditLogPanel";
import AntiGamingPanel from "@/components/AntiGamingPanel";
import type { Member, XpAdjustmentRequest } from "@/lib/types";

interface FamilyInfo {
  name: string;
  inviteCode: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [pendingAdjustments, setPendingAdjustments] = useState<XpAdjustmentRequest[]>([]);
  const [adjustingMemberId, setAdjustingMemberId] = useState<string | null>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  // The dashboard layout only renders this page once `member` is loaded, so
  // it's safe to seed these from it once at mount via a lazy initializer —
  // no effect needed, and re-syncing on every snapshot update would clobber
  // in-progress edits whenever an unrelated field (e.g. xpBalance) changes.
  const [name, setName] = useState(() => member?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(() => member?.avatarUrl);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(doc(getDb(), "families", familyId), (snap) => {
      const data = snap.data();
      if (data) setFamily({ name: data.name, inviteCode: data.inviteCode });
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId, member?.role]);

  useEffect(() => {
    if (!familyId || member?.role !== "parent") return;
    const pendingQuery = query(
      collection(getDb(), "families", familyId, "xpAdjustmentRequests"),
      where("status", "==", "requested")
    );
    return onSnapshot(pendingQuery, (snapshot) => {
      setPendingAdjustments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as XpAdjustmentRequest));
    });
  }, [familyId, member?.role]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        name,
        avatarUrl: avatarUrl ?? null,
      });
      toast.success("Profil uložen.");
    } catch {
      toast.error("Profil se nepodařilo uložit.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleEnableNotifications() {
    if (!familyId || !user) return;
    const result = await setupPushNotifications(familyId, user.uid);
    setPushStatus(
      result === "granted"
        ? "Notifikace zapnuty."
        : result === "denied"
          ? "Notifikace zamítnuty v prohlížeči."
          : "Notifikace nejsou v tomto prohlížeči podporovány."
    );
  }

  async function handleRegenerateInviteCode() {
    if (!familyId) return;
    const ok = await confirm({
      title: "Vygenerovat nový invite kód?",
      description: "Starý kód přestane fungovat.",
      confirmLabel: "Vygenerovat",
    });
    if (!ok) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        inviteCode: generateInviteCode(),
      });
      toast.success("Nový invite kód je vygenerovaný.");
    } catch {
      toast.error("Kód se nepodařilo vygenerovat.");
    }
  }

  async function handleCopyInviteCode() {
    if (!family) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopyStatus("Zkopírováno!");
    setTimeout(() => setCopyStatus(null), 2000);
  }

  async function handleRoleToggle(target: Member) {
    if (!familyId) return;
    const parentCount = members.filter((m) => m.role === "parent").length;
    if (target.role === "parent" && parentCount <= 1) {
      toast.error("Rodina musí mít alespoň jednoho rodiče.");
      return;
    }
    const nextRole = target.role === "parent" ? "child" : "parent";
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", target.id), {
        role: nextRole,
      });
      if (user) {
        logAction(
          familyId,
          user.uid,
          "member_role_changed",
          `${target.name}: ${target.role === "parent" ? "rodič" : "dítě"} → ${nextRole === "parent" ? "rodič" : "dítě"}`
        );
      }
    } catch {
      toast.error("Roli se nepodařilo změnit.");
    }
  }

  async function handleRemoveMember(target: Member) {
    if (!familyId) return;
    const ok = await confirm({
      title: `Odebrat „${target.name}“ z rodiny?`,
      description: "Tuto akci nelze vrátit zpět.",
      confirmLabel: "Odebrat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "members", target.id));
      if (user) logAction(familyId, user.uid, "member_removed", target.name);
      toast.success(`„${target.name}“ byl odebrán.`);
    } catch {
      toast.error("Člena se nepodařilo odebrat.");
    }
  }

  async function handleSubmitAdjustment(e: React.FormEvent, targetUserId: string) {
    e.preventDefault();
    if (!familyId || !user) return;
    const delta = Number(adjustDelta);
    if (!delta || !adjustReason.trim()) return;

    setSubmittingAdjustment(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "xpAdjustmentRequests"), {
        targetUserId,
        requestedBy: user.uid,
        delta,
        reason: adjustReason.trim(),
        status: "requested",
        timestamp: Date.now(),
      });
      const parentCount = members.filter((m) => m.role === "parent").length;
      toast.success(
        xpAdjustmentNeedsApproval(parentCount)
          ? "Žádost odeslána, čeká na schválení druhým rodičem."
          : "XP upraveno."
      );
      setAdjustingMemberId(null);
      setAdjustDelta("");
      setAdjustReason("");
    } catch {
      toast.error("Žádost se nepodařilo odeslat.");
    } finally {
      setSubmittingAdjustment(false);
    }
  }

  async function handleDecideAdjustment(request: XpAdjustmentRequest, status: "approved" | "rejected") {
    if (!familyId) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "xpAdjustmentRequests", request.id), { status });
      if (user) {
        const target = members.find((m) => m.id === request.targetUserId);
        logAction(
          familyId,
          user.uid,
          "xp_adjustment_decided",
          `${target?.name ?? request.targetUserId}: ${request.delta >= 0 ? "+" : ""}${request.delta} XP ${status === "approved" ? "schváleno" : "zamítnuto"}`
        );
      }
    } catch {
      toast.error("Nepodařilo se uložit rozhodnutí.");
    }
  }

  async function handleSignOut() {
    await signOutUser();
    router.replace("/login");
  }

  if (!member) return null;

  return (
    <div className="flex flex-col gap-8 pb-8">
      <h1 className="text-xl font-semibold">Nastavení</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Profil</h2>
        <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={name || member.name} avatarUrl={avatarUrl} size="lg" />
            <div className="flex flex-wrap gap-1.5">
              {AVATAR_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setAvatarUrl(emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${
                    avatarUrl === emoji ? "bg-accent/20 ring-2 ring-accent" : "bg-surface-muted"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={savingProfile}
            className="self-start rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Uložit profil
          </button>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Vzhled</h2>
        <ThemeToggle />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Notifikace</h2>
        <p className="text-sm text-zinc-500">
          {member.fcmToken ? "Notifikace jsou zapnuté na tomto zařízení." : "Notifikace nejsou zapnuté."}
        </p>
        <button
          type="button"
          onClick={handleEnableNotifications}
          className="self-start rounded-full border border-border px-5 py-2 text-sm font-semibold"
        >
          {member.fcmToken ? "Aktualizovat" : "Povolit notifikace"}
        </button>
        {pushStatus && <p className="text-sm text-zinc-500">{pushStatus}</p>}
      </section>

      {family && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Rodina</h2>
          <p className="text-sm text-zinc-500">{family.name}</p>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-surface-muted px-3 py-2 text-lg font-semibold tracking-widest">
              {family.inviteCode}
            </code>
            <button
              type="button"
              onClick={handleCopyInviteCode}
              className="rounded-full border border-border px-3 py-2 text-sm"
            >
              {copyStatus ?? "Kopírovat"}
            </button>
            {member.role === "parent" && (
              <button
                type="button"
                onClick={handleRegenerateInviteCode}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-2 text-sm"
              >
                <RefreshCw size={14} /> Nový kód
              </button>
            )}
          </div>
        </section>
      )}

      {member.role === "parent" && pendingAdjustments.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-medium">Čeká na schválení (XP)</h2>
          {pendingAdjustments.map((request) => {
            const target = members.find((m) => m.id === request.targetUserId);
            const requester = members.find((m) => m.id === request.requestedBy);
            const isOwnRequest = request.requestedBy === user?.uid;
            return (
              <div
                key={request.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {target?.name ?? request.targetUserId}: {request.delta >= 0 ? "+" : ""}
                    {request.delta} XP
                  </p>
                  <p className="truncate text-sm text-zinc-500">
                    {request.reason} · požádal(a) {requester?.name ?? request.requestedBy}
                  </p>
                </div>
                {isOwnRequest ? (
                  <span className="shrink-0 text-sm text-zinc-400">Čeká na druhého rodiče</span>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDecideAdjustment(request, "approved")}
                      className="rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                    >
                      Schválit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecideAdjustment(request, "rejected")}
                      className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                    >
                      Zamítnout
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {member.role === "parent" && members.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Členové rodiny</h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="text-sm text-zinc-500">{m.role === "parent" ? "Rodič" : "Dítě"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustingMemberId(adjustingMemberId === m.id ? null : m.id);
                        setAdjustDelta("");
                        setAdjustReason("");
                      }}
                      className="flex items-center gap-1 text-sm text-accent"
                    >
                      <Zap size={14} /> XP
                    </button>
                    <button type="button" onClick={() => handleRoleToggle(m)} className="text-sm text-accent">
                      {m.role === "parent" ? "Nastavit jako dítě" : "Nastavit jako rodiče"}
                    </button>
                    {m.id !== user?.uid && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m)}
                        className="text-red-600"
                        aria-label="Odebrat"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {adjustingMemberId === m.id && (
                  <form
                    onSubmit={(e) => handleSubmitAdjustment(e, m.id)}
                    className="flex flex-col gap-2 border-t border-border pt-2"
                  >
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="±XP, např. -20"
                        value={adjustDelta}
                        onChange={(e) => setAdjustDelta(e.target.value)}
                        required
                        className="w-32 rounded-lg border border-border bg-surface px-3 py-2"
                      />
                      <input
                        type="text"
                        placeholder="Důvod"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        required
                        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={submittingAdjustment}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                      >
                        Odeslat
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustingMemberId(null)}
                        className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
                      >
                        Zrušit
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {member.role === "parent" && familyId && <AntiGamingPanel familyId={familyId} members={members} />}

      {member.role === "parent" && familyId && <AuditLogPanel familyId={familyId} members={members} />}

      <section>
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 text-sm font-semibold text-red-600"
        >
          <LogOut size={16} /> Odhlásit se
        </button>
      </section>
    </div>
  );
}
