/**
 * Family creation/joining runs through trusted server code (not client writes)
 * so a joining user can never self-assign the 'parent' role or write another
 * user's users/{uid} mapping.
 */
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { generateInviteCode } from "../../lib/invite-code";

interface CreateFamilyRequest {
  familyName: string;
  memberName: string;
}

interface JoinFamilyRequest {
  inviteCode: string;
  memberName: string;
}

function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in required.");
}

export const createFamily = onCall<CreateFamilyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const familyName = request.data.familyName?.trim();
  const memberName = request.data.memberName?.trim();
  if (!familyName || !memberName) {
    throw new HttpsError("invalid-argument", "familyName and memberName are required.");
  }

  const db = getFirestore();
  const existingMapping = await db.collection("users").doc(uid).get();
  if (existingMapping.exists) {
    throw new HttpsError("already-exists", "This account already belongs to a family.");
  }

  const familyRef = db.collection("families").doc();
  const inviteCode = generateInviteCode();

  await db.runTransaction(async (tx) => {
    tx.set(familyRef, { name: familyName, inviteCode });
    tx.set(familyRef.collection("members").doc(uid), {
      name: memberName,
      role: "parent",
      xpBalance: 0,
      currentStreak: 0,
    });
    tx.set(db.collection("users").doc(uid), { familyId: familyRef.id });
  });

  return { familyId: familyRef.id, inviteCode };
});

export const joinFamily = onCall<JoinFamilyRequest>(async (request) => {
  const uid = request.auth?.uid;
  requireAuth(uid);
  const inviteCode = request.data.inviteCode?.trim().toUpperCase();
  const memberName = request.data.memberName?.trim();
  if (!inviteCode || !memberName) {
    throw new HttpsError("invalid-argument", "inviteCode and memberName are required.");
  }

  const db = getFirestore();
  const existingMapping = await db.collection("users").doc(uid).get();
  if (existingMapping.exists) {
    throw new HttpsError("already-exists", "This account already belongs to a family.");
  }

  const familyQuery = await db
    .collection("families")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (familyQuery.empty) {
    throw new HttpsError("not-found", "Neplatný invite kód.");
  }

  const familyRef = familyQuery.docs[0].ref;

  await db.runTransaction(async (tx) => {
    tx.set(familyRef.collection("members").doc(uid), {
      name: memberName,
      role: "child",
      xpBalance: 0,
      currentStreak: 0,
    });
    tx.set(db.collection("users").doc(uid), { familyId: familyRef.id });
  });

  return { familyId: familyRef.id };
});
