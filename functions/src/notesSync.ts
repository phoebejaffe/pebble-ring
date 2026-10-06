import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { defineSecret, type SecretParam } from "firebase-functions/params";

type EncryptedEnvelope = {
  version: 1;
  algorithm: "AES-GCM-256";
  iv: string;
  ciphertext: string;
  associatedData?: string;
};

type KeyBundle = {
  version: 1;
  algorithm: "AES-GCM-256";
  kdf: "PBKDF2-SHA-256";
  salt: string;
  wrappedDataKey: EncryptedEnvelope;
};

const TARGET_APP_NAME = "pebble-notes-target";
const PBKDF2_ITERATIONS = 600_000;
const notesProjectId = defineSecret("NOTES_FIREBASE_PROJECT_ID");
const notesUserId = defineSecret("NOTES_USER_ID");
const notesRecoveryPhrase = defineSecret("NOTES_RECOVERY_PHRASE");

function secretValue(secret: SecretParam): string {
  try {
    return secret.value().trim();
  } catch {
    return "";
  }
}

function fromBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

function fromBase64Url(value: string): Buffer {
  return fromBase64(value.replaceAll("-", "+").replaceAll("_", "/"));
}

function toBase64Url(value: Buffer): string {
  return value.toString("base64url");
}

function normalizeRecoveryPhrase(value: string): string {
  return value.trim().toLowerCase().split(/\s+/u).join(" ");
}

function decryptEnvelope(envelope: EncryptedEnvelope, key: Buffer): Buffer {
  const ciphertext = fromBase64(envelope.ciphertext);
  const decipher = createDecipheriv("aes-256-gcm", key, fromBase64Url(envelope.iv));
  if (envelope.associatedData) decipher.setAAD(Buffer.from(envelope.associatedData, "utf8"));
  decipher.setAuthTag(ciphertext.subarray(-16));
  return Buffer.concat([decipher.update(ciphertext.subarray(0, -16)), decipher.final()]);
}

function encryptEnvelope(value: Buffer, key: Buffer, associatedData: string): EncryptedEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(value), cipher.final(), cipher.getAuthTag()]);
  return {
    version: 1,
    algorithm: "AES-GCM-256",
    iv: toBase64Url(iv),
    ciphertext: ciphertext.toString("base64"),
    associatedData,
  };
}

function recoverDataKey(recoveryPhrase: string, bundle: KeyBundle): Buffer {
  const wrappingKey = pbkdf2Sync(
    normalizeRecoveryPhrase(recoveryPhrase),
    fromBase64Url(bundle.salt),
    PBKDF2_ITERATIONS,
    32,
    "sha256",
  );
  return decryptEnvelope(bundle.wrappedDataKey, wrappingKey);
}

let dataKeyCache: { salt: string; key: Buffer } | null = null;

function dataKeyForBundle(recoveryPhrase: string, bundle: KeyBundle): Buffer {
  if (dataKeyCache?.salt === bundle.salt) return dataKeyCache.key;
  const key = recoverDataKey(recoveryPhrase, bundle);
  dataKeyCache = { salt: bundle.salt, key };
  return key;
}

function decryptMarkdown(value: Record<string, unknown>, key: Buffer, day: string): string {
  const payload = value.payload as EncryptedEnvelope;
  const plaintext = decryptEnvelope(payload, key);
  const parsed = JSON.parse(plaintext.toString("utf8")) as { markdown?: unknown };
  if (typeof parsed.markdown !== "string") throw new Error(`Invalid encrypted note for ${day}`);
  return parsed.markdown;
}

function encryptMarkdown(markdown: string, key: Buffer, day: string, updatedAt: number) {
  const payload = JSON.stringify({ markdown, updatedAt });
  return {
    version: 1 as const,
    day,
    updatedAt,
    payload: encryptEnvelope(Buffer.from(payload, "utf8"), key, `notes:daily-document:${day}`),
  };
}

export function formatTranscriptionLine(transcription: string, linkUrl?: string | null): string {
  const content = transcription.trim();
  if (!content) return "";
  const recordingLink = linkUrl ? `[__](${linkUrl})` : "";
  return `${content}${recordingLink}`;
}

export function prependNoteLine(line: string, current: string): string {
  return `${line}\n\n${current}`;
}

function wordVariants(word: string): Set<string> {
  const variants = new Set([word]);
  if (word.endsWith("'s") && word.length > 2) variants.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 1) variants.add(word.slice(0, -1));
  if (word.endsWith("es") && word.length > 2) variants.add(word.slice(0, -2));
  if (word.endsWith("ies") && word.length > 3) variants.add(`${word.slice(0, -3)}y`);
  return variants;
}

function wordsMatch(left: string, right: string): boolean {
  const leftVariants = wordVariants(left);
  return [...wordVariants(right)].some((variant) => leftVariants.has(variant));
}

// Matches a transcription like "coreads fix the login bug" against named-note
// titles. Word-level, case-insensitive, singular/plural tolerant ("idea"
// matches "Ideas"). Longest title wins when several prefix-match. The title
// is stripped from the remainder, which is capitalized like notification
// bodies. A title-only memo (empty remainder) returns null so it lands in the
// daily note untouched.
export function matchNamedNoteTitle(
  transcription: string,
  titles: string[],
): { title: string; remainder: string } | null {
  const tokens = transcription.trim().split(/\s+/u).filter(Boolean);
  const candidates = titles
    .map((title) => ({ title, parts: title.trim().toLowerCase().split(/\s+/u).filter(Boolean) }))
    .filter(({ parts }) => parts.length > 0 && parts.length <= tokens.length)
    .sort((a, b) => b.parts.length - a.parts.length || a.title.localeCompare(b.title));
  for (const { title, parts } of candidates) {
    const matches = parts.every((part, index) =>
      wordsMatch(part, tokens[index].replace(/^\p{P}+|\p{P}+$/gu, "").toLowerCase()),
    );
    if (!matches) continue;
    const remainder = tokens
      .slice(parts.length)
      .join(" ")
      .replace(/^\p{P}+/u, "")
      .trim();
    if (!remainder) continue;
    return { title, remainder: remainder.charAt(0).toUpperCase() + remainder.slice(1) };
  }
  return null;
}

function dateParts(
  timestamp: number,
  timeZone: string,
): { year: number; month: number; day: number; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour") };
}

export function notesDayKey(timestamp: number, timeZone: string, rolloverHour = 4): string {
  const parts = dateParts(timestamp, timeZone);
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (parts.hour < rolloverHour) date.setUTCDate(date.getUTCDate() - 1);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function notesFirestore(): {
  firestore: Firestore;
  userId: string;
  recoveryPhrase: string;
} | null {
  const projectId = secretValue(notesProjectId);
  const userId = secretValue(notesUserId);
  const recoveryPhrase = secretValue(notesRecoveryPhrase);
  if (!projectId || !userId || !recoveryPhrase) return null;

  const existing = getApps().find((app) => app.name === TARGET_APP_NAME);
  const sourceApp = getApps().find((app) => app.name === "[DEFAULT]");
  const app =
    existing ??
    initializeApp(
      { credential: sourceApp?.options.credential ?? applicationDefault(), projectId },
      TARGET_APP_NAME,
    );
  return { firestore: getFirestore(app), userId, recoveryPhrase };
}

type NamedNotePayload = {
  title?: unknown;
  markdown?: unknown;
  deleted?: unknown;
  updatedAt?: unknown;
};

// Named notes are plaintext version-2 records in the Notes app. Legacy
// version-1 encrypted envelopes may still exist and are decrypted here.
function parseNamedPayload(
  value: Record<string, unknown>,
  key: Buffer,
  id: string,
): Record<string, unknown> {
  const payload = value.payload as EncryptedEnvelope | undefined;
  if (!payload) {
    if (typeof value.markdown !== "string") throw new Error(`Invalid named note ${id}`);
    return value;
  }
  const parsed = JSON.parse(decryptEnvelope(payload, key).toString("utf8")) as NamedNotePayload;
  if (typeof parsed.markdown !== "string") throw new Error(`Invalid encrypted named note ${id}`);
  return parsed as Record<string, unknown>;
}

// Writes must match the Notes app's plaintext record shape
// ({ version: 2, id, title, markdown, lane, order, collapsed, deleted?, updatedAt }).
function namedNoteRecord(payload: Record<string, unknown>, id: string) {
  return {
    version: 2 as const,
    id,
    title: payload.title,
    markdown: payload.markdown,
    lane: payload.lane,
    order: payload.order,
    collapsed: payload.collapsed === true,
    ...(payload.deleted === true ? { deleted: true } : {}),
    updatedAt: payload.updatedAt,
  };
}

// If the transcription's leading word(s) match a named note's title
// (singular/plural tolerant), prepend the remainder to that note instead of
// the daily note. Returns "no_match" when nothing matches so the caller can
// fall back to the daily note.
export async function appendToNamedNote(
  transcription: string,
  linkUrl?: string | null,
): Promise<{ status: "written" | "no_match" | "not_configured"; title?: string }> {
  const connection = notesFirestore();
  if (!connection) return { status: "not_configured" };

  const keyBundleSnapshot = await connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("metadata")
    .doc("keyBundle")
    .get();
  if (!keyBundleSnapshot.exists) throw new Error("Notes encryption key bundle was not found");
  const key = dataKeyForBundle(connection.recoveryPhrase, keyBundleSnapshot.data() as KeyBundle);

  const namedCollection = connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("namedDocuments");
  const snapshot = await namedCollection.get();
  const titles: string[] = [];
  const titleById = new Map<string, string>();
  for (const documentSnapshot of snapshot.docs) {
    try {
      const parsed = parseNamedPayload(documentSnapshot.data(), key, documentSnapshot.id);
      if (parsed.deleted === true || typeof parsed.title !== "string" || !parsed.title.trim()) {
        continue;
      }
      titles.push(parsed.title);
      titleById.set(documentSnapshot.id, parsed.title);
    } catch {
      // Skip undecryptable or malformed documents.
    }
  }

  const match = matchNamedNoteTitle(transcription, titles);
  if (!match) return { status: "no_match" };
  const targetId = [...titleById.entries()].find(([, title]) => title === match.title)?.[0];
  if (!targetId) return { status: "no_match" };

  const line = formatTranscriptionLine(match.remainder, linkUrl);
  if (!line) return { status: "no_match" };
  const noteRef = namedCollection.doc(targetId);
  await connection.firestore.runTransaction(async (transaction) => {
    const noteSnapshot = await transaction.get(noteRef);
    if (!noteSnapshot.exists) return;
    const parsed = parseNamedPayload(noteSnapshot.data() ?? {}, key, targetId);
    if (parsed.deleted === true) return;
    const { writeId: _writeId, version: _version, id: _id, ...rest } = parsed;
    const next = {
      ...rest,
      markdown: prependNoteLine(line, parsed.markdown as string),
      updatedAt: Date.now(),
    };
    transaction.set(noteRef, namedNoteRecord(next, targetId));
  });
  return { status: "written", title: match.title };
}

export async function appendToCurrentNote(
  transcription: string,
  recordedAt: number,
  linkUrl?: string | null,
): Promise<"written" | "not_configured"> {
  const connection = notesFirestore();
  if (!connection) return "not_configured";

  const day = notesDayKey(
    recordedAt,
    process.env.NOTES_TIME_ZONE ?? "UTC",
    Number(process.env.NOTES_ROLLOVER_HOUR ?? 4),
  );
  const keyBundleSnapshot = await connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("metadata")
    .doc("keyBundle")
    .get();
  if (!keyBundleSnapshot.exists) throw new Error("Notes encryption key bundle was not found");

  const key = dataKeyForBundle(connection.recoveryPhrase, keyBundleSnapshot.data() as KeyBundle);
  const noteRef = connection.firestore
    .collection("users")
    .doc(connection.userId)
    .collection("documents")
    .doc(day);
  const line = formatTranscriptionLine(transcription, linkUrl);
  if (!line) return "written";
  await connection.firestore.runTransaction(async (transaction) => {
    const noteSnapshot = await transaction.get(noteRef);
    const current = noteSnapshot.exists ? decryptMarkdown(noteSnapshot.data() ?? {}, key, day) : "";
    const markdown = prependNoteLine(line, current);
    transaction.set(noteRef, encryptMarkdown(markdown, key, day, Date.now()));
  });
  return "written";
}
