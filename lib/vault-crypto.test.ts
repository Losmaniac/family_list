import { describe, expect, it } from "vitest";
import {
  decryptCredential,
  decryptWithVaultKey,
  deriveVaultKey,
  encryptCredential,
  encryptWithVaultKey,
  generateVaultSalt,
  VAULT_VERIFIER_PLAINTEXT,
  verifyVaultPassphrase,
} from "./vault-crypto";

describe("vault-crypto", () => {
  it("round-trips a credential through encrypt/decrypt with the right passphrase", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("correct horse battery staple", salt);
    const payload = await encryptCredential(key, {
      username: "dad",
      password: "hunter2",
      note: "email",
    });
    const decrypted = await decryptCredential(key, payload);
    expect(decrypted).toEqual({
      username: "dad",
      password: "hunter2",
      note: "email",
    });
  });

  it("fails to decrypt with the wrong passphrase", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("right passphrase", salt);
    const wrongKey = await deriveVaultKey("wrong passphrase", salt);
    const payload = await encryptWithVaultKey(key, "secret");
    await expect(decryptWithVaultKey(wrongKey, payload)).rejects.toThrow();
  });

  it("verifies a correct passphrase against a stored verifier", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("family passphrase", salt);
    const verifier = await encryptWithVaultKey(key, VAULT_VERIFIER_PLAINTEXT);
    expect(await verifyVaultPassphrase(key, verifier)).toBe(true);
  });

  it("rejects an incorrect passphrase against a stored verifier", async () => {
    const salt = generateVaultSalt();
    const key = await deriveVaultKey("family passphrase", salt);
    const verifier = await encryptWithVaultKey(key, VAULT_VERIFIER_PLAINTEXT);
    const wrongKey = await deriveVaultKey("guess", salt);
    expect(await verifyVaultPassphrase(wrongKey, verifier)).toBe(false);
  });

  it("produces different salts on each call", () => {
    expect(generateVaultSalt()).not.toBe(generateVaultSalt());
  });
});
