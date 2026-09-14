import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import { classifyTranscription } from "./classifyTask.js";
import { appendToCurrentNote } from "./notesSync.js";
import { linkSigningSecret, recordingLinkUrl } from "./recordingLink.js";
import { assemblyAiApiKey, retranscribeStoredAudio } from "./retranscribe.js";

const runtimeServiceAccount =
  "pebble-functions-runtime@pebble-ring-sync-20260911.iam.gserviceaccount.com";
const notesSecrets = [
  defineSecret("NOTES_FIREBASE_PROJECT_ID"),
  defineSecret("NOTES_USER_ID"),
  defineSecret("NOTES_RECOVERY_PHRASE"),
  linkSigningSecret,
  assemblyAiApiKey,
];

export const processWebhookEvent = onDocumentCreated(
  {
    document: "webhookEvents/{eventId}",
    region: "us-central1",
    serviceAccount: runtimeServiceAccount,
    secrets: notesSecrets,
    timeoutSeconds: 540,
    memory: "512MiB",
    retry: true,
  },
  async (event) => {
    const source = event.data;
    if (!source) return;

    const originalTranscription = source.get("transcription");
    const audio = source.get("audio");
    const audioPath = audio && typeof audio.path === "string" ? audio.path : null;
    if (
      (typeof originalTranscription !== "string" || !originalTranscription.trim()) &&
      !audioPath
    ) {
      await source.ref.update({
        "processing.status": "skipped",
        "processing.reason": "no_transcription_or_audio",
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
      let transcription =
        typeof originalTranscription === "string" ? originalTranscription.trim() : "";
      let retranscriptionStatus: "completed" | "unavailable" | "failed" = "unavailable";
      if (audioPath) {
        try {
          const retranscribed = await retranscribeStoredAudio(audioPath);
          if (retranscribed) {
            transcription = retranscribed;
            retranscriptionStatus = "completed";
            await source.ref.update({
              "retranscription.provider": "assemblyai",
              "retranscription.text": retranscribed,
              "retranscription.status": "completed",
              "retranscription.completedAt": new Date(),
            });
          }
        } catch {
          retranscriptionStatus = "failed";
          await source.ref.update({
            "retranscription.provider": "assemblyai",
            "retranscription.status": "failed",
          });
        }
        if (retranscriptionStatus === "unavailable") {
          await source.ref.update({
            "retranscription.provider": "assemblyai",
            "retranscription.status": "unavailable",
          });
        }
      }
      if (!transcription) {
        await source.ref.update({
          "processing.status": "skipped",
          "processing.reason": "no_transcription",
          "processing.retranscriptionStatus": retranscriptionStatus,
        });
        return;
      }
      let isTask = false;
      try {
        const classification = await classifyTranscription(transcription);
        isTask = classification?.isTask === true && classification.confidence >= 0.8;
        await source.ref.update({
          "processing.taskClassification": classification
            ? {
                provider: "assemblyai",
                model: "qwen3.5-4b-32k-fast",
                isTask,
                confidence: classification.confidence,
              }
            : { provider: "assemblyai", status: "unavailable" },
        });
      } catch {
        await source.ref.update({
          "processing.taskClassification": { provider: "assemblyai", status: "failed" },
        });
      }
      const linkUrl = audioPath ? recordingLinkUrl(event.params.eventId) : null;
      const result = await appendToCurrentNote(transcription, recordedAt, linkUrl, isTask);
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
