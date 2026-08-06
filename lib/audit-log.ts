"use client";

import { addDoc, collection } from "firebase/firestore";
import { getDb } from "./firebase";
import type { AuditAction } from "./types";

/**
 * Fire-and-forget: a missing audit entry should never block the actual
 * action it's describing, so callers don't await this and errors are
 * swallowed (matching the `messages` collection's own failure posture).
 */
export function logAction(familyId: string, actorId: string, action: AuditAction, detail: string): void {
  addDoc(collection(getDb(), "families", familyId, "auditLog"), {
    actorId,
    action,
    detail,
    timestamp: Date.now(),
  }).catch(() => {});
}
