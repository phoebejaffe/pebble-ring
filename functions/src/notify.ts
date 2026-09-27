import { defineSecret } from "firebase-functions/params";
import webpush from "web-push";
import { notesFirestore } from "./notesSync.js";

export const vapidPrivateKey = defineSecret("VAPID_PRIVATE_KEY");

// A contact URL is required by the Web Push spec (RFC 8030) for VAPID.
const PUSH_SUBJECT = "https://github.com/phoebejaffe/notes";
const PUSH_TTL_SECONDS = 60 * 60 * 24;

export type NotificationRequest = {
  emoji: "🗒️" | "🚨";
  body: string;
};

export function extractNotificationRequest(transcription: string): NotificationRequest | null {
  const match = transcription.trim().match(/^(urgent|notify)\b[\s,.:;!-]*(.+)$/isu);
  if (!match) return null;
  const body = match[2].trim();
  if (!body) return null;
  return {
    emoji: match[1].toLowerCase() === "urgent" ? "🚨" : "🗒️",
    body: body.charAt(0).toUpperCase() + body.slice(1),
  };
}

export type NotificationSendResult = "sent" | "failed" | "no_subscriptions" | "not_configured";

// Pushes to every device subscription stored under the Notes user. The
// subscription docs are written by the Notes PWA (pushManager.subscribe) and
// hold only opaque endpoints/keys — no transcription content is stored or
// logged here.
export async function sendNotesNotification(
  request: NotificationRequest,
): Promise<NotificationSendResult> {
  const connection = notesFirestore();
  let privateKey = "";
  try {
    privateKey = vapidPrivateKey.value().trim();
  } catch {
    privateKey = "";
  }
  const publicKey = (process.env.VAPID_PUBLIC_KEY ?? "").trim();
  if (!connection || !privateKey || !publicKey) return "not_configured";

  // The PWA reads the public key at subscribe time; keep the doc in sync so a
  // key rotation propagates without redeploying the app.
  const configRef = connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("metadata")
    .doc("pushConfig");
  const configSnapshot = await configRef.get();
  if (configSnapshot.data()?.vapidPublicKey !== publicKey) {
    await configRef.set({ vapidPublicKey: publicKey, updatedAt: Date.now() }, { merge: true });
  }

  const subscriptions = await connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("pushSubscriptions")
    .get();
  if (subscriptions.empty) return "no_subscriptions";

  webpush.setVapidDetails(PUSH_SUBJECT, publicKey, privateKey);
  const payload = JSON.stringify({
    title: "Noteses",
    body: `${request.emoji} ${request.body}`,
    tag: "noteses-ring",
  });
  const deliveries = await Promise.allSettled(
    subscriptions.docs.map(async (document) => {
      const subscription = document.data();
      try {
        await webpush.sendNotification(
          { endpoint: subscription.endpoint, keys: subscription.keys },
          payload,
          { TTL: PUSH_TTL_SECONDS, urgency: "high" },
        );
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) await document.ref.delete();
        throw error;
      }
    }),
  );
  return deliveries.some((delivery) => delivery.status === "fulfilled") ? "sent" : "failed";
}
