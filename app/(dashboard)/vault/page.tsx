"use client";

import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
} from "firebase/storage";
import {
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Lock,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import { getDb, getFirebaseStorage } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useFamily } from "@/lib/family-context";
import { useToast } from "@/lib/toast-context";
import { useDialog } from "@/lib/dialog-context";
import { formatDateTimeInFamilyZone } from "@/lib/date-utils";
import {
  decryptCredential,
  deriveVaultKey,
  encryptCredential,
  encryptWithVaultKey,
  generateVaultSalt,
  VAULT_VERIFIER_PLAINTEXT,
  verifyVaultPassphrase,
  type VaultCredentialPayload,
} from "@/lib/vault-crypto";
import type { VaultConfig, VaultItem } from "@/lib/types";

function describeError(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : undefined;
  return message ? `${fallback} (${message})` : fallback;
}

function emptyCredentialForm() {
  return { title: "", username: "", password: "", note: "" };
}

/**
 * "Trezor" — the digital family vault. Documents (a Storage file, plain-
 * access-control like taskPhotos) and credentials (AES-GCM encrypted
 * client-side, see lib/vault-crypto.ts) live side by side in one list.
 * Parent-only page top to bottom — firestore.rules/storage.rules enforce
 * this independently, this is just the matching UI gate.
 *
 * The derived AES key lives only in this component's state, for this tab's
 * lifetime — a reload re-locks the vault. That's a deliberate trade-off
 * (convenience vs. not persisting decryption material anywhere) spelled
 * out in the unlock screen's copy.
 */
export default function VaultPage() {
  const { user } = useAuth();
  const { familyId, member } = useFamily();
  const toast = useToast();
  const { confirm } = useDialog();

  const isParent = member?.role === "parent";

  const [config, setConfig] = useState<VaultConfig | null | undefined>(
    undefined,
  );
  const [items, setItems] = useState<VaultItem[]>([]);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);

  const [passphraseInput, setPassphraseInput] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const [setupPassphrase, setSetupPassphrase] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [settingUp, setSettingUp] = useState(false);

  const [addMode, setAddMode] = useState<"none" | "document" | "credential">(
    "none",
  );
  const [credentialForm, setCredentialForm] = useState(emptyCredentialForm());
  const [documentTitle, setDocumentTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revealedIds, setRevealedIds] = useState<
    Record<string, VaultCredentialPayload>
  >({});

  useEffect(() => {
    if (!familyId || !isParent) return;
    return onSnapshot(
      doc(getDb(), "families", familyId, "vaultConfig", "meta"),
      (snap) => {
        setConfig(snap.exists() ? (snap.data() as VaultConfig) : null);
      },
    );
  }, [familyId, isParent]);

  useEffect(() => {
    if (!familyId || !isParent || !vaultKey) return;
    const q = query(
      collection(getDb(), "families", familyId, "vaultItems"),
      orderBy("createdAt", "desc"),
    );
    return onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as VaultItem));
    });
  }, [familyId, isParent, vaultKey]);

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user) return;
    if (setupPassphrase.length < 8) {
      toast.error("Heslo musí mít aspoň 8 znaků.");
      return;
    }
    if (setupPassphrase !== setupConfirm) {
      toast.error("Hesla se neshodují.");
      return;
    }
    setSettingUp(true);
    try {
      const salt = generateVaultSalt();
      const key = await deriveVaultKey(setupPassphrase, salt);
      const verifier = await encryptWithVaultKey(key, VAULT_VERIFIER_PLAINTEXT);
      await setDoc(doc(getDb(), "families", familyId, "vaultConfig", "meta"), {
        salt,
        verifierCipherText: verifier.cipherText,
        verifierIv: verifier.iv,
        createdBy: user.uid,
        createdAt: Date.now(),
      } satisfies VaultConfig);
      setVaultKey(key);
      setSetupPassphrase("");
      setSetupConfirm("");
      toast.success("Trezor založen.");
    } catch (err) {
      toast.error(describeError(err, "Trezor se nepodařilo založit."));
    } finally {
      setSettingUp(false);
    }
  }

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!config) return;
    setUnlocking(true);
    try {
      const key = await deriveVaultKey(passphraseInput, config.salt);
      const ok = await verifyVaultPassphrase(key, {
        cipherText: config.verifierCipherText,
        iv: config.verifierIv,
      });
      if (!ok) {
        toast.error("Nesprávné heslo.");
        return;
      }
      setVaultKey(key);
      setPassphraseInput("");
    } catch (err) {
      toast.error(describeError(err, "Odemknutí se nezdařilo."));
    } finally {
      setUnlocking(false);
    }
  }

  function handleLock() {
    setVaultKey(null);
    setRevealedIds({});
    setItems([]);
  }

  async function handleReset() {
    if (!familyId) return;
    const ok = await confirm({
      title: "Resetovat trezor?",
      description:
        "Smaže se nastavené heslo a VŠECHNY uložené přihlašovací údaje (nejdou dešifrovat bez starého hesla, takže je stejně nejde zachránit). Nahrané dokumenty zůstanou. Poté půjde založit trezor s novým heslem.",
      confirmLabel: "Resetovat",
      danger: true,
    });
    if (!ok) return;
    try {
      const credentialsSnap = await getDocs(
        query(collection(getDb(), "families", familyId, "vaultItems")),
      );
      const batch = writeBatch(getDb());
      for (const d of credentialsSnap.docs) {
        if ((d.data() as VaultItem).type === "credential") batch.delete(d.ref);
      }
      batch.delete(doc(getDb(), "families", familyId, "vaultConfig", "meta"));
      await batch.commit();
      handleLock();
      toast.success("Trezor resetován — založ ho znovu s novým heslem.");
    } catch (err) {
      toast.error(describeError(err, "Reset se nezdařil."));
    }
  }

  async function handleAddCredential(e: React.FormEvent) {
    e.preventDefault();
    if (!familyId || !user || !vaultKey || !credentialForm.title.trim()) return;
    setSubmitting(true);
    try {
      const encrypted = await encryptCredential(vaultKey, {
        username: credentialForm.username.trim(),
        password: credentialForm.password,
        ...(credentialForm.note.trim()
          ? { note: credentialForm.note.trim() }
          : {}),
      });
      await setDoc(
        doc(collection(getDb(), "families", familyId, "vaultItems")),
        {
          type: "credential",
          title: credentialForm.title.trim(),
          cipherText: encrypted.cipherText,
          iv: encrypted.iv,
          createdBy: user.uid,
          createdAt: Date.now(),
        } satisfies Omit<VaultItem, "id">,
      );
      setCredentialForm(emptyCredentialForm());
      setAddMode("none");
    } catch (err) {
      toast.error(describeError(err, "Nepodařilo se uložit."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDocumentSelected(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !familyId || !user || !documentTitle.trim()) return;
    setSubmitting(true);
    try {
      const path = `families/${familyId}/vaultDocuments/${user.uid}_${Date.now()}`;
      const ref = storageRef(getFirebaseStorage(), path);
      await uploadBytes(ref, file, { contentType: file.type });
      const fileUrl = await getDownloadURL(ref);
      await setDoc(
        doc(collection(getDb(), "families", familyId, "vaultItems")),
        {
          type: "document",
          title: documentTitle.trim(),
          fileUrl,
          fileName: file.name,
          createdBy: user.uid,
          createdAt: Date.now(),
        } satisfies Omit<VaultItem, "id">,
      );
      setDocumentTitle("");
      setAddMode("none");
    } catch (err) {
      toast.error(describeError(err, "Dokument se nepodařilo nahrát."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReveal(item: VaultItem) {
    if (!vaultKey || item.type !== "credential" || !item.cipherText || !item.iv)
      return;
    try {
      const payload = await decryptCredential(vaultKey, {
        cipherText: item.cipherText,
        iv: item.iv,
      });
      setRevealedIds((prev) => ({ ...prev, [item.id]: payload }));
    } catch {
      toast.error(
        "Nepodařilo se dešifrovat — heslo trezoru se od uložení mohlo změnit.",
      );
    }
  }

  function handleHide(itemId: string) {
    setRevealedIds((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  async function handleDelete(item: VaultItem) {
    if (!familyId) return;
    const ok = await confirm({
      title: `Smazat „${item.title}“?`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteDoc(
        doc(getDb(), "families", familyId, "vaultItems", item.id),
      );
    } catch {
      toast.error("Nepodařilo se smazat.");
    }
  }

  if (!isParent) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center text-zinc-500">
        <Lock size={40} />
        <p className="text-lg">Trezor je dostupný jen rodičům.</p>
      </div>
    );
  }

  if (config === undefined) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Trezor</h1>
        <p className="text-sm text-zinc-500">
          Důležité dokumenty a přihlašovací údaje rodiny, na jednom místě.
        </p>
      </div>

      {config === null && (
        <form
          onSubmit={handleSetup}
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <div className="flex items-start gap-2 rounded-lg bg-surface-muted p-3 text-sm text-zinc-500">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <p>
              Heslo trezoru appka nikde neukládá — jen z něj matematicky
              odvozuje šifrovací klíč. Pokud ho zapomeneš, uložené přihlašovací
              údaje už nepůjde obnovit, jen resetovat trezor a založit znovu.
            </p>
          </div>
          <input
            type="password"
            required
            autoFocus
            placeholder="Nové heslo trezoru (aspoň 8 znaků)"
            value={setupPassphrase}
            onChange={(e) => setSetupPassphrase(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <input
            type="password"
            required
            placeholder="Zopakuj heslo"
            value={setupConfirm}
            onChange={(e) => setSetupConfirm(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <button
            type="submit"
            disabled={settingUp}
            className="self-start rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Založit trezor
          </button>
        </form>
      )}

      {config !== null && !vaultKey && (
        <form
          onSubmit={handleUnlock}
          className="flex flex-col gap-3 rounded-xl border border-border p-4"
        >
          <p className="flex items-center gap-2 text-sm text-zinc-500">
            <Lock size={16} /> Trezor je zamčený.
          </p>
          <input
            type="password"
            required
            autoFocus
            placeholder="Heslo trezoru"
            value={passphraseInput}
            onChange={(e) => setPassphraseInput(e.target.value)}
            className="rounded-lg border border-border bg-surface px-4 py-2"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={unlocking}
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
            >
              Odemknout
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-border px-4 py-3 text-sm font-semibold text-danger"
            >
              Zapomenuté heslo — resetovat
            </button>
          </div>
        </form>
      )}

      {vaultKey && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setAddMode(addMode === "credential" ? "none" : "credential")
              }
              className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold ${
                addMode === "credential"
                  ? "bg-accent text-accent-foreground"
                  : "border border-border"
              }`}
            >
              <KeyRound size={16} /> Přidat přihlašovací údaje
            </button>
            <button
              type="button"
              onClick={() =>
                setAddMode(addMode === "document" ? "none" : "document")
              }
              className={`flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold ${
                addMode === "document"
                  ? "bg-accent text-accent-foreground"
                  : "border border-border"
              }`}
            >
              <FileText size={16} /> Přidat dokument
            </button>
            <button
              type="button"
              onClick={handleLock}
              className="ml-auto flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              <Lock size={16} /> Zamknout
            </button>
          </div>

          {addMode === "credential" && (
            <form
              onSubmit={handleAddCredential}
              className="flex flex-col gap-3 rounded-xl border border-border p-4"
            >
              <input
                type="text"
                required
                autoFocus
                placeholder="Název (např. E-mail, WiFi)"
                value={credentialForm.title}
                onChange={(e) =>
                  setCredentialForm((prev) => ({
                    ...prev,
                    title: e.target.value,
                  }))
                }
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <input
                type="text"
                placeholder="Uživatelské jméno / e-mail (nepovinné)"
                value={credentialForm.username}
                onChange={(e) =>
                  setCredentialForm((prev) => ({
                    ...prev,
                    username: e.target.value,
                  }))
                }
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <input
                type="text"
                placeholder="Heslo / PIN"
                value={credentialForm.password}
                onChange={(e) =>
                  setCredentialForm((prev) => ({
                    ...prev,
                    password: e.target.value,
                  }))
                }
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <textarea
                placeholder="Poznámka (nepovinné)"
                value={credentialForm.note}
                onChange={(e) =>
                  setCredentialForm((prev) => ({
                    ...prev,
                    note: e.target.value,
                  }))
                }
                rows={2}
                className="resize-none rounded-lg border border-border bg-surface px-4 py-2"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !credentialForm.title.trim()}
                  className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  Uložit
                </button>
                <button
                  type="button"
                  onClick={() => setAddMode("none")}
                  className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
                >
                  Zrušit
                </button>
              </div>
            </form>
          )}

          {addMode === "document" && (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
              <input
                type="text"
                required
                autoFocus
                placeholder="Název (např. Rodný list — Anička)"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="rounded-lg border border-border bg-surface px-4 py-2"
              />
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentSelected}
                disabled={submitting || !documentTitle.trim()}
                className="text-sm"
              />
              <div className="flex items-center gap-1 text-xs text-zinc-400">
                <Upload size={14} /> Foto nebo PDF, max 20 MB.
              </div>
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-sm text-zinc-500">Trezor je zatím prázdný.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-xl border border-border px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {item.type === "document" ? (
                      <FileText size={18} className="shrink-0 text-accent" />
                    ) : (
                      <KeyRound size={18} className="shrink-0 text-accent" />
                    )}
                    <p className="min-w-0 flex-1 truncate font-medium">
                      {item.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      aria-label="Smazat"
                      className="shrink-0 text-zinc-400 hover:text-danger"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {item.type === "document" && item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-accent"
                    >
                      {item.fileName ?? "Otevřít soubor"}
                    </a>
                  )}

                  {item.type === "credential" &&
                    (revealedIds[item.id] ? (
                      <div className="flex flex-col gap-1 rounded-lg bg-surface-muted p-3 text-sm">
                        {revealedIds[item.id].username && (
                          <p>Uživatel: {revealedIds[item.id].username}</p>
                        )}
                        <p>Heslo: {revealedIds[item.id].password}</p>
                        {revealedIds[item.id].note && (
                          <p className="text-zinc-500">
                            {revealedIds[item.id].note}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={() => handleHide(item.id)}
                          className="mt-1 flex items-center gap-1 self-start text-xs text-zinc-500"
                        >
                          <EyeOff size={14} /> Skrýt
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleReveal(item)}
                        className="flex items-center gap-1 self-start rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                      >
                        <Eye size={14} /> Zobrazit
                      </button>
                    ))}

                  <p className="text-xs text-zinc-400">
                    {formatDateTimeInFamilyZone(new Date(item.createdAt))}
                  </p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="mt-2 flex items-center gap-1 self-start text-xs font-semibold text-danger"
          >
            <ShieldAlert size={14} /> Resetovat trezor (změnit heslo)
          </button>
        </>
      )}
    </div>
  );
}
