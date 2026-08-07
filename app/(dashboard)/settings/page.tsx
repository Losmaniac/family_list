"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { setupPushNotifications, isIosNotStandalone } from "@/lib/push";
import { httpsCallable } from "firebase/functions";
import { getFirebaseFunctions } from "@/lib/firebase";
import { generateInviteCode } from "@/lib/invite-code";
import { xpAdjustmentNeedsApproval } from "@/lib/xp-engine";
import { logAction } from "@/lib/audit-log";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import InfoButton from "@/components/InfoButton";
import ThemeToggle from "@/components/ThemeToggle";
import AccentColorPicker from "@/components/AccentColorPicker";
import InvestmentSettingsPanel from "@/components/InvestmentSettingsPanel";
import GameSettingsPanel from "@/components/GameSettingsPanel";
import StreakSettingsPanel from "@/components/StreakSettingsPanel";
import PhotoSettingsPanel from "@/components/PhotoSettingsPanel";
import ShopAdminPanel from "@/components/ShopAdminPanel";
import AuditLogPanel from "@/components/AuditLogPanel";
import AntiGamingPanel from "@/components/AntiGamingPanel";
import { Bell, BellOff, LogOut, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import type { Member, XpAdjustmentRequest } from "@/lib/types";

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOutUser } = useAuth();
  const { familyId, member, family } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();
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
  const [sendingTest, setSendingTest] = useState(false);
  // useSyncExternalStore's server snapshot (false) always matches the first
  // client render too, avoiding a hydration mismatch — navigator is only
  // available client-side, so the real check only ever runs post-mount.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const iosNotStandalone = mounted && isIosNotStandalone();
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [clearingChat, setClearingChat] = useState(false);
  const [clearingAuditLog, setClearingAuditLog] = useState(false);
  const [savingReminderToggle, setSavingReminderToggle] = useState(false);

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

  async function handleSendTestNotification() {
    setSendingTest(true);
    try {
      await httpsCallable(getFirebaseFunctions(), "sendTestNotification")();
      toast.success("Testovací upozornění odesláno — mělo by dorazit během chvilky.");
    } catch {
      toast.error("Upozornění se nepodařilo odeslat. Zkus notifikace znovu povolit výše.");
    } finally {
      setSendingTest(false);
    }
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

  async function handleClearChat() {
    if (!familyId) return;
    const ok = await confirm({
      title: "Vymazat celou historii chatu?",
      description: "Všechny zprávy se nenávratně smažou. Tuto akci nelze vrátit zpět.",
      confirmLabel: "Vymazat historii",
      danger: true,
    });
    if (!ok) return;
    setClearingChat(true);
    try {
      const snapshot = await getDocs(collection(getDb(), "families", familyId, "messages"));
      // Firestore batches cap at 500 writes — chunk defensively even though
      // a family chat is very unlikely to ever get that large.
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(getDb());
        for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
        await batch.commit();
      }
      if (user) logAction(familyId, user.uid, "chat_cleared", `${docs.length} zpráv smazáno`);
      toast.success("Historie chatu byla vymazána.");
    } catch {
      toast.error("Historii chatu se nepodařilo vymazat.");
    } finally {
      setClearingChat(false);
    }
  }

  async function handleClearAuditLog() {
    if (!familyId) return;
    const ok = await confirm({
      title: "Vymazat historii akcí?",
      description: "Celý log rodičovských akcí se nenávratně smaže. Tuto akci nelze vrátit zpět.",
      confirmLabel: "Vymazat historii",
      danger: true,
    });
    if (!ok) return;
    setClearingAuditLog(true);
    try {
      const snapshot = await getDocs(collection(getDb(), "families", familyId, "auditLog"));
      const docs = snapshot.docs;
      for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(getDb());
        for (const d of docs.slice(i, i + 400)) batch.delete(d.ref);
        await batch.commit();
      }
      // Logged after the wipe, not before — so it's the one entry that
      // survives, a record that a clear happened without keeping what
      // was cleared.
      if (user) logAction(familyId, user.uid, "audit_log_cleared", `${docs.length} záznamů smazáno`);
      toast.success("Historie akcí byla vymazána.");
    } catch {
      toast.error("Historii akcí se nepodařilo vymazat.");
    } finally {
      setClearingAuditLog(false);
    }
  }

  async function handleToggleEveningReminder() {
    if (!familyId) return;
    setSavingReminderToggle(true);
    try {
      await updateDoc(doc(getDb(), "families", familyId), {
        eveningReminderEnabled: family?.eveningReminderEnabled === false,
      });
    } catch {
      toast.error("Nepodařilo se změnit nastavení připomínky.");
    } finally {
      setSavingReminderToggle(false);
    }
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
          <AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
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
        {familyId && member.role === "parent" && (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-zinc-500">Barva zvýraznění (pro celou rodinu)</p>
            <AccentColorPicker familyId={familyId} currentColor={family?.accentColor} />
          </div>
        )}
      </section>

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Herní nastavení</h2>
          <GameSettingsPanel
            familyId={familyId}
            levelTitles={family?.levelTitles}
            taskRequestsEnabled={family?.taskRequestsEnabled}
          />
        </section>
      )}

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Streak</h2>
          <StreakSettingsPanel
            familyId={familyId}
            streakBonusPerDay={family?.streakBonusPerDay}
            streakBonusCap={family?.streakBonusCap}
            streakFreezeEnabled={family?.streakFreezeEnabled}
          />
        </section>
      )}

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Investice</h2>
          <InvestmentSettingsPanel
            familyId={familyId}
            enabled={family?.investmentsEnabled !== false}
            customTerms={family?.investmentTerms}
          />
        </section>
      )}

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Obchod</h2>
          <ShopAdminPanel familyId={familyId} members={members} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Notifikace</h2>
        {iosNotStandalone ? (
          <p className="text-sm text-zinc-500">
            Na iPhonu notifikace fungují jen po přidání appky na plochu — nejdřív klepni na Sdílet →
            „Přidat na plochu“, appku otevři odtud a pak se sem vrať.
          </p>
        ) : (
          <>
            <p className="text-sm text-zinc-500">
              {member.fcmToken ? "Notifikace jsou zapnuté na tomto zařízení." : "Notifikace nejsou zapnuté."}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEnableNotifications}
                className="self-start rounded-full border border-border px-5 py-2 text-sm font-semibold"
              >
                {member.fcmToken ? "Aktualizovat" : "Povolit notifikace"}
              </button>
              {member.fcmToken && (
                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={sendingTest}
                  className="self-start rounded-full border border-border px-5 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {sendingTest ? "Odesílám…" : "Odeslat testovací upozornění"}
                </button>
              )}
            </div>
            {pushStatus && <p className="text-sm text-zinc-500">{pushStatus}</p>}
          </>
        )}
        {member.role === "parent" && familyId && (
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={family?.eveningReminderEnabled !== false}
              onChange={handleToggleEveningReminder}
              disabled={savingReminderToggle}
            />
            Posílat večerní připomínku nedokončených úkolů (19:00)
          </label>
        )}
      </section>

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Chat</h2>
          <button
            type="button"
            onClick={handleClearChat}
            disabled={clearingChat}
            className="flex items-center gap-1.5 self-start rounded-full border border-danger/30 px-5 py-2 text-sm font-semibold text-danger disabled:opacity-50"
          >
            <Trash2 size={16} /> {clearingChat ? "Mažu…" : "Vymazat historii chatu"}
          </button>
        </section>
      )}

      {member.role === "parent" && familyId && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Fotky</h2>
          <PhotoSettingsPanel
            familyId={familyId}
            photoCompressionQuality={family?.photoCompressionQuality}
            photoMaxDimension={family?.photoMaxDimension}
          />
        </section>
      )}

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
          <h2 className="flex items-center gap-1 font-medium">
            Členové rodiny
            <InfoButton
              title="Členové rodiny"
              description="Karta každého člena: role (rodič/dítě), ikona zvonečku ukazuje, jestli má zapnuté notifikace. Tlačítkem XP mu můžeš ručně upravit XP, další tlačítko přepíná roli rodič/dítě, koš člena odebere z rodiny."
            />
          </h2>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name} avatarUrl={m.avatarUrl} size="sm" />
                    <div>
                      <p className="font-medium">{m.name}</p>
                      <p className="flex items-center gap-1 text-sm text-zinc-500">
                        {m.role === "parent" ? "Rodič" : "Dítě"}
                        <span
                          className="flex items-center gap-0.5"
                          title={m.fcmToken ? "Notifikace zapnuté" : "Notifikace nejsou zapnuté"}
                        >
                          {m.fcmToken ? (
                            <Bell size={12} className="text-success" />
                          ) : (
                            <BellOff size={12} className="text-zinc-400" />
                          )}
                        </span>
                      </p>
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

      {member.role === "parent" && familyId && (
        <>
          <AuditLogPanel familyId={familyId} members={members} />
          <button
            type="button"
            onClick={handleClearAuditLog}
            disabled={clearingAuditLog}
            className="flex items-center gap-1.5 self-start rounded-full border border-danger/30 px-5 py-2 text-sm font-semibold text-danger disabled:opacity-50"
          >
            <Trash2 size={16} /> {clearingAuditLog ? "Mažu…" : "Vymazat historii akcí"}
          </button>
        </>
      )}

      {member.role === "parent" && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Vývoj</h2>
          <p className="text-sm text-zinc-500">
            Odkaz na Claude Code session, ve které appka vzniká — otevře se v nové záložce (přihlášení
            ke svému Anthropic účtu je potřeba zvlášť, appka ho nijak nesdílí).
          </p>
          <a
            href="https://claude.ai/code/session_01SP1aoS2nWYPNndd7EA96kM"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 self-start rounded-full border border-border px-5 py-2 text-sm font-semibold"
          >
            <Sparkles size={16} /> Otevřít Claude Code
          </a>
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
