/**
 * Shared by every notification trigger — sending is best-effort per token.
 *
 * Sends `data` only, never a top-level `notification` payload. A
 * `notification` payload gets displayed automatically by the browser
 * itself when the page isn't focused, *and* the service worker's
 * `onBackgroundMessage` (app/sw.js/route.ts) also fires and calls
 * `showNotification` for it — resulting in the same push showing up
 * twice. Data-only messages skip the browser's automatic display, so the
 * service worker's single `showNotification` call is the only one.
 */
import { getMessaging } from "firebase-admin/messaging";

export async function sendToTokens(tokens: string[], title: string, body: string): Promise<void> {
  if (tokens.length === 0) return;
  const messaging = getMessaging();
  await Promise.all(
    tokens.map((token) =>
      messaging.send({ token, data: { title, body } }).catch(() => {
        // A stale/expired token shouldn't fail the whole batch.
      })
    )
  );
}
