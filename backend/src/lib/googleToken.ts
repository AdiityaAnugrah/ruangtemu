import { createPublicKey, verify as verifySignature } from "crypto";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);

type GoogleJwk = {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
};

type GoogleJwks = {
  keys: GoogleJwk[];
};

type GoogleIdTokenHeader = {
  alg: string;
  kid: string;
};

type GoogleIdTokenPayload = {
  iss: string;
  aud: string | string[];
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  exp: number;
  nbf?: number;
};

export type VerifiedGoogleUser = {
  googleId: string;
  email: string;
  name: string;
  picture?: string;
};

let cachedJwks: { value: GoogleJwks; expiresAt: number } | null = null;

function base64UrlToBuffer(value: string): Buffer {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  return Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function decodePart<T>(value: string): T {
  return JSON.parse(base64UrlToBuffer(value).toString("utf8")) as T;
}

function maxAgeFromHeader(value: string | null): number {
  const match = value?.match(/max-age=(\d+)/);
  return match ? parseInt(match[1], 10) * 1000 : 6 * 60 * 60 * 1000;
}

async function getGoogleJwks(): Promise<GoogleJwks> {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.value;

  const response = await fetch(GOOGLE_JWKS_URL);
  if (!response.ok) throw new Error("Gagal mengambil public key Google");

  const value = (await response.json()) as GoogleJwks;
  cachedJwks = {
    value,
    expiresAt: Date.now() + maxAgeFromHeader(response.headers.get("cache-control")),
  };
  return value;
}

function assertValidPayload(payload: GoogleIdTokenPayload, clientId: string) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new Error("Issuer token Google tidak valid");
  if (!audiences.includes(clientId)) throw new Error("Audience token Google tidak valid");
  if (!payload.exp || payload.exp <= nowSeconds) throw new Error("Token Google sudah kedaluwarsa");
  if (payload.nbf && payload.nbf > nowSeconds) throw new Error("Token Google belum aktif");
  if (!payload.email || !payload.email_verified) throw new Error("Email Google belum terverifikasi");
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID belum dikonfigurasi");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Format token Google tidak valid");

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodePart<GoogleIdTokenHeader>(encodedHeader);
  const payload = decodePart<GoogleIdTokenPayload>(encodedPayload);

  if (header.alg !== "RS256") throw new Error("Algoritma token Google tidak didukung");

  const jwks = await getGoogleJwks();
  const jwk = jwks.keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Public key Google tidak ditemukan");

  const keyObject = createPublicKey({ key: jwk as any, format: "jwk" });
  const verified = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    keyObject,
    base64UrlToBuffer(encodedSignature)
  );

  if (!verified) throw new Error("Signature token Google tidak valid");
  assertValidPayload(payload, clientId);

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split("@")[0],
    picture: payload.picture,
  };
}
