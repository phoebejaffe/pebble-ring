import type { IncomingMessage, ServerResponse } from "node:http";
import { firebaseConfig } from "../src/config";

export type VerifiedUser = {
  uid: string;
  email?: string;
};

function readBearerToken(req: IncomingMessage): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice("Bearer ".length).trim() || null;
}

export async function verifyFirebaseIdToken(token: string): Promise<VerifiedUser | null> {
  const apiKey = process.env.FIREBASE_API_KEY ?? firebaseConfig.apiKey;
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token }),
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    users?: Array<{ localId?: string; email?: string }>;
  };
  const user = data.users?.[0];
  if (!user?.localId) return null;

  return { uid: user.localId, email: user.email };
}

export function isApiAuthSkipped(): boolean {
  return process.env.PEBBLE_RING_SKIP_API_AUTH === "true";
}

export async function requireAuth(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<VerifiedUser | null> {
  if (isApiAuthSkipped()) {
    return { uid: "dev" };
  }

  const token = readBearerToken(req);
  if (!token) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Missing Authorization header" }));
    return null;
  }

  const user = await verifyFirebaseIdToken(token);
  if (!user) {
    res.statusCode = 401;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Invalid or expired token" }));
    return null;
  }

  return user;
}
