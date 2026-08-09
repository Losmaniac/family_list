"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { ArrowLeftRight, Check, Handshake, X } from "lucide-react";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { marketplaceTrade } from "@/lib/marketplace";
import { formatXp } from "@/lib/xp-engine";
import type { Member, MarketplaceOffer, MarketplaceOfferKind } from "@/lib/types";

const KIND_LABELS: Record<MarketplaceOfferKind, string> = {
  offer: "Nabídka služby",
  request: "Poptávka služby",
};

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

/**
 * P2P XP marketplace — any two family members can trade a service for XP
 * directly between their own balances, separate from the system-funded
 * Reward shop above. See lib/marketplace.ts for who pays vs earns, and
 * firestore.rules' marketplaceOffers match for the turn-based negotiation
 * this UI mirrors (only whoever didn't set the current amount may respond).
 */
export default function Marketplace({ familyId }: { familyId: string }) {
  const { user } = useAuth();
  const toast = useToast();

  const [members, setMembers] = useState<Record<string, Member>>({});
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<MarketplaceOfferKind>("offer");
  const [title, setTitle] = useState("");
  const [targetUserId, setTargetUserId] = useState("");
  const [xp, setXp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [counterAmounts, setCounterAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    return onSnapshot(collection(getDb(), "families", familyId, "members"), (snapshot) => {
      const next: Record<string, Member> = {};
      for (const memberDoc of snapshot.docs) {
        next[memberDoc.id] = { id: memberDoc.id, ...memberDoc.data() } as Member;
      }
      setMembers(next);
    });
  }, [familyId]);

  // Firestore has no native OR query, so a member's offers (as either
  // party) are two separate live queries merged client-side.
  useEffect(() => {
    if (!user) return;
    const proposedQuery = query(collection(getDb(), "families", familyId, "marketplaceOffers"), where("proposedBy", "==", user.uid));
    const targetedQuery = query(collection(getDb(), "families", familyId, "marketplaceOffers"), where("targetUserId", "==", user.uid));
    let proposed: MarketplaceOffer[] = [];
    let targeted: MarketplaceOffer[] = [];
    function merge() {
      const byId = new Map<string, MarketplaceOffer>();
      for (const offer of [...proposed, ...targeted]) byId.set(offer.id, offer);
      setOffers(Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt));
    }
    const unsubProposed = onSnapshot(proposedQuery, (snapshot) => {
      proposed = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MarketplaceOffer);
      merge();
    });
    const unsubTargeted = onSnapshot(targetedQuery, (snapshot) => {
      targeted = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as MarketplaceOffer);
      merge();
    });
    return () => {
      unsubProposed();
      unsubTargeted();
    };
  }, [familyId, user]);

  const otherMembers = Object.values(members).filter((m) => m.id !== user?.uid);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !title.trim() || !targetUserId) return;
    const amount = Number(xp);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setSubmitting(true);
    try {
      await addDoc(collection(getDb(), "families", familyId, "marketplaceOffers"), {
        kind,
        title: title.trim(),
        proposedBy: user.uid,
        targetUserId,
        suggestedXp: amount,
        currentXp: amount,
        lastActionBy: user.uid,
        status: "pending",
        timestamp: Date.now(),
        updatedAt: Date.now(),
      });
      toast.success("Nabídka odeslána.");
      setTitle("");
      setXp("");
      setTargetUserId("");
      setShowForm(false);
    } catch (err) {
      toast.error(describeError(err, "Nabídku se nepodařilo odeslat."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecide(offer: MarketplaceOffer, status: "accepted" | "declined") {
    try {
      await updateDoc(doc(getDb(), "families", familyId, "marketplaceOffers", offer.id), { status, updatedAt: Date.now() });
      if (status === "accepted") toast.success("Obchod uzavřen — XP bylo převedeno.");
    } catch (err) {
      toast.error(describeError(err, "Nepodařilo se uložit rozhodnutí."));
    }
  }

  async function handleCounter(offer: MarketplaceOffer) {
    if (!user) return;
    const amount = Number(counterAmounts[offer.id]);
    if (!Number.isFinite(amount) || amount <= 0) return;
    try {
      await updateDoc(doc(getDb(), "families", familyId, "marketplaceOffers", offer.id), {
        currentXp: amount,
        lastActionBy: user.uid,
        updatedAt: Date.now(),
      });
      setCounterAmounts((prev) => ({ ...prev, [offer.id]: "" }));
      toast.success("Nová částka navržena.");
    } catch (err) {
      toast.error(describeError(err, "Návrh se nepodařilo odeslat."));
    }
  }

  async function handleCancel(offer: MarketplaceOffer) {
    try {
      await deleteDoc(doc(getDb(), "families", familyId, "marketplaceOffers", offer.id));
    } catch (err) {
      toast.error(describeError(err, "Nabídku se nepodařilo zrušit."));
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-medium">
          <Handshake size={16} /> Tržiště mezi členy
        </h2>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} className="text-sm font-semibold text-accent">
            + Nová nabídka
          </button>
        )}
      </div>
      <p className="text-sm text-zinc-500">
        Nabídni službu ostatním za XP, nebo naopak poptej službu a nabídni za ni XP. Druhá strana může přijmout, odmítnout
        nebo navrhnout jinou částku. XP se převádí přímo mezi vámi, nevznikají ani nemizí.
      </p>

      {showForm && (
        <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-xl border border-border p-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setKind("offer")}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm ${kind === "offer" ? "bg-accent text-accent-foreground" : "border border-border"}`}
            >
              Nabízím službu
            </button>
            <button
              type="button"
              onClick={() => setKind("request")}
              className={`flex-1 rounded-full px-3 py-1.5 text-sm ${kind === "request" ? "bg-accent text-accent-foreground" : "border border-border"}`}
            >
              Poptávám službu
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Např. Masáž"
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <select
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          >
            <option value="">
              {kind === "offer" ? "Komu nabízíš…" : "Koho poptáváš…"}
            </option>
            {otherMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={xp}
            onChange={(e) => setXp(e.target.value)}
            placeholder="Počet XP"
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting || !title.trim() || !targetUserId || !xp}
              className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Odeslat
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-full border border-border px-4 py-2 text-sm">
              Zrušit
            </button>
          </div>
        </form>
      )}

      {offers.length > 0 && (
        <div className="flex flex-col gap-2">
          {offers.map((offer) => {
            const other = members[offer.proposedBy === user?.uid ? offer.targetUserId : offer.proposedBy];
            const { payerId } = marketplaceTrade(offer);
            const iPay = payerId === user?.uid;
            const myTurn = offer.status === "pending" && offer.lastActionBy !== user?.uid;
            return (
              <div key={offer.id} className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{offer.title}</p>
                    <p className="text-sm text-zinc-500">
                      {KIND_LABELS[offer.kind]} · {other?.name ?? "?"} · {iPay ? "ty platíš" : "tobě platí"} {formatXp(offer.currentXp)} XP
                    </p>
                  </div>
                  {offer.status === "pending" && offer.proposedBy === user?.uid && (
                    <button type="button" onClick={() => handleCancel(offer)} className="shrink-0 text-zinc-400" aria-label="Zrušit nabídku">
                      <X size={16} />
                    </button>
                  )}
                </div>

                {offer.status === "accepted" && <p className="text-sm font-semibold text-success">Přijato — XP převedeno.</p>}
                {offer.status === "declined" && <p className="text-sm text-danger">Odmítnuto.</p>}

                {offer.status === "pending" && !myTurn && (
                  <p className="text-sm text-zinc-400">Čeká na {other?.name ?? "druhou stranu"}.</p>
                )}

                {offer.status === "pending" && myTurn && (
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleDecide(offer, "accepted")}
                        className="flex items-center gap-1 rounded-full bg-success px-3 py-1 text-sm font-semibold text-white"
                      >
                        <Check size={14} /> Přijmout
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecide(offer, "declined")}
                        className="rounded-full bg-surface-muted px-3 py-1 text-sm font-semibold"
                      >
                        Odmítnout
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={counterAmounts[offer.id] ?? ""}
                        onChange={(e) => setCounterAmounts((prev) => ({ ...prev, [offer.id]: e.target.value }))}
                        placeholder="Jiná částka XP"
                        className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleCounter(offer)}
                        disabled={!counterAmounts[offer.id]}
                        className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                      >
                        <ArrowLeftRight size={14} /> Navrhnout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
