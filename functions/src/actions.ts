import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { appendToCurrentNote } from "./notesSync.js";

const runtimeServiceAccount =
  "pebble-functions-runtime@pebble-ring-sync-20260911.iam.gserviceaccount.com";
const notesSecrets = [
  defineSecret("NOTES_FIREBASE_PROJECT_ID"),
  defineSecret("NOTES_USER_ID"),
  defineSecret("NOTES_RECOVERY_PHRASE"),
];

export const processWebhookEvent = onDocumentCreated(
  {
    document: "webhookEvents/{eventId}",
    region: "us-central1",
    serviceAccount: runtimeServiceAccount,
    secrets: notesSecrets,
    retry: true,
  },
  async (event) => {
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
    await source.ref.update({ "processing.status": "running", "processing.startedAt": new Date() });
    try {
      const recordedAtValue = source.get("recordedAt");
      const recordedAt =
        typeof recordedAtValue?.toMillis === "function"
          ? recordedAtValue.toMillis()
          : recordedAtValue instanceof Date
            ? recordedAtValue.getTime()
            : Number(recordedAtValue);
      if (!Number.isFinite(recordedAt) || recordedAt <= 0) {
        throw new Error("Webhook event has an invalid recordedAt timestamp");
      }
      const result = await appendToCurrentNote(transcription, recordedAt);
      if (result === "not_configured") {
        await source.ref.update({
          "processing.status": "skipped",
          "processing.reason": "notes_sync_not_configured",
        });
        return;
      }
      await source.ref.update({
        "processing.status": "completed",
        "processing.action": "append_note",
        "processing.completedAt": new Date(),
      });
    } catch (error) {
      await source.ref.update({
        "processing.status": "failed",
        "processing.error": error instanceof Error ? error.message : "Notes action failed",
      });
      throw error;
    }
  },
);
