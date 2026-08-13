/**
 * Push notifications for the shared shopping list — a new item added, or
 * an existing one checked off. Purely a side effect: shoppingItems itself
 * is directly client-writable (see firestore.rules), no Cloud Function
 * owns the actual write, this only reacts to it.
 */
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { notifyMembers, type NotifyTarget } from "./notifyHelpers";
import type { Member, ShoppingItem } from "../../lib/types";

async function otherMemberTargets(db: Firestore, familyId: string, excludeUserId: string): Promise<NotifyTarget[]> {
  const membersSnap = await db.collection("families").doc(familyId).collection("members").get();
  return membersSnap.docs
    .filter((d) => d.id !== excludeUserId)
    .map((d) => ({ userId: d.id, fcmToken: (d.data() as Member).fcmToken }));
}

async function memberName(db: Firestore, familyId: string, userId: string): Promise<string> {
  const snap = await db.collection("families").doc(familyId).collection("members").doc(userId).get();
  return (snap.data() as Member | undefined)?.name ?? "Někdo";
}

export const onShoppingItemWritten = onDocumentWritten("families/{familyId}/shoppingItems/{itemId}", async (event) => {
  const before = event.data?.before.data() as ShoppingItem | undefined;
  const after = event.data?.after.data() as ShoppingItem | undefined;
  if (!after) return; // deletion — nothing to notify about

  const { familyId } = event.params;
  const db = getFirestore();

  if (!before) {
    const targets = await otherMemberTargets(db, familyId, after.addedBy);
    if (targets.length === 0) return;
    const adderName = await memberName(db, familyId, after.addedBy);
    await notifyMembers(familyId, "shopping_item_added", targets, "Family Quest", `${adderName} přidal(a) na nákupní seznam: ${after.name}.`, db);
    return;
  }

  if (!before.checked && after.checked && after.completedBy) {
    const targets = await otherMemberTargets(db, familyId, after.completedBy);
    if (targets.length === 0) return;
    const checkerName = await memberName(db, familyId, after.completedBy);
    await notifyMembers(familyId, "shopping_item_checked", targets, "Family Quest", `${checkerName} vyřídil(a) z nákupního seznamu: ${after.name}. Hotovo!`, db);
  }
});
