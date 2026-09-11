import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";

const targetProjectId = defineSecret("TARGET_FIREBASE_PROJECT_ID");
const targetClientEmail = defineSecret("TARGET_FIREBASE_CLIENT_EMAIL");
const targetPrivateKey = defineSecret("TARGET_FIREBASE_PRIVATE_KEY");
const TARGET_APP_NAME = "pebble-action-target";

function targetFirestore() {
  const projectId = targetProjectId.value().trim();
  const clientEmail = targetClientEmail.value().trim();
  const privateKey = targetPrivateKey.value().replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;

  const existing = getApps().find((app) => app.name === TARGET_APP_NAME);
  const app =
    existing ??
    initializeApp(
      {
        credential: cert({ projectId, clientEmail, privateKey }),
        projectId,
      },
      TARGET_APP_NAME,
    );
  return getFirestore(app);
}

export const processWebhookEvent = onDocumentCreated(
  {
    document: "webhookEvents/{eventId}",
    region: "us-central1",
    secrets: [targetProjectId, targetClientEmail, targetPrivateKey],
    retry: true,
  },
  async (event) => {
    const eventId = event.params.eventId;
    const source = event.data;
    if (!source) return;

    const transcription = source.get("transcription");
    if (typeof transcription !== "string" || !transcription.trim()) {
      await source.ref.update({
        "processing.status": "skipped",
        "processing.reason": "no_transcription",
      });
      return;
    }

    const destination = targetFirestore();
    if (!destination) {
      await source.ref.update({
        "processing.status": "skipped",
        "processing.reason": "target_firebase_not_configured",
      });
      return;
    }

    await source.ref.update({ "processing.status": "running", "processing.startedAt": new Date() });
    try {
      await destination
        .collection("pebbleInbox")
        .doc(eventId)
        .set({
          sourceEventId: eventId,
          transcription: transcription.trim(),
          recordedAt: source.get("recordedAt") ?? null,
          receivedAt: source.get("receivedAt") ?? null,
          client: source.get("client") ?? null,
          sourceAudio: source.get("audio") ?? null,
          createdAt: new Date(),
        });
      await source.ref.update({
        "processing.status": "completed",
        "processing.completedAt": new Date(),
      });
    } catch (error) {
      await source.ref.update({
        "processing.status": "failed",
        "processing.error": error instanceof Error ? error.message : "Action failed",
      });
      throw error;
    }
  },
);
