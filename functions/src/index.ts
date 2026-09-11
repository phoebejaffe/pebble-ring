import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { createAudioUrlHandler, createEventsHandler } from "./dashboard.js";
export { processWebhookEvent } from "./actions.js";
import { createWebhookHandler, type EventStore, type StoredEvent } from "./webhook.js";

const webhookToken = defineSecret("WEBHOOK_AUTH_TOKEN");
const runtimeServiceAccount =
  "pebble-functions-runtime@pebble-ring-sync-20260911.iam.gserviceaccount.com";
const app = getApps().length > 0 ? getApps()[0] : initializeApp();
const firestore = getFirestore(app);
const bucket = getStorage(app).bucket();
const dashboard = {
  auth: getAuth(app),
  firestore,
  bucket,
};

const store: EventStore = {
  async has(id) {
    return (await firestore.collection("webhookEvents").doc(id).get()).exists;
  },
  async save(event: StoredEvent) {
    const audioPath = event.audio ? `recordings/${event.id}.m4a` : null;
    if (event.audio && audioPath) {
      await bucket.file(audioPath).save(event.audio, {
        resumable: false,
        contentType: event.audioContentType ?? "audio/mp4",
        metadata: {
          metadata: {
            client: event.client,
            recordedAt: String(event.recordedAt),
            originalFileName: event.audioFileName ?? "recording.m4a",
          },
        },
      });
    }

    await firestore
      .collection("webhookEvents")
      .doc(event.id)
      .create({
        receivedAt: new Date(),
        recordedAt: new Date(event.recordedAt),
        client: event.client,
        transcription: event.transcription,
        audio: event.audio
          ? {
              path: audioPath,
              contentType: event.audioContentType ?? "audio/mp4",
              size: event.audioSize,
              originalFileName: event.audioFileName,
            }
          : null,
        processing: {
          status: "received",
          category: null,
          labels: [],
        },
      });
  },
};

export const pebbleWebhook = onRequest(
  {
    region: "us-central1",
    secrets: [webhookToken],
    maxInstances: 2,
    serviceAccount: runtimeServiceAccount,
  },
  createWebhookHandler({
    authHeader: process.env.WEBHOOK_AUTH_HEADER ?? "authorization",
    authToken: () => webhookToken.value(),
    store,
  }),
);

export const eventsApi = onRequest(
  { region: "us-central1", maxInstances: 2, serviceAccount: runtimeServiceAccount },
  createEventsHandler(dashboard),
);

export const eventAudioUrl = onRequest(
  { region: "us-central1", maxInstances: 2, serviceAccount: runtimeServiceAccount },
  createAudioUrlHandler(dashboard),
);
