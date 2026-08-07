/** Shared by every notification trigger — sending is best-effort per token. */
import { getMessaging } from "firebase-admin/messaging";

export async function sendToTokens(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const messaging = getMessaging();
  await Promise.all(
    tokens.map((token) =>
      messaging.send({ token, notification: { title, body } }).catch(() => {
        // A stale/expired token shouldn't fail the whole batch.
      })
    )
  );
}
