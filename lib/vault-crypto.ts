/**
 * Client-side AES-GCM helpers for the "Trezor" vault's `credential` items
 * (lib/types.ts's VaultItem/VaultConfig) — every call here runs in the
 * browser via the Web Crypto API (`crypto.subtle`), never on a server: the
 * whole point of the vault's credential encryption is that the passphrase,
 * and therefore the derived key, never leaves the device that typed it.
 * Firestore only ever sees ciphertext, a random salt, and random IVs — all
 * safe to store in the clear on their own.
 */

const PBKDF2_ITERATIONS = 250_000;

/** Encrypted (with the real vault key) and stored in VaultConfig.verifierCipherText/verifierIv — decrypting it back to this exact string is how a re-entered passphrase is confirmed correct without ever storing the passphrase itself. */
export const VAULT_VERIFIER_PLAINTEXT = "family-quest-vault-ok";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Uint8Array<ArrayBuffer> specifically (not the wider ArrayBufferLike a plain `new Uint8Array(n)` types as) — SubtleCrypto's BufferSource overloads want a concrete ArrayBuffer. */
function base64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** A fresh random salt for a new vault setup, base64-encoded for Firestore storage. */
export function generateVaultSalt(): string {
  return bytesToBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/** PBKDF2(passphrase, salt) -> a non-extractable AES-256-GCM CryptoKey, held only in memory for the lifetime of the unlocked session (never persisted). */
export async function deriveVaultKey(
  passphrase: string,
  saltBase64: string,
): Promise<CryptoKey> {
  const passphraseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToBytes(saltBase64),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passphraseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export interface EncryptedPayload {
  cipherText: string;
  iv: string;
}

/** Encrypts `plaintext` with a fresh random IV — call again for every item/verifier, never reuse an IV under the same key. */
export async function encryptWithVaultKey(
  key: CryptoKey,
  plaintext: string,
): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBytes = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    cipherText: bytesToBase64(new Uint8Array(cipherBytes)),
    iv: bytesToBase64(iv),
  };
}

/** Throws if the key/IV/ciphertext combination is wrong (wrong passphrase, tampered data, …) — AES-GCM's authentication tag makes that detectable rather than silently returning garbage. */
export async function decryptWithVaultKey(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<string> {
  const plainBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(payload.iv) },
    key,
    base64ToBytes(payload.cipherText),
  );
  return new TextDecoder().decode(plainBytes);
}

/** Re-derives a key from a re-entered passphrase and checks it against the stored verifier — true only if the passphrase is actually correct. */
export async function verifyVaultPassphrase(
  key: CryptoKey,
  verifier: EncryptedPayload,
): Promise<boolean> {
  try {
    return (
      (await decryptWithVaultKey(key, verifier)) === VAULT_VERIFIER_PLAINTEXT
    );
  } catch {
    return false;
  }
}

export interface VaultCredentialPayload {
  username: string;
  password: string;
  note?: string;
}

/** JSON-encodes and encrypts a credential's fields together as one payload — see VaultItem.cipherText/iv. */
export async function encryptCredential(
  key: CryptoKey,
  credential: VaultCredentialPayload,
): Promise<EncryptedPayload> {
  return encryptWithVaultKey(key, JSON.stringify(credential));
}

export async function decryptCredential(
  key: CryptoKey,
  payload: EncryptedPayload,
): Promise<VaultCredentialPayload> {
  return JSON.parse(
    await decryptWithVaultKey(key, payload),
  ) as VaultCredentialPayload;
}
