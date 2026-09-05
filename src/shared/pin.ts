import type { PinDerivation } from "./model.js";

export const PIN_ITERATIONS = 210_000;
const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string): Uint8Array => Uint8Array.from(atob(value), (character) => character.charCodeAt(0));

export function validPin(pin: string): boolean { return /^\d{4,8}$/.test(pin); }

async function derive(pin: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer;
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function enrollPin(pin: string): Promise<PinDerivation> {
  if (!validPin(pin)) throw new Error("PIN must contain 4–8 digits.");
  const salt = crypto.getRandomValues(new Uint8Array(16)); const hash = await derive(pin, salt, PIN_ITERATIONS);
  return { algorithm: "PBKDF2-SHA-256", version: 1, saltBase64: toBase64(salt), iterations: PIN_ITERATIONS, hashBase64: toBase64(hash) };
}

export async function verifyPin(pin: string, verifier: PinDerivation): Promise<boolean> {
  const candidate = await derive(validPin(pin) ? pin : "0000", fromBase64(verifier.saltBase64), verifier.iterations);
  const expected = fromBase64(verifier.hashBase64); let difference = candidate.length ^ expected.length;
  for (let index = 0; index < Math.max(candidate.length, expected.length); index += 1) difference |= (candidate[index] ?? 0) ^ (expected[index] ?? 0);
  return validPin(pin) && difference === 0;
}
