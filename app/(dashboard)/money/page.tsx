"use client";

import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query } from "firebase/firestore";
import { Plus, Trash2, Wallet } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import { formatMoneyCzk, sumMoneyEntries } from "@/lib/money";
import Avatar from "@/components/Avatar";
import AvatarPicker from "@/components/AvatarPicker";
import type { ChildProfile, Member, MoneyAccountEntry, MoneyEntryType } from "@/lib/types";

interface MoneyOwner {
  id: string;
  name: string;
  avatarUrl?: string;
}

function emptyEntryForm() {
  return { type: "income" as MoneyEntryType, amount: "", description: "" };
}

/**
 * "Peníze" — a real (not XP) money ledger a parent keeps for a child's own
 * money, including a child with no app login of their own (ChildProfile).
 * Only a parent writes entries (own family/{familyId}/moneyAccounts/{ownerId}/
 * entries); a registered child can view only their own account, read-only.
 */
export default function MoneyPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const isParent = member?.role === "parent";

  const [members, setMembers] = useState<Member[]>([]);
  const [childProfiles, setChildProfiles] = useState<ChildProfile[]>([]);
  const [entries, setEntries] = useState<MoneyAccountEntry[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAvatar, setNewChildAvatar] = useState<string | undefined>(undefined);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntryForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      setMembers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Member));
    });
  }, [familyId]);

  useEffect(() => {
    if (!familyId || !isParent) return;
    return onSnapshot(collection(getDb(), "families", familyId, "childProfiles"), (snapshot) => {
      setChildProfiles(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as ChildProfile));
    });
  }, [familyId, isParent]);

  const owners: MoneyOwner[] = useMemo(() => {
    if (isParent) {
      const memberOwners = members
        .filter((m) => m.role !== "parent")
        .map((m): MoneyOwner => ({ id: m.id, name: m.name, avatarUrl: m.avatarUrl }));
      const childOwners = childProfiles.map((c): MoneyOwner => ({ id: c.id, name: c.name, avatarUrl: c.avatarUrl }));
      return [...memberOwners, ...childOwners];
    }
    const me = members.find((m) => m.id === user?.uid);
    return me ? [{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }] : [];
  }, [isParent, members, childProfiles, user]);

  const selected = isParent ? (selectedOwnerId ?? owners[0]?.id ?? null) : (user?.uid ?? null);
  const selectedOwner = owners.find((o) => o.id === selected);

  useEffect(() => {
    if (!familyId || !selected) return;
    const q = query(
      collection(getDb(), "families", familyId, "moneyAccounts", selected, "entries"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MoneyAccountEntry));
    });
  }, [familyId, selected]);

  const balance = sumMoneyEntries(entries);

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !newChildName.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "childProfiles"), {
        name: newChildName.trim(),
        ...(newChildAvatar ? { avatarUrl: newChildAvatar } : {}),
        createdBy: user.uid,
        createdAt: Date.now(),
      });
      toast.success("Dítě přidáno.");
      setNewChildName("");
      setNewChildAvatar(undefined);
      setShowAddChild(false);
    } catch {
      toast.error("Nepodařilo se přidat dítě.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(entryForm.amount);
    if (!familyId || !user || !selected || !(amount > 0) || !entryForm.description.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "moneyAccounts", selected, "entries"), {
        type: entryForm.type,
        amount,
        description: entryForm.description.trim(),
        createdBy: user.uid,
        timestamp: Date.now(),
      });
      setEntryForm(emptyEntryForm());
      setShowEntryForm(false);
    } catch {
      toast.error("Záznam se nepodařilo přidat.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEntry(entry: MoneyAccountEntry) {
    if (!familyId || !selected) return;
    const ok = await confirm({
      title: "Smazat záznam?",
      description: `„${entry.description}“ bude odstraněn.`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "moneyAccounts", selected, "entries", entry.id));
    } catch {
      toast.error("Záznam se nepodařilo smazat.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Peníze</h1>
          <p className="text-sm text-zinc-500">
            {isParent ? "Skutečné peníze dětí — příjmy a výdaje, které za ně vedeš." : "Tvoje skutečné peníze."}
          </p>
        </div>
        {isParent && !showAddChild && (
          <button
            type="button"
            onClick={() => setShowAddChild(true)}
            className="flex shrink-0 items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold"
          >
            <Plus size={16} /> Dítě mimo appku
          </button>
        )}
      </div>

      {isParent && showAddChild && (
        <form onSubmit={handleAddChild} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <p className="text-sm text-zinc-500">
            Pro dítě, které v appce nemá vlastní účet (např. batole) — jen jméno a volitelný avatar.
          </p>
          <input
            type="text"
            required
            autoFocus
            placeholder="Jméno dítěte"
            value={newChildName}
            onChange={(e) => setNewChildName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <AvatarPicker value={newChildAvatar} onChange={setNewChildAvatar} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !newChildName.trim()}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Uložit
            </button>
            <button
              type="button"
              onClick={() => setShowAddChild(false)}
              className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
            >
              Zrušit
            </button>
          </div>
        </form>
      )}

      {isParent && owners.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {owners.map((owner) => (
            <button
              key={owner.id}
              type="button"
              onClick={() => setSelectedOwnerId(owner.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
                selected === owner.id ? "bg-accent text-accent-foreground" : "border border-border"
              }`}
            >
              <Avatar name={owner.name} avatarUrl={owner.avatarUrl} size="sm" />
              {owner.name}
            </button>
          ))}
        </div>
      )}

      {owners.length === 0 ? (
        <p className="text-sm text-zinc-500">Zatím žádné děti v rodině.</p>
      ) : selectedOwner ? (
        <>
          <div className="flex items-center gap-3 rounded-xl border border-border p-4">
            <Wallet size={28} className="shrink-0 text-accent" />
            <div>
              <p className="text-sm text-zinc-500">Zůstatek — {selectedOwner.name}</p>
              <p className={`text-2xl font-bold ${balance < 0 ? "text-danger" : ""}`}>{formatMoneyCzk(balance)}</p>
            </div>
          </div>

          {isParent && (
            <>
              {!showEntryForm ? (
                <button
                  type="button"
                  onClick={() => setShowEntryForm(true)}
                  className="flex items-center justify-center gap-1 self-start rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
                >
                  <Plus size={16} /> Přidat příjem/výdaj
                </button>
              ) : (
                <form onSubmit={handleAddEntry} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                  <div className="inline-flex self-start rounded-full border border-border p-1 text-sm">
                    {(["income", "expense"] as MoneyEntryType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setEntryForm((prev) => ({ ...prev, type: t }))}
                        className={`rounded-full px-4 py-1.5 ${
                          entryForm.type === t ? "bg-accent text-accent-foreground" : "text-zinc-500"
                        }`}
                      >
                        {t === "income" ? "Příjem" : "Výdaj"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Popis (např. Dárek od babičky)"
                    value={entryForm.description}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="rounded-lg border border-border bg-surface px-4 py-2"
                  />
                  <input
                    type="number"
                    required
                    min={0.01}
                    step="0.01"
                    placeholder="Částka v Kč"
                    value={entryForm.amount}
                    onChange={(e) => setEntryForm((prev) => ({ ...prev, amount: e.target.value }))}
                    className="rounded-lg border border-border bg-surface px-4 py-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={submitting || !entryForm.description.trim() || !(Number(entryForm.amount) > 0)}
                      className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                    >
                      Uložit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEntryForm(false)}
                      className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
                    >
                      Zrušit
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {entries.length === 0 ? (
            <p className="text-sm text-zinc-500">Zatím žádné záznamy.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{entry.description}</p>
                    <p className="text-xs text-zinc-400">{formatDateTimeInFamilyZone(new Date(entry.timestamp))}</p>
                  </div>
                  <p className={`shrink-0 font-semibold tabular-nums ${entry.type === "income" ? "text-success" : "text-danger"}`}>
                    {entry.type === "income" ? "+" : "−"}
                    {formatMoneyCzk(entry.amount)}
                  </p>
                  {isParent && (
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      aria-label="Smazat záznam"
                      className="shrink-0 text-zinc-400 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
