"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, deleteDoc, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { LogOut, RefreshCw, Trash2 } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { setupPushNotifications } from "@/lib/push";
import { AVATAR_OPTIONS } from "@/lib/avatars";
import { generateInviteCode } from "@/lib/invite-code";
import Avatar from "@/components/Avatar";
import ThemeToggle from "@/components/ThemeToggle";
import type { Member } from "@/lib/types";

interface FamilyInfo {
  name: string;
  inviteCode: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { familyId, member } = useFamily();
  const [family, setFamily] = useState<FamilyInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

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

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user) return;
    setSavingProfile(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId, "members", user.uid), {
        name,
        avatarUrl: avatarUrl ?? null,
      });
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
    if (!confirm("Vygenerovat nový invite kód? Starý přestane fungovat.")) return;
    await updateDoc(doc(getDb(), "families", familyId), {
      inviteCode: generateInviteCode(),
    });
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
      alert("Rodina musí mít alespoň jednoho rodiče.");
      return;
    }
    await updateDoc(doc(getDb(), "families", familyId, "members", target.id), {
      role: target.role === "parent" ? "child" : "parent",
    });
  }

  async function handleRemoveMember(target: Member) {
    if (!familyId) return;
    if (!confirm(`Odebrat „${target.name}“ z rodiny?`)) return;
    await deleteDoc(doc(getDb(), "families", familyId, "members", target.id));
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

      {member.role === "parent" && members.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Členové rodiny</h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
              >
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
                    onClick={() => handleRoleToggle(m)}
                    className="text-sm text-accent"
                  >
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
            ))}
          </div>
        </section>
      )}

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
