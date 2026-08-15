/**
 * Push notification for a new family chat message. Purely a side effect:
 * messages itself is directly client-writable (see firestore.rules), no
 * Cloud Function owns the actual write, this only reacts to it.
 */
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { notifyMembers, type NotifyTarget } from "./notifyHelpers";
import type { ChatMessage, Member } from "../../lib/types";

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

/** A message with no text (an attachment sent on its own) still needs a body — describes what kind of attachment it was. */
function describeMessageBody(message: ChatMessage): string {
  if (message.text) return message.text;
  switch (message.attachment?.type) {
    case "image":
      return "poslal(a) fotku.";
    case "video":
      return "poslal(a) video.";
    case "audio":
      return "poslal(a) hlasovou zprávu.";
    case "file":
      return "poslal(a) soubor.";
    default:
      return "poslal(a) zprávu.";
  }
}

export const onChatMessageCreated = onDocumentCreated("families/{familyId}/messages/{messageId}", async (event) => {
  const message = event.data?.data() as ChatMessage | undefined;
  if (!message) return;

  const { familyId } = event.params;
  const db = getFirestore();

  const targets = await otherMemberTargets(db, familyId, message.userId);
  if (targets.length === 0) return;

  const senderName = await memberName(db, familyId, message.userId);
  await notifyMembers(familyId, "chat_message", targets, "Family Quest", `${senderName}: ${describeMessageBody(message)}`, db);
});
